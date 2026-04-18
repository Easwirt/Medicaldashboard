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

export const patients: Patient[] = [
  { id: "PT-1001", name: "James Anderson", age: 54, gender: "Male", lastVisit: "2026-04-12", condition: "Hypertension", phone: "(555) 234-5678", email: "james.a@email.com", bloodType: "A+" },
  { id: "PT-1002", name: "Maria Garcia", age: 38, gender: "Female", lastVisit: "2026-04-15", condition: "Type 2 Diabetes", phone: "(555) 345-6789", email: "maria.g@email.com", bloodType: "O+" },
  { id: "PT-1003", name: "Robert Chen", age: 67, gender: "Male", lastVisit: "2026-04-10", condition: "COPD", phone: "(555) 456-7890", email: "robert.c@email.com", bloodType: "B-" },
  { id: "PT-1004", name: "Emily Watson", age: 29, gender: "Female", lastVisit: "2026-04-16", condition: "Asthma", phone: "(555) 567-8901", email: "emily.w@email.com", bloodType: "AB+" },
  { id: "PT-1005", name: "David Kim", age: 45, gender: "Male", lastVisit: "2026-04-08", condition: "Hyperlipidemia", phone: "(555) 678-9012", email: "david.k@email.com", bloodType: "A-" },
  { id: "PT-1006", name: "Sarah Thompson", age: 72, gender: "Female", lastVisit: "2026-04-14", condition: "Osteoarthritis", phone: "(555) 789-0123", email: "sarah.t@email.com", bloodType: "O-" },
  { id: "PT-1007", name: "Michael Johnson", age: 61, gender: "Male", lastVisit: "2026-04-11", condition: "Heart Disease", phone: "(555) 890-1234", email: "michael.j@email.com", bloodType: "B+" },
  { id: "PT-1008", name: "Linda Park", age: 33, gender: "Female", lastVisit: "2026-04-17", condition: "Migraine", phone: "(555) 901-2345", email: "linda.p@email.com", bloodType: "AB-" },
];

export const conditions = [
  "Hypertension",
  "Type 2 Diabetes",
  "COPD",
  "Asthma",
  "Hyperlipidemia",
  "Osteoarthritis",
  "Heart Disease",
  "Migraine",
  "Anemia",
  "Thyroid Disorder",
  "Chronic Kidney Disease",
  "Depression",
];

export const testResults: TestResult[] = [
  { name: "Complete Blood Count", date: "2026-04-12", status: "Normal", value: "Within range" },
  { name: "Blood Glucose (Fasting)", date: "2026-04-12", status: "Alert", value: "142 mg/dL" },
  { name: "Lipid Panel", date: "2026-04-10", status: "Alert", value: "LDL 165 mg/dL" },
  { name: "Thyroid Function (TSH)", date: "2026-04-08", status: "Normal", value: "2.4 mIU/L" },
  { name: "Liver Function Panel", date: "2026-04-08", status: "Normal", value: "Within range" },
  { name: "Kidney Function (eGFR)", date: "2026-04-05", status: "Pending", value: "Awaiting results" },
  { name: "Hemoglobin A1C", date: "2026-04-05", status: "Alert", value: "7.2%" },
  { name: "Urinalysis", date: "2026-04-01", status: "Normal", value: "No abnormalities" },
];

export const conditionTests: Record<string, TestResult> = {
  Hypertension: { name: "Hypertension", date: "2026-04-18", status: "Alert", value: "148/92 mmHg" },
  "Type 2 Diabetes": { name: "Type 2 Diabetes", date: "2026-04-18", status: "Alert", value: "142 mg/dL" },
  COPD: { name: "COPD", date: "2026-04-18", status: "Alert", value: "FEV1 62%" },
  Asthma: { name: "Asthma", date: "2026-04-18", status: "Normal", value: "FEV1 88%" },
  Hyperlipidemia: { name: "Hyperlipidemia", date: "2026-04-18", status: "Alert", value: "LDL 165 mg/dL" },
  Osteoarthritis: { name: "Osteoarthritis", date: "2026-04-18", status: "Alert", value: "Mild narrowing" },
  "Heart Disease": { name: "Heart Disease", date: "2026-04-18", status: "Normal", value: "0.02 ng/mL" },
  Migraine: { name: "Migraine", date: "2026-04-18", status: "Normal", value: "No abnormalities" },
  Anemia: { name: "Anemia", date: "2026-04-18", status: "Alert", value: "Hgb 10.2 g/dL" },
  "Thyroid Disorder": { name: "Thyroid Disorder", date: "2026-04-18", status: "Alert", value: "6.8 mIU/L" },
  "Chronic Kidney Disease": { name: "Chronic Kidney Disease", date: "2026-04-18", status: "Alert", value: "48 mL/min" },
  Depression: { name: "Depression", date: "2026-04-18", status: "Alert", value: "18 ng/mL" },
};