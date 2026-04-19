import os
import shutil
import uuid
import asyncio
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text

from . import models, schemas, database
from .database import engine
from .pipeline import build_evaluation_response, preprocess_single_image_for_debug

models.Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    connection.execute(
        text("ALTER TABLE test_results ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT FALSE")
    )

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

@app.delete("/test_results/{test_result_id}")
def delete_test_result(test_result_id: int, db: Session = Depends(get_db)):
    db_test_result = db.query(models.TestResult).filter(models.TestResult.id == test_result_id).first()
    if not db_test_result:
        raise HTTPException(status_code=404, detail="Test result not found")

    db.delete(db_test_result)
    db.commit()
    return {"status": "success", "message": "Test result deleted"}


@app.patch("/test_results/{test_result_id}/confirmation", response_model=schemas.TestResult)
def set_test_result_confirmation(
    test_result_id: int,
    payload: schemas.TestResultConfirmationUpdate,
    db: Session = Depends(get_db),
):
    db_test_result = db.query(models.TestResult).filter(models.TestResult.id == test_result_id).first()
    if not db_test_result:
        raise HTTPException(status_code=404, detail="Test result not found")

    db_test_result.confirmed = payload.confirmed
    db.commit()
    db.refresh(db_test_result)
    return db_test_result

@app.post("/conditions/", response_model=schemas.Condition)
def create_condition(condition: schemas.ConditionCreate, db: Session = Depends(get_db)):
    existing_condition = db.query(models.Condition).filter(models.Condition.name == condition.name).first()
    if existing_condition:
        raise HTTPException(status_code=400, detail="Condition already exists")

    db_condition = models.Condition(name=condition.name)
    db.add(db_condition)
    db.commit()
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
async def evaluate_photo(photo: UploadFile = File(...), models: List[str] = Form(default=[])):
    # Mocking a call to a model API that evaluates a photo for diseases.
    await asyncio.sleep(0.4)
    raw_photo = await photo.read()
    response = build_evaluation_response(raw_photo, models)
    processed_filename = preprocess_single_image_for_debug(raw_photo, UPLOAD_DIR)
    if not processed_filename:
        file_extension = os.path.splitext(photo.filename or "")[1] or ".png"
        processed_filename = f"debug_raw_{uuid.uuid4()}{file_extension}"
        with open(os.path.join(UPLOAD_DIR, processed_filename), "wb") as buffer:
            buffer.write(raw_photo)

    response["processed_filename"] = processed_filename
    return response

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Mocking a call to the models API to check its health
    await asyncio.sleep(0.1)
    return {
        "status": "healthy", 
        "database": "connected", 
        "model_api": "healthy (mocked)"
    }
