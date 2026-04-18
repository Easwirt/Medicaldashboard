import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Users } from "lucide-react";
import { patients } from "./patientData";

export function PatientDirectory() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1e293b]">Patient Directory</h1>
          <p className="text-[#64748b] mt-1" style={{ fontSize: "0.875rem" }}>
            {patients.length} patients registered
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#dde3ea] px-3 py-2 w-80">
          <Search size={18} className="text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="bg-transparent outline-none flex-1 text-[#1e293b] placeholder-[#94a3b8]"
            style={{ fontSize: "0.875rem" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#dde3ea] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#eef1f5]">
              {["Patient Name", "ID", "Age", "Gender", "Condition", "Last Visit"].map((h) => (
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
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] cursor-pointer transition-colors"
                onClick={() => navigate(`/patient/${p.id}`)}
              >
                <td className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e0ecff] text-[#2563eb] flex items-center justify-center" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-[#1e293b]" style={{ fontWeight: 500 }}>{p.name}</span>
                </td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.id}</td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.age}</td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.gender}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-full bg-[#f0f4ff] text-[#2563eb]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {p.condition}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.lastVisit}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#94a3b8]">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
