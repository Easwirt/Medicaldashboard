import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Upload, Activity, CheckCircle2, AlertTriangle, Clock, Loader2, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { usePatients, type TestResult } from "./PatientContext";

const CONDITION_ALIASES: Record<string, string> = {
  diabetic: "diabetes",
  dryeye: "dry eye",
  dry_eyes: "dry eye",
  dryeyes: "dry eye",
};

const normalizeCondition = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

const canonicalCondition = (value: string) => {
  const normalized = normalizeCondition(value);
  const compact = normalized.replace(/\s+/g, "");
  return CONDITION_ALIASES[compact] ?? normalized;
};

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  OK: { icon: CheckCircle2, color: "#15803d", bg: "#f0fdf4" },
  "Possible Risk": { icon: Clock, color: "#b45309", bg: "#fffbeb" },
  "High Probability": { icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
  "Disease Detected": { icon: AlertTriangle, color: "#b91c1c", bg: "#fef2f2" },
  Pending: { icon: Clock, color: "#64748b", bg: "#f8fafc" },
};

const statusFromProbability = (probability: number): string => {
  if (probability < 0.2) return "OK";
  if (probability < 0.4) return "Possible Risk";
  if (probability < 0.7) return "High Probability";
  return "Disease Detected";
};

const parseProbabilityFromValue = (value?: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace("%", "").trim();
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed / 100;
};

const normalizeStatusLabel = (status: string, value?: string): string => {
  if (statusConfig[status]) return status;

  const probability = parseProbabilityFromValue(value);
  if (probability !== null) {
    return statusFromProbability(probability);
  }

  if (status === "Normal") return "Possible Risk";
  if (status === "Alert") return "High Probability";
  return "Pending";
};

