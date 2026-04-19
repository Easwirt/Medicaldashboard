export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  condition: string;
  phone: string;
  email: string;
  bloodType: string;
  photo?: string;
}

export interface TestResult {
  name: string;
  date: string;
  status: "Normal" | "Alert" | "Pending";
  value?: string;
}

// Static patient data for initial display if needed (though now using API)
export const patients: Patient[] = [];