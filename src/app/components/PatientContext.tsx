import { createContext, useContext, useState, type ReactNode } from "react";
import { patients as initialPatients, type Patient } from "./patientData";

interface PatientContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
}

const PatientContext = createContext<PatientContextType>({
  patients: initialPatients,
  addPatient: () => {},
});

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  const addPatient = (patient: Patient) => {
    setPatients((prev) => [...prev, patient]);
  };

  return (
    <PatientContext.Provider value={{ patients, addPatient }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatients() {
  return useContext(PatientContext);
}
