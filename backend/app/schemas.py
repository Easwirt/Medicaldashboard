from pydantic import BaseModel
from typing import List, Optional

class TestResultBase(BaseModel):
    name: str
    date: str
    status: str
    confirmed: bool = False
    value: Optional[str] = None
    photo_path: Optional[str] = None

class TestResultCreate(TestResultBase):
    pass

class TestResult(TestResultBase):
    id: int
    patient_id: int

    class Config:
        from_attributes = True


class TestResultConfirmationUpdate(BaseModel):
    confirmed: bool

class PatientBase(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    last_visit: str
    condition: str
    phone: str
    email: str
    blood_type: str

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    photo_path: Optional[str] = None
    test_results: List[TestResult] = []

    class Config:
        from_attributes = True

class ConditionBase(BaseModel):
    name: str

class ConditionCreate(ConditionBase):
    pass

class Condition(ConditionBase):
    id: int

    class Config:
        from_attributes = True
