import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Users, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { usePatients } from "./PatientContext";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function PatientDirectory() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { patients, conditions, addPatient, isLoading } = usePatients();

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    condition: "",
    phone: "",
    email: "",
    bloodType: "A+",
  });

  // Set initial condition once conditions are loaded
  if (!form.condition && conditions.length > 0) {
    setForm(prev => ({ ...prev, condition: conditions[0] }));
  }

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.name || !form.age) return;
    try {
      const patient_id = `PT-${1001 + patients.length}`;
      await addPatient({
        patient_id,
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        last_visit: new Date().toISOString().split("T")[0],
        condition: form.condition,
        phone: form.phone || "(555) 000-0000",
        email: form.email || "n/a",
        blood_type: form.bloodType,
      });
      setForm({ name: "", age: "", gender: "Male", condition: conditions[0] || "", phone: "", email: "", bloodType: "A+" });
      setShowModal(false);
      toast.success("Patient added successfully!");
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error("Failed to add patient. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-[#64748b]">Loading patients...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1e293b]">Patient Directory</h1>
          <p className="text-[#64748b] mt-1" style={{ fontSize: "0.875rem" }}>
            {patients.length} patients registered
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg transition-colors"
            style={{ fontSize: "0.875rem", fontWeight: 500 }}
          >
            <Plus size={18} /> Add Patient
          </button>
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
                key={p.patient_id}
                className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] cursor-pointer transition-colors"
                onClick={() => navigate(`/patient/${p.patient_id}`)}
              >
                <td className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e0ecff] text-[#2563eb] flex items-center justify-center" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-[#1e293b]" style={{ fontWeight: 500 }}>{p.name}</span>
                </td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.patient_id}</td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.age}</td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.gender}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-full bg-[#f0f4ff] text-[#2563eb]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {p.condition}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#64748b]" style={{ fontSize: "0.875rem" }}>{p.last_visit}</td>
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

      {/* Add Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#1e293b]">Add New Patient</h2>
              <button onClick={() => setShowModal(false)} className="text-[#94a3b8] hover:text-[#1e293b] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors"
                  style={{ fontSize: "0.875rem" }}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Age *</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors"
                  style={{ fontSize: "0.875rem" }}
                  placeholder="e.g. 45"
                />
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors bg-white"
                  style={{ fontSize: "0.875rem" }}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Blood Type</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors bg-white"
                  style={{ fontSize: "0.875rem" }}
                >
                  {bloodTypes.map((bt) => <option key={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors bg-white"
                  style={{ fontSize: "0.875rem" }}
                >
                  {conditions.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors"
                  style={{ fontSize: "0.875rem" }}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-[#64748b] mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-[#dde3ea] rounded-lg px-3 py-2 text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors"
                  style={{ fontSize: "0.875rem" }}
                  placeholder="john@email.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-[#dde3ea] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
                style={{ fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.age}
                className={`px-5 py-2 rounded-lg text-white transition-colors ${
                  !form.name || !form.age ? "bg-[#94a3b8] cursor-not-allowed" : "bg-[#2563eb] hover:bg-[#1d4ed8]"
                }`}
                style={{ fontSize: "0.875rem", fontWeight: 500 }}
              >
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
