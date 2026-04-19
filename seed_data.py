import requests

BASE_URL = "http://localhost:8000"

patients = [
    { "patient_id": "PT-1001", "name": "James Anderson", "age": 54, "gender": "Male", "last_visit": "2026-04-12", "condition": "Hypertension", "phone": "(555) 234-5678", "email": "james.a@email.com", "blood_type": "A+" },
    { "patient_id": "PT-1002", "name": "Maria Garcia", "age": 38, "gender": "Female", "last_visit": "2026-04-15", "condition": "Diabetes", "phone": "(555) 345-6789", "email": "maria.g@email.com", "blood_type": "O+" },
    { "patient_id": "PT-1003", "name": "Robert Chen", "age": 67, "gender": "Male", "last_visit": "2026-04-10", "condition": "Sclerosis", "phone": "(555) 456-7890", "email": "robert.c@email.com", "blood_type": "B-" },
]

conditions = ["Diabetes", "Glaucoma", "Sclerosis", "Dry eye"]

test_results = [
    { "name": "Complete Blood Count", "date": "2026-04-12", "status": "Normal", "value": "Within range" },
    { "name": "Blood Glucose (Fasting)", "date": "2026-04-12", "status": "Alert", "value": "142 mg/dL" },
]

def seed():
    print("Seeding conditions...")
    for cond in conditions:
        requests.post(f"{BASE_URL}/conditions/", json={"name": cond})
    
    print("Seeding patients...")
    for p in patients:
        response = requests.post(f"{BASE_URL}/patients/", json=p)
        if response.status_code == 200:
            patient_db_id = response.json()["id"]
            for tr in test_results:
                requests.post(f"{BASE_URL}/patients/{patient_db_id}/test_results/", json=tr)
    print("Seeding complete.")

if __name__ == "__main__":
    seed()
