import os
import sys
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models import (
    Base,
    User,
    RoleEnum,
    Student,
    Teacher,
    Class,
    Subject,
    AttendanceSession,
    AttendanceRecord,
    AttendanceStatus,
    VerificationStatus,
    ScanMethod,
    SessionStatus,
    HeadcountTimerSetting,
    AttendanceCorrection,
    VerificationLog,
    DiscrepancyType,
)
from app.services.security import hash_password, verify_password
from app.database.archive_service import archive_old_records


@pytest.fixture(scope="function")
def db_session():
    """In-memory SQLite database session for fast, isolated testing."""
    test_engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


def test_password_hashing():
    """Test bcrypt hashing and verification."""
    raw_pass = "SecurePass@2026"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_user_and_student_creation(db_session):
    """Test creating a student linked to a user account."""
    user = User(
        username="21cs001",
        email="21cs001@college.edu",
        hashed_password=hash_password("Pass@123"),
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    cls = Class(name="CSE-6A", department="CSE", semester=6, section="A", is_active=True)
    db_session.add(cls)
    db_session.commit()

    student = Student(
        user_id=user.id,
        roll_no="21CS001",
        student_id="RFID-1001",
        name="Aarav Sharma",
        department="CSE",
        semester=6,
        section="A",
        class_id=cls.id,
    )
    db_session.add(student)
    db_session.commit()

    assert student.id is not None
    assert student.user.username == "21cs001"
    assert student.class_obj.name == "CSE-6A"


def test_attendance_record_unique_constraint(db_session):
    """Ensure a student cannot have duplicate attendance records in the same session."""
    user_t = User(username="tch01", hashed_password="pw", role=RoleEnum.TEACHER)
    db_session.add(user_t)
    db_session.commit()

    teacher = Teacher(user_id=user_t.id, employee_id="TCH01", name="Prof Doe", department="CSE")
    cls = Class(name="CSE-6A", department="CSE", semester=6, section="A")
    sub = Subject(code="CS601", name="IoT", department="CSE", semester=6)
    db_session.add_all([teacher, cls, sub])
    db_session.commit()

    session = AttendanceSession(
        class_id=cls.id,
        subject_id=sub.id,
        teacher_id=teacher.id,
        status=SessionStatus.ACTIVE,
    )
    db_session.add(session)
    db_session.commit()

    user_s = User(username="21cs002", hashed_password="pw", role=RoleEnum.STUDENT)
    db_session.add(user_s)
    db_session.commit()

    student = Student(
        user_id=user_s.id,
        roll_no="21CS002",
        student_id="RFID-1002",
        name="Aditi Rao",
        department="CSE",
        semester=6,
        section="A",
        class_id=cls.id,
    )
    db_session.add(student)
    db_session.commit()

    # First record should succeed
    rec1 = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        status=AttendanceStatus.PRESENT,
    )
    db_session.add(rec1)
    db_session.commit()
    assert rec1.id is not None

    # Second record for SAME student in SAME session must fail unique constraint
    rec2 = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        status=AttendanceStatus.PRESENT,
    )
    db_session.add(rec2)
    with pytest.raises(Exception):
        db_session.commit()
    db_session.rollback()


def test_attendance_correction_audit_log(db_session):
    """Ensure attendance corrections maintain an append-only audit trail with mandatory reason."""
    user_t = User(username="tch01", hashed_password="pw", role=RoleEnum.TEACHER)
    user_s = User(username="stu01", hashed_password="pw", role=RoleEnum.STUDENT)
    db_session.add_all([user_t, user_s])
    db_session.commit()

    teacher = Teacher(user_id=user_t.id, employee_id="TCH01", name="Prof Doe", department="CSE")
    cls = Class(name="CSE-6A", department="CSE", semester=6, section="A")
    sub = Subject(code="CS601", name="IoT", department="CSE", semester=6)
    db_session.add_all([teacher, cls, sub])
    db_session.commit()

    student = Student(user_id=user_s.id, roll_no="21CS003", student_id="RFID-1003", name="Ananya", department="CSE", semester=6, section="A", class_id=cls.id)
    session = AttendanceSession(class_id=cls.id, subject_id=sub.id, teacher_id=teacher.id, status=SessionStatus.ACTIVE)
    db_session.add_all([student, session])
    db_session.commit()

    rec = AttendanceRecord(session_id=session.id, student_id=student.id, status=AttendanceStatus.ABSENT)
    db_session.add(rec)
    db_session.commit()

    # Apply manual correction: mark PRESENT with required reason
    correction = AttendanceCorrection(
        record_id=rec.id,
        session_id=session.id,
        student_id=student.id,
        corrected_by_user_id=user_t.id,
        previous_status=AttendanceStatus.ABSENT.value,
        new_status=AttendanceStatus.PRESENT.value,
        reason="Student card had a read error; verified in classroom manually",
    )
    db_session.add(correction)
    rec.status = AttendanceStatus.PRESENT
    db_session.commit()

    corrections = db_session.query(AttendanceCorrection).filter(AttendanceCorrection.record_id == rec.id).all()
    assert len(corrections) == 1
    assert corrections[0].reason == "Student card had a read error; verified in classroom manually"
    assert corrections[0].previous_status == "ABSENT"
    assert corrections[0].new_status == "PRESENT"


def test_archive_old_records_service(db_session):
    """Ensure archive service flags records older than 7 days without deleting them."""
    user_t = User(username="tch02", hashed_password="pw", role=RoleEnum.TEACHER)
    db_session.add(user_t)
    db_session.commit()

    teacher = Teacher(user_id=user_t.id, employee_id="TCH02", name="Katherine", department="CSE")
    cls = Class(name="CSE-6A", department="CSE", semester=6, section="A")
    sub = Subject(code="CS602", name="AI", department="CSE", semester=6)
    db_session.add_all([teacher, cls, sub])
    db_session.commit()

    old_date = datetime.now(timezone.utc) - timedelta(days=10)
    recent_date = datetime.now(timezone.utc) - timedelta(days=2)

    old_session = AttendanceSession(
        class_id=cls.id,
        subject_id=sub.id,
        teacher_id=teacher.id,
        created_at=old_date,
        is_archived=False,
    )
    recent_session = AttendanceSession(
        class_id=cls.id,
        subject_id=sub.id,
        teacher_id=teacher.id,
        created_at=recent_date,
        is_archived=False,
    )
    db_session.add_all([old_session, recent_session])
    db_session.commit()

    # Run archive function
    counts = archive_old_records(db_session, days=7)
    assert counts["sessions"] == 1

    # Reload sessions
    db_session.refresh(old_session)
    db_session.refresh(recent_session)

    assert old_session.is_archived is True
    assert recent_session.is_archived is False
