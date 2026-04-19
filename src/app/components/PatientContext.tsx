import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface Patient {
  id: number;
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  last_visit: string;
  condition: string;
  phone: string;
  email: string;
  blood_type: string;
  photo_path?: string;
  test_results?: TestResult[];
}

export interface TestResult {
  id: number;
  name: string;
  date: string;
  status: "Normal" | "Alert" | "Pending";
  value?: string;
  photo_path?: string;
}

export interface Condition {
  id: number;
  name: string;
}

interface PatientContextType {
  patients: Patient[];
  conditions: string[];
  isLoading: boolean;
  refreshPatients: () => Promise<void>;
  addPatient: (patient: Omit<Patient, "id">) => Promise<Patient>;
  addTestResult: (patientId: number, testResult: Omit<TestResult, "id">, shouldRefresh?: boolean) => Promise<TestResult>;
  uploadFile: (file: File) => Promise<string>;
  uploadPhoto: (patientId: number, file: File) => Promise<void>;
  evaluatePhoto: (file: File) => Promise<any>;
}

const API_BASE = "http://localhost:8000";

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    }
  };

  const fetchConditions = async () => {
    try {
      const res = await fetch(`${API_BASE}/conditions/`);
      if (res.ok) {
        const data: Condition[] = await res.json();
        setConditions(data.map(c => c.name));
      }
    } catch (error) {
      console.error("Failed to fetch conditions:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([refreshPatients(), fetchConditions()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const addPatient = async (patientData: Omit<Patient, "id">) => {
    const res = await fetch(`${API_BASE}/patients/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });
    if (!res.ok) throw new Error("Failed to create patient");
    const newPatient = await res.json();
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  };

  const addTestResult = async (patientId: number, testResult: Omit<TestResult, "id">, shouldRefresh = true) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/test_results/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testResult),
    });
    if (!res.ok) throw new Error("Failed to add test result");
    const newResult = await res.json();
    if (shouldRefresh) await refreshPatients();
    return newResult;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/upload/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload file");
    const data = await res.json();
    return data.filename;
  };

  const uploadPhoto = async (patientId: number, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch(`${API_BASE}/patients/${patientId}/photo/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload photo");
    await refreshPatients();
  };

  const evaluatePhoto = async (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch(`${API_BASE}/evaluate_photo/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to evaluate photo");
    return await res.json();
  };

  return (
    <PatientContext.Provider value={{ 
      patients, 
      conditions, 
      isLoading, 
      refreshPatients, 
      addPatient, 
      addTestResult,
      uploadFile,
      uploadPhoto, 
      evaluatePhoto 
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatients() {
  const context = useContext(PatientContext);
  if (!context) throw new Error("usePatients must be used within a PatientProvider");
  return context;
}
