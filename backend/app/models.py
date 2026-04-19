from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True) # e.g. PT-1001
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    last_visit = Column(String)
    condition = Column(String)
    phone = Column(String)
    email = Column(String)
    blood_type = Column(String)
    photo_path = Column(String, nullable=True)

    test_results = relationship("TestResult", back_populates="patient")

class Condition(Base):
    __tablename__ = "conditions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    name = Column(String)
    date = Column(String)
    status = Column(String) # Normal, Alert, Pending
    confirmed = Column(Boolean, nullable=False, default=False, server_default="false")
    value = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    
    patient = relationship("Patient", back_populates="test_results")
