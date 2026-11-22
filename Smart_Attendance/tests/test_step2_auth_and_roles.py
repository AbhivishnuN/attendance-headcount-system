import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.session import Base, get_db
from app.main import app
from app.models import User, Student, Teacher, Class, Subject, RoleEnum
from app.services.security import hash_password

# Completely in-memory SQLite with StaticPool so all connections share the same memory DB
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed 1 Teacher & 1 Student for tests
    t_user = User(
        username="test_teacher",
        email="teacher@test.edu",
        hashed_password=hash_password("Teacher@123"),
        role=RoleEnum.TEACHER,
        is_active=True,
    )
    db.add(t_user)
    db.flush()

    teacher = Teacher(
        user_id=t_user.id,
        employee_id="TCH-TEST",
        name="Prof. Test",
        department="CSE",
    )
    db.add(teacher)

    cls = Class(name="CSE-6A", department="CSE", semester=6, section="A")
    sub = Subject(code="CS601", name="IoT", department="CSE", semester=6)
    db.add_all([cls, sub])
    db.flush()

    s_user = User(
        username="test_student",
        email="student@test.edu",
        hashed_password=hash_password("Student@123"),
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db.add(s_user)
    db.flush()

    student = Student(
        user_id=s_user.id,
        roll_no="21TEST001",
        student_id="RFID-TEST-001",
        name="Student Test",
        department="CSE",
        semester=6,
        section="A",
        class_id=cls.id,
    )
    db.add(student)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


client = TestClient(app)


def test_login_teacher_success():
    res = client.post("/auth/login", json={"username": "test_teacher", "password": "Teacher@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "teacher"
    assert data["identifier"] == "TCH-TEST"


def test_login_student_success():
    res = client.post("/auth/login", json={"username": "test_student", "password": "Student@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "student"
    assert data["identifier"] == "21TEST001"


def test_login_invalid_password():
    res = client.post("/auth/login", json={"username": "test_student", "password": "WrongPassword"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_get_me_profile():
    # Login as student
    login_res = client.post("/auth/login", json={"username": "test_student", "password": "Student@123"})
    token = login_res.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    profile = res.json()
    assert profile["username"] == "test_student"
    assert profile["role"] == "student"
    assert profile["identifier"] == "21TEST001"


def test_get_me_unauthorized():
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_student_gets_403_on_teacher_endpoints():
    """
    CRITICAL SECURITY RULE:
    Students MUST be blocked with HTTP 403 Forbidden from accessing teacher operations!
    """
    # Login as Student
    s_login = client.post("/auth/login", json={"username": "test_student", "password": "Student@123"})
    s_token = s_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {s_token}"}

    # 1. Start Session
    res_start = client.post("/sessions/start", json={"class_id": 1, "subject_id": 1}, headers=headers)
    assert res_start.status_code == 403, f"Expected 403, got {res_start.status_code}"

    # 2. Process Scan
    res_scan = client.post("/scan", json={"student_id": "RFID-TEST-001"}, headers=headers)
    assert res_scan.status_code == 403, f"Expected 403, got {res_scan.status_code}"

    # 3. Attendance Correction
    res_correct = client.post(
        "/attendance/correct",
        json={"record_id": 1, "new_status": "PRESENT", "reason": "Hacking attempt"},
        headers=headers,
    )
    assert res_correct.status_code == 403, f"Expected 403, got {res_correct.status_code}"

    # 4. Trigger Headcount
    res_hc = client.post("/headcount/run", headers=headers)
    assert res_hc.status_code == 403, f"Expected 403, got {res_hc.status_code}"


def test_teacher_can_access_teacher_endpoints():
    """Verify that an authenticated teacher is granted access to teacher endpoints."""
    t_login = client.post("/auth/login", json={"username": "test_teacher", "password": "Teacher@123"})
    t_token = t_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {t_token}"}

    res_active = client.get("/sessions/active", headers=headers)
    assert res_active.status_code == 200
    assert "active" in res_active.json()


def test_student_accesses_own_student_profile():
    """Verify student portal returns student's own data."""
    s_login = client.post("/auth/login", json={"username": "test_student", "password": "Student@123"})
    s_token = s_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {s_token}"}

    res_profile = client.get("/student/profile", headers=headers)
    assert res_profile.status_code == 200
    data = res_profile.json()
    assert data["roll_no"] == "21TEST001"
    assert data["name"] == "Student Test"
