import os
import shutil
import uuid
import asyncio
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

from . import models, schemas, database
from .database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medical Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.patient_id == patient.patient_id).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Patient ID already registered")
    
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    patients = db.query(models.Patient).options(joinedload(models.Patient.test_results)).offset(skip).limit(limit).all()
    return patients

@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).options(joinedload(models.Patient.test_results)).filter(models.Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.post("/patients/{patient_id}/test_results/", response_model=schemas.TestResult)
def create_test_result_for_patient(
    patient_id: int, test_result: schemas.TestResultCreate, db: Session = Depends(get_db)
):
    db_test_result = models.TestResult(**test_result.model_dump(), patient_id=patient_id)
    db.add(db_test_result)
    db.commit()
    db.refresh(db_test_result)
    return db_test_result

@app.post("/conditions/", response_model=schemas.Condition)
def create_condition(condition: schemas.ConditionCreate, db: Session = Depends(get_db)):
    db_condition = models.Condition(name=condition.name)
    db.add(db_condition)
    db.commit()
    db_condition_data = schemas.Condition.from_orm(db_condition)
    db.refresh(db_condition)
    return db_condition

@app.get("/conditions/", response_model=List[schemas.Condition])
def read_conditions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    conditions = db.query(models.Condition).offset(skip).limit(limit).all()
    return conditions

@app.post("/patients/{patient_id}/photo/")
async def upload_patient_photo(patient_id: int, photo: UploadFile = File(...), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    file_extension = os.path.splitext(photo.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
        
    patient.photo_path = filename
    db.commit()
    db.refresh(patient)
    
    return {"filename": filename, "message": "Photo uploaded successfully"}

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"filename": filename}

@app.post("/evaluate_photo/")
async def evaluate_photo(photo: UploadFile = File(...)):
    # Mocking a call to a model API that evaluates a photo for diseases
    await asyncio.sleep(1)  # Simulate network delay
    
    # Simple mock logic based on the file name or just a random response
    mock_results = {
        "status": "success",
        "evaluations": [
            {"disease": "Diabetes", "probability": 0.05, "risk_level": "Low"},
            {"disease": "Glaucoma", "probability": 0.12, "risk_level": "Low"},
            {"disease": "Sclerosis", "probability": 0.85, "risk_level": "High"},
            {"disease": "Dry eye", "probability": 0.45, "risk_level": "Moderate"}
        ],
        "message": "Photo evaluated successfully. Mock results generated."
    }
    
    return mock_results

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Mocking a call to the models API to check its health
    await asyncio.sleep(0.1)
    return {
        "status": "healthy", 
        "database": "connected", 
        "model_api": "healthy (mocked)"
    }
