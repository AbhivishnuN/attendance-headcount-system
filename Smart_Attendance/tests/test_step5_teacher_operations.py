import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.session import Base, get_db
from app.main import app
from app.models import (
    User, Teacher, Student, Class, Subject,
    RoleEnum, SessionStatus, AttendanceStatus, ScanMethod, VerificationStatus
)
from app.services.security import hash_password, create_access_token

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

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Create Class & Subject
    c = Class(name="CSE-6A", department="CSE", semester=6, section="A")
    s = Subject(code="CS601", name="IoT and Smart Systems", department="CSE", semester=6)
    db.add_all([c, s])
    db.flush()

    # Create Teacher
    u_teacher = User(
        username="tch-001",
        email="alan@university.edu",
        hashed_password=hash_password("Teacher@123"),
        role=RoleEnum.TEACHER,
        is_active=True
    )
    db.add(u_teacher)
    db.flush()

    t = Teacher(
        user_id=u_teacher.id,
        employee_id="tch-001",
        name="Dr. Alan Turing",
        department="CSE"
    )

    # Create Student
    u_student = User(
        username="21cs001",
        email="alice@university.edu",
        hashed_password=hash_password("Student@123"),
        role=RoleEnum.STUDENT,
        is_active=True
    )
    db.add(u_student)
    db.flush()

    st = Student(
        user_id=u_student.id,
        roll_no="21cs001",
        student_id="STU-RFID-1001",
        name="Alice Smith",
        department="CSE",
        semester=6,
        section="A",
        class_id=c.id
    )

    db.add_all([t, st])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)

def get_teacher_token():
    return create_access_token({"sub": "tch-001", "role": "TEACHER", "user_id": 1})

def get_student_token():
    return create_access_token({"sub": "21cs001", "role": "STUDENT", "user_id": 2})

def test_teacher_profile_and_metadata():
    token = get_teacher_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    r_prof = client.get("/teacher/profile", headers=headers)
    assert r_prof.status_code == 200
    assert r_prof.json()["employee_id"] == "tch-001"

    # Classes
    r_cls = client.get("/teacher/classes", headers=headers)
    assert r_cls.status_code == 200
    assert len(r_cls.json()) >= 1
    assert r_cls.json()[0]["name"] == "CSE-6A"

    # Subjects
    r_sub = client.get("/teacher/subjects", headers=headers)
    assert r_sub.status_code == 200
    assert len(r_sub.json()) >= 1
    assert r_sub.json()[0]["code"] == "CS601"

def test_session_lifecycle_and_scan():
    t_token = get_teacher_token()
    headers = {"Authorization": f"Bearer {t_token}"}

    # 1. Start Session
    r_start = client.post("/sessions/start", json={
        "class_id": 1,
        "subject_id": 1,
        "room_no": "IoT-Lab-1"
    }, headers=headers)
    assert r_start.status_code == 200
    session_id = r_start.json()["session_id"]
    assert session_id is not None

    # 2. Get Active Session
    r_active = client.get("/sessions/active", headers=headers)
    assert r_active.status_code == 200
    assert r_active.json()["active"] is True
    assert r_active.json()["session"]["id"] == session_id

    # 3. Scan Student RFID
    r_scan = client.post("/scan", json={
        "student_id": "STU-RFID-1001",
        "session_id": session_id
    }, headers=headers)
    assert r_scan.status_code == 200
    assert r_scan.json()["status"] == "SUCCESS"
    rec_id = r_scan.json()["record"]["record_id"]

    # 4. Duplicate scan rejected
    r_dup = client.post("/scan", json={
        "student_id": "STU-RFID-1001",
        "session_id": session_id
    }, headers=headers)
    assert r_dup.status_code == 409

    # 5. Teacher badge scanned should not mark attendance as student
    r_tscan = client.post("/scan", json={
        "student_id": "tch-001",
        "session_id": session_id
    }, headers=headers)
    assert r_tscan.status_code == 200
    assert r_tscan.json()["status"] == "TEACHER_DETECTED"

    # 6. Manual attendance correction (requires reason)
    r_corr_fail = client.post("/attendance/correct", json={
        "record_id": rec_id,
        "new_status": "LATE",
        "reason": ""
    }, headers=headers)
    assert r_corr_fail.status_code == 422

    r_corr = client.post("/attendance/correct", json={
        "record_id": rec_id,
        "new_status": "LATE",
        "reason": "Traffic delay approved by HOD"
    }, headers=headers)
    assert r_corr.status_code == 200
    assert r_corr.json()["new_status"] == "LATE"

    # 7. Check session attendance roster
    r_att = client.get(f"/sessions/{session_id}/attendance", headers=headers)
    assert r_att.status_code == 200
    records = r_att.json()["records"]
    assert len(records) == 1
    assert records[0]["status"] == "LATE"

    # 8. End session
    r_end = client.post(f"/sessions/{session_id}/end", headers=headers)
    assert r_end.status_code == 200

    # Active session is now None
    r_active2 = client.get("/sessions/active", headers=headers)
    assert r_active2.status_code == 200
    assert r_active2.json()["active"] is False

def test_reports_copy_and_csv():
    t_token = get_teacher_token()
    headers = {"Authorization": f"Bearer {t_token}"}

    # Start session
    r_start = client.post("/sessions/start", json={"class_id": 1, "subject_id": 1}, headers=headers)
    sid = r_start.json()["session_id"]
    client.post("/scan", json={"student_id": "STU-RFID-1001", "session_id": sid}, headers=headers)

    # Copy report
    r_copy = client.get(f"/reports/copy?session_id={sid}", headers=headers)
    assert r_copy.status_code == 200
    assert "Alice Smith" in r_copy.json()["report_text"]

    # CSV report
    r_csv = client.get(f"/reports/csv?session_id={sid}", headers=headers)
    assert r_csv.status_code == 200
    assert "Alice Smith" in r_csv.text
