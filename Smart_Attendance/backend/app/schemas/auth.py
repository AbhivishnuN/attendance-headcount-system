from typing import Optional
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    name: str
    identifier: str  # roll_no for student, employee_id for teacher
    department: Optional[str] = None
    class_name: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    name: str
    identifier: str
    department: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    student_id: Optional[str] = None  # RFID card ID (for student)

    model_config = ConfigDict(from_attributes=True)
