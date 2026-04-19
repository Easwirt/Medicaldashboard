import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Upload, Activity, CheckCircle2, AlertTriangle, Clock, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { usePatients, type TestResult } from "./PatientContext";

const statusConfig: Record<TestResult["status"], { icon: any; color: string; bg: string }> = {
  Normal: { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
  Alert: { icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
  Pending: { icon: Clock, color: "#64748b", bg: "#f8fafc" },
};

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, conditions, uploadFile, uploadPhoto, evaluatePhoto, addTestResult, refreshPatients, isLoading } = usePatients();
  const patient = patients.find((p) => p.patient_id === id);
  
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(patient?.photo_path ? `http://localhost:8000/uploads/${patient.photo_path}` : null);

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
      const response = await evaluatePhoto(currentFile);
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const promises = [];

      // 3. Queue AI evaluations for selected models with the photo association
      for (const ev of response.evaluations) {
        if (selectedConditions.includes(ev.disease)) {
          promises.push(addTestResult(patient.id, {
            name: ev.disease,
            date: timestamp,
            status: ev.risk_level === "High" ? "Alert" : "Normal",
            value: `${(ev.probability * 100).toFixed(0)}%`,
            photo_path: photoFilename
          }, false));
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

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-[#64748b] hover:text-[#1e293b] mb-5 transition-colors"
        style={{ fontSize: "0.875rem" }}
      >
        <ArrowLeft size={16} /> Back to Patient Directory
      </button>

      <div className="flex gap-6">
        {/* Left Sidebar - Models */}
        <div className="w-60 shrink-0">
          <div className="bg-white rounded-xl border border-[#dde3ea] p-4">
            <h3 className="text-[#1e293b] mb-3" style={{ fontSize: "0.875rem" }}>Models</h3>
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
                    ["Condition", patient.condition],
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
            disabled={selectedConditions.length === 0 || isChecking || (!currentFile && !patient.photo_path)}
            className={`w-full rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors mb-5 ${
              selectedConditions.length === 0 || isChecking || (!currentFile && !patient.photo_path)
                ? "bg-[#94a3b8] cursor-not-allowed text-white/70"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            }`}
          >
            {isChecking ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
            {isChecking 
              ? "Evaluating..." 
              : (!currentFile && !patient.photo_path)
                ? "Upload Photo to Run Check" 
                : `Run Health Check${selectedConditions.length > 0 ? ` (${selectedConditions.length})` : ""}`}
          </button>

          <div className="bg-white rounded-xl border border-[#dde3ea] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#eef1f5] flex items-center justify-between">
              <h3 className="text-[#1e293b]">Recent Health Check Results</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eef1f5]">
                  {["Image", "Test/Model Name", "Date", "Value/Percentage", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[#64748b]"
                      style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patient.test_results && patient.test_results.length > 0 ? (
                  [...patient.test_results].reverse().slice(0, 15).map((t) => {
                    const cfg = statusConfig[t.status as TestResult["status"]] || statusConfig.Normal;
                    const Icon = cfg.icon;
                    return (
                      <tr key={t.id} className="border-b border-[#f1f5f9]">
                        <td className="px-5 py-3.5">
                          {t.photo_path ? (
                            <img 
                              src={`http://localhost:8000/uploads/${t.photo_path}`} 
                              alt="" 
                              className="w-12 h-12 rounded-lg object-cover border border-[#dde3ea]"
                            />
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
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ fontSize: "0.75rem", fontWeight: 500, color: cfg.color, backgroundColor: cfg.bg }}
                          >
                            <Icon size={13} /> {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[#94a3b8]" style={{ fontSize: "0.875rem" }}>
                      Select models and run a health check to see results
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