const conditionOptionFromValue = (condition?: string): string => {
  const normalized = (condition || "").trim().toLowerCase();
  if (!normalized) return "Healthy";
  if (["healthy", "zdravy", "zdravi", "yes", "true"].includes(normalized)) return "Healthy";
  return "Disease";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, conditions, uploadFile, evaluatePhoto, addTestResult, deleteTestResult, setTestResultConfirmation, refreshPatients, isLoading } = usePatients();
  const patient = patients.find((p) => p.patient_id === id);
  
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(patient?.photo_path ? `http://localhost:8000/uploads/${patient.photo_path}` : null);
  const [openedImageUrl, setOpenedImageUrl] = useState<string | null>(null);
  const [confirmingResultId, setConfirmingResultId] = useState<number | null>(null);
  const sortedTestResults = [...(patient?.test_results || [])].sort((a, b) => b.id - a.id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-[#64748b]">Loading patient details...</div>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-[#64748b]">
        <p>Patient not found.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-[#2563eb] underline">Back to directory</button>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    toast.success("Image selected for health check.");
  };

  const handleRunCheck = async () => {
    if (selectedConditions.length === 0 || !currentFile) {
      if (!currentFile) toast.error("Please upload an image first.");
      return;
    }
    
    setIsChecking(true);
    try {
      // 1. Upload the specific photo for this run
      const photoFilename = await uploadFile(currentFile);
      
      // 2. Evaluate Photo
      const response = await evaluatePhoto(currentFile, selectedConditions);
      const reportPhotoFilename = response.processed_filename || photoFilename;
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const promises = [];
      const evaluationByCondition = new Map(
        (response.evaluations || []).map((ev: { disease: string; probability: number; risk_level: string }) => [
          canonicalCondition(ev.disease),
          ev,
        ])
      );

      // 3. Queue AI evaluations for selected models with robust name matching
      for (const selectedCondition of selectedConditions) {
        const matchedEvaluation = evaluationByCondition.get(canonicalCondition(selectedCondition));
        if (matchedEvaluation) {
          promises.push(
            addTestResult(
              patient.id,
              {
                name: selectedCondition,
                date: timestamp,
                status: statusFromProbability(matchedEvaluation.probability),
                value: `${(matchedEvaluation.probability * 100).toFixed(0)}%`,
                photo_path: reportPhotoFilename,
              },
              false
            )
          );
        } else {
          promises.push(
            addTestResult(
              patient.id,
              {
                name: selectedCondition,
                date: timestamp,
                status: "Pending",
                value: "N/A",
                photo_path: reportPhotoFilename,
              },
              false
            )
          );
        }
      }

      // 4. Wait for all to complete and refresh
      await Promise.all(promises);
      await refreshPatients();
      
      toast.success("Health check complete. Results saved with image.");
      setCurrentFile(null); // Reset after successful run
    } catch (error) {
      console.error("Health check failed:", error);
      toast.error("Health check failed. Please check backend connection.");
    } finally {
      setIsChecking(false);
    }
  };

  const openReport = (testResult: TestResult) => {
    const imageUrl = testResult.photo_path ? `http://localhost:8000/uploads/${testResult.photo_path}` : null;
    const generatedAt = new Date().toLocaleString();
    const safePatientName = escapeHtml(patient.name);
    const safePatientId = escapeHtml(patient.patient_id);
    const safeModel = escapeHtml(testResult.name);
    const safeDate = escapeHtml(testResult.date);
    const safeStatus = escapeHtml(normalizeStatusLabel(testResult.status, testResult.value));
    const safeValue = escapeHtml(testResult.value || "N/A");
    const safeCondition = escapeHtml(patient.condition || "Not set");
    const safeAge = escapeHtml(String(patient.age));
    const safeGender = escapeHtml(patient.gender);
    const safeBloodType = escapeHtml(patient.blood_type);
    const safePhone = escapeHtml(patient.phone || "N/A");
    const safeEmail = escapeHtml(patient.email || "N/A");
    const safeLastVisit = escapeHtml(patient.last_visit || "N/A");

    const chancesRows = sortedTestResults
      .slice(0, 20)
      .map((row) => {
        const rowName = escapeHtml(row.name);
        const rowDate = escapeHtml(row.date);
        const rowChance = escapeHtml(row.value || "N/A");
        const rowStatus = escapeHtml(normalizeStatusLabel(row.status, row.value));
        return `<tr><td>${rowName}</td><td>${rowDate}</td><td>${rowChance}</td><td>${rowStatus}</td></tr>`;
      })
      .join("");

    const reportHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Health Check Report - ${safePatientId}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: "Segoe UI", sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .wrap { max-width: 900px; margin: 24px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
      .head { padding: 20px 24px; background: linear-gradient(135deg, #eff6ff, #f8fafc); border-bottom: 1px solid #e2e8f0; }
      .title { margin: 0; font-size: 22px; }
      .sub { margin: 6px 0 0; color: #475569; font-size: 14px; }
      .section { padding: 20px 24px 0; }
      .block { border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 14px 16px; }
      .section-title { margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; }
      .details { margin: 0; color: #1e293b; line-height: 1.65; font-size: 14px; }
      .details strong { color: #0f172a; }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 8px 6px; }
      th { color: #475569; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
      .image { padding: 20px 24px 24px; }
      .image img { width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
      .link { color: #2563eb; text-decoration: none; font-size: 14px; }
      .link:hover { text-decoration: underline; }
      @media (max-width: 700px) { .details { font-size: 13px; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="head">
        <h1 class="title">Detailed Health Check Report</h1>
        <p class="sub">Generated at ${escapeHtml(generatedAt)}</p>
      </div>
      <div class="section">
        <h2 class="section-title">Patient Details</h2>
        <div class="block">
          <p class="details">
            <strong>${safePatientName}</strong> (${safePatientId}) is a ${safeAge}-year-old ${safeGender}.<br/>
            Blood type: <strong>${safeBloodType}</strong>. Current condition in card: <strong>${safeCondition}</strong>.<br/>
            Last visit: <strong>${safeLastVisit}</strong>. Contact: <strong>${safePhone}</strong>, <strong>${safeEmail}</strong>.<br/>
            Current report is for model/test <strong>${safeModel}</strong> on <strong>${safeDate}</strong>.
            Predicted status: <strong>${safeStatus}</strong>, chance: <strong>${safeValue}</strong>.
          </p>
        </div>
      </div>
      <div class="section">
        <h2 class="section-title">Chances By Completed Tests</h2>
        <div class="block table-wrap">
          <table>
            <thead>
              <tr><th>Test / Model</th><th>Date</th><th>Chance</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${chancesRows || `<tr><td colspan="4">No completed tests yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="image">
        ${imageUrl ? `<img src="${imageUrl}" alt="Uploaded health check" /><p><a class="link" href="${imageUrl}" target="_blank" rel="noopener noreferrer">Open full image</a></p>` : `<p class="sub">No image attached to this test result.</p>`}
      </div>
    </div>
  </body>
</html>`;

    const reportBlob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const reportUrl = URL.createObjectURL(reportBlob);

    // Opening via a user-triggered anchor click is more reliable than window.open across browsers.
    const link = document.createElement("a");
    link.href = reportUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000);
  };

  const handleDeleteReport = async (testResult: TestResult) => {
    const confirmed = window.confirm(`Delete report for ${testResult.name} (${testResult.date})?`);
    if (!confirmed) return;

    try {
      await deleteTestResult(testResult.id);
      toast.success("Report deleted.");
    } catch (error) {
      console.error("Delete report failed:", error);
      toast.error("Failed to delete report.");
    }
  };

  const handleSetConfirmation = async (testResult: TestResult, confirmed: boolean) => {
    if (testResult.confirmed === confirmed) return;

    setConfirmingResultId(testResult.id);
    try {
      await setTestResultConfirmation(testResult.id, confirmed);
      toast.success(confirmed ? "Diagnosis confirmed." : "Diagnosis rejected.");
    } catch (error) {
      console.error("Failed to update confirmation:", error);
      toast.error("Failed to update diagnosis confirmation.");
    } finally {
      setConfirmingResultId(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-[#64748b] hover:text-[#1e293b] mb-5 transition-colors"
        style={{ fontSize: "0.875rem" }}
      >
        <ArrowLeft size={16} /> Back to Patient List
      </button>

      <div className="flex gap-6">
        {/* Left Sidebar - Models */}
        <div className="w-60 shrink-0">
          <div className="bg-white rounded-xl border border-[#dde3ea] p-4">
            <h3 className="text-[#1e293b] mb-3" style={{ fontSize: "0.875rem" }}>Diagnostic Tests</h3>
            <nav className="flex flex-col gap-1">
              {selectedConditions.map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between gap-2.5 text-left px-3 py-2 rounded-lg bg-[#f0f4ff] text-[#2563eb]"
                  style={{ fontSize: "0.8125rem" }}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} />
                    {c}
                  </div>
                  <button 
                    onClick={() => setSelectedConditions(prev => prev.filter(x => x !== c))}
                    className="text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <div className="relative mt-2">
                <button
                  onClick={() => setShowModelList(!showModelList)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#cbd5e1] text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb] transition-all"
                  style={{ fontSize: "0.8125rem" }}
                >
                  <Plus size={16} /> Add Model
                </button>

                {showModelList && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-[#dde3ea] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto p-1">
                    {conditions
                      .filter(c => !selectedConditions.includes(c))
                      .map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            setSelectedConditions(prev => [...prev, c]);
                            setShowModelList(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-[#475569] hover:bg-[#f8fafc] hover:text-[#1e293b]"
                          style={{ fontSize: "0.8125rem" }}
                        >
                          {c}
                        </button>
                      ))}
                    {conditions.filter(c => !selectedConditions.includes(c)).length === 0 && (
                      <div className="px-3 py-2 text-[#94a3b8] italic" style={{ fontSize: "0.8125rem" }}>
                        No more models
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-[#dde3ea] p-6 mb-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col items-center">
                <label className="w-48 h-48 rounded-2xl bg-[#f0f4f8] border-2 border-dashed border-[#cbd5e1] flex flex-col items-center justify-center text-[#94a3b8] cursor-pointer hover:border-[#2563eb] hover:text-[#2563eb] transition-colors relative overflow-hidden shadow-sm">
                  {uploading ? (
                    <Loader2 size={40} className="animate-spin text-[#2563eb]" />
                  ) : previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload size={40} />
                      <span style={{ fontSize: "0.875rem", marginTop: 12, fontWeight: 500 }}>Upload Image</span>
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" disabled={uploading} />
                </label>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[#1e293b]">{patient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f0f4ff] text-[#2563eb]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {patient.patient_id}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 mt-3">
                  {[
                    ["Age", `${patient.age} yrs`],
                    ["Gender", patient.gender],
                    ["Blood Type", patient.blood_type],
                    ["Last Visit", patient.last_visit],
                    ["Phone", patient.phone],
                    ["Email", patient.email],
                    ["Conditions", conditionOptionFromValue(patient.condition)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-[#94a3b8]" style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                      <p className="text-[#1e293b]" style={{ fontSize: "0.875rem" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleRunCheck}
            disabled={selectedConditions.length === 0 || isChecking || !currentFile}
            className={`w-full rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors mb-5 ${
              selectedConditions.length === 0 || isChecking || !currentFile
                ? "bg-[#94a3b8] cursor-not-allowed text-white/70"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            }`}
          >
            {isChecking ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
            {isChecking 
              ? "Evaluating..." 
              : !currentFile
                ? "Upload Photo to Run Check" 
                : `Run Tests${selectedConditions.length > 0 ? ` (${selectedConditions.length})` : ""}`}
          </button>

          <div className="bg-white rounded-xl border border-[#dde3ea] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#eef1f5] flex items-center justify-between">
              <h3 className="text-[#1e293b]">Recent Health Check Results</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eef1f5]">
                  {["Image", "Test/Model Name", "Date", "Chance/Percentage", "Status", "Report", ""].map((h, idx) => (
                    <th
                      key={`${h}-${idx}`}
                      className="text-left px-5 py-3 text-[#64748b]"
                      style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTestResults.length > 0 ? (
                  sortedTestResults.slice(0, 15).map((t) => {
                    const normalizedStatus = normalizeStatusLabel(t.status, t.value);
                    const cfg = statusConfig[normalizedStatus] || statusConfig.Pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={t.id} className="border-b border-[#f1f5f9]">
                        <td className="px-5 py-3.5">
                          {t.photo_path ? (
                            <button
                              type="button"
                              onClick={() => setOpenedImageUrl(`http://localhost:8000/uploads/${t.photo_path}`)}
                              className="block rounded-lg overflow-hidden border border-[#dde3ea] hover:border-[#2563eb] transition-colors"
                              title="Open image"
                            >
                              <img
                                src={`http://localhost:8000/uploads/${t.photo_path}`}
                                alt="Uploaded result"
                                className="w-12 h-12 object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#f0f4f8] flex items-center justify-center text-[#94a3b8]">
                              <Upload size={14} />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[#1e293b]" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t.name}</td>
                        <td className="px-5 py-3.5 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{t.date}</td>
                        <td className="px-5 py-3.5 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{t.value}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col items-start gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                              style={{ fontSize: "0.75rem", fontWeight: 500, color: cfg.color, backgroundColor: cfg.bg }}
                            >
                              <Icon size={13} /> {normalizedStatus}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetConfirmation(t, true)}
                                disabled={confirmingResultId === t.id}
                                title="Confirm diagnosis"
                                className={`w-7 h-7 rounded-md border inline-flex items-center justify-center transition-colors ${
                                  t.confirmed
                                    ? "border-[#16a34a] bg-[#dcfce7] text-[#166534]"
                                    : "border-[#cbd5e1] bg-white text-[#64748b] hover:border-[#16a34a] hover:text-[#166534]"
                                } ${confirmingResultId === t.id ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetConfirmation(t, false)}
                                disabled={confirmingResultId === t.id}
                                title="Reject diagnosis"
                                className={`w-7 h-7 rounded-md border inline-flex items-center justify-center transition-colors ${
                                  t.confirmed === false
                                    ? "border-[#dc2626] bg-[#fee2e2] text-[#991b1b]"
                                    : "border-[#cbd5e1] bg-white text-[#64748b] hover:border-[#dc2626] hover:text-[#991b1b]"
                                } ${confirmingResultId === t.id ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => openReport(t)}
                            className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-[#1e293b] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
                            style={{ fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            Open
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(t)}
                            className="px-3 py-1.5 rounded-lg border border-[#fecaca] text-[#b91c1c] hover:bg-[#fef2f2] transition-colors"
                            style={{ fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#94a3b8]" style={{ fontSize: "0.875rem" }}>
                      Select models and run a health check to see results
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openedImageUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenedImageUrl(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-2 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenedImageUrl(null)}
              className="absolute top-3 right-3 rounded-full bg-white/90 hover:bg-white p-1 text-[#334155] border border-[#dde3ea]"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={openedImageUrl}
              alt="Uploaded health check"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
