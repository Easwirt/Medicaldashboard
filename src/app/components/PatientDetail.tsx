import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Upload, Activity, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { conditions, testResults, conditionTests } from "./patientData";
import type { TestResult } from "./patientData";
import { usePatients } from "./PatientContext";

const statusConfig: Record<TestResult["status"], { icon: typeof CheckCircle2; color: string; bg: string }> = {
  Normal: { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
  Alert: { icon: AlertTriangle, color: "#ea580c", bg: "#fff7ed" },
  Pending: { icon: Clock, color: "#64748b", bg: "#f8fafc" },
};

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const patient = patients.find((p) => p.id === id);
  const [selectedCondition, setSelectedCondition] = useState(patient?.condition || conditions[0]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [checkRun, setCheckRun] = useState(false);
  const [displayedResults, setDisplayedResults] = useState(testResults);

  if (!patient) {
    return (
      <div className="text-center py-20 text-[#64748b]">
        <p>Patient not found.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-[#2563eb] underline">Back to directory</button>
      </div>
    );
  }

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
        {/* Left Sidebar - Conditions */}
        <div className="w-60 shrink-0">
          <div className="bg-white rounded-xl border border-[#dde3ea] p-4">
            <h3 className="text-[#1e293b] mb-3" style={{ fontSize: "0.875rem" }}>Conditions</h3>
            <nav className="flex flex-col gap-1">
              {conditions.map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-2.5 text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    selectedConditions.includes(c)
                      ? "bg-[#f0f4ff] text-[#2563eb]"
                      : "text-[#475569] hover:bg-[#f0f4f8]"
                  }`}
                  style={{ fontSize: "0.8125rem" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(c)}
                    onChange={() =>
                      setSelectedConditions((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                    className="w-4 h-4 rounded accent-[#2563eb] cursor-pointer"
                  />
                  {c}
                </label>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Patient Profile */}
          <div className="bg-white rounded-xl border border-[#dde3ea] p-6 mb-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col items-center">
                <span className="text-[#94a3b8] mb-1" style={{ fontSize: "0.625rem" }}>Upload Tear Drop</span>
                <div className="w-20 h-20 rounded-xl bg-[#f0f4f8] border-2 border-dashed border-[#cbd5e1] flex flex-col items-center justify-center text-[#94a3b8] cursor-pointer hover:border-[#2563eb] hover:text-[#2563eb] transition-colors">
                  <Upload size={20} />
                  <span style={{ fontSize: "0.625rem", marginTop: 4 }}>Upload</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[#1e293b]">{patient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f0f4ff] text-[#2563eb]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {patient.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 mt-3">
                  {[
                    ["Age", `${patient.age} yrs`],
                    ["Gender", patient.gender],
                    ["Blood Type", patient.bloodType],
                    ["Last Visit", patient.lastVisit],
                    ["Phone", patient.phone],
                    ["Email", patient.email],
                    ["Condition", selectedCondition],
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

          {/* Run Health Check */}
          <button
            onClick={() => {
              if (selectedConditions.length > 0) {
                const results = selectedConditions
                  .map((c) => conditionTests[c])
                  .filter(Boolean);
                setDisplayedResults(results);
                setCheckRun(true);
              }
            }}
            disabled={selectedConditions.length === 0}
            className={`w-full rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors mb-5 ${
              selectedConditions.length === 0
                ? "bg-[#94a3b8] cursor-not-allowed text-white/70"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            }`}
          >
            <Activity size={18} />
            Run Health Check{selectedConditions.length > 0 ? ` (${selectedConditions.length})` : ""}
          </button>

          {/* Test Results */}
          <div className="bg-white rounded-xl border border-[#dde3ea] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#eef1f5] flex items-center justify-between">
              <h3 className="text-[#1e293b]">Test Results</h3>
              {checkRun && (
                <span className="text-[#16a34a] flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <CheckCircle2 size={14} /> Health check complete
                </span>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eef1f5]">
                  {["Test Name", "Date", "Value", "Status"].map((h) => (
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
                {displayedResults.map((t, idx) => {
                  const cfg = statusConfig[t.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={`${t.name}-${idx}`} className="border-b border-[#f1f5f9]">
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}