from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Index,
    Enum as SQLEnum,
    func
)
from sqlalchemy.orm import relationship
from app.database.session import Base


# -------------------------------------------------------------
# Enums
# -------------------------------------------------------------
class RoleEnum(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class SessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"


class VerificationStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"
    PENDING = "PENDING"


class ScanMethod(str, enum.Enum):
    RFID_CARD = "RFID_CARD"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"
    STM32_SERIAL = "STM32_SERIAL"


class HeadcountStatus(str, enum.Enum):
    MATCH = "MATCH"
    MISMATCH_FEWER = "MISMATCH_FEWER"
    MISMATCH_MORE = "MISMATCH_MORE"


class CameraType(str, enum.Enum):
    WEBCAM = "WEBCAM"
    RTSP_CCTV = "RTSP_CCTV"


class DiscrepancyType(str, enum.Enum):
    MATCH = "MATCH"
    HEADCOUNT_LOWER_THAN_SWIPES = "HEADCOUNT_LOWER_THAN_SWIPES"
    HEADCOUNT_HIGHER_THAN_SWIPES = "HEADCOUNT_HIGHER_THAN_SWIPES"


class DiscrepancySeverity(str, enum.Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    ALERT = "ALERT"


class ReviewStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    RESOLVED_VALID = "RESOLVED_VALID"
    RESOLVED_PROXY_CONFIRMED = "RESOLVED_PROXY_CONFIRMED"
    RESOLVED_HARDWARE_GLITCH = "RESOLVED_HARDWARE_GLITCH"


class IssueStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# -------------------------------------------------------------
# 1. User Model
# -------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), nullable=False, default=RoleEnum.STUDENT, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")


# -------------------------------------------------------------
# 2. Student Model
# -------------------------------------------------------------
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    roll_no = Column(String(50), unique=True, index=True, nullable=False)
    student_id = Column(String(50), unique=True, index=True, nullable=False)  # RFID / Barcode Card identifier
    name = Column(String(120), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    section = Column(String(10), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    class_obj = relationship("Class", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    issue_requests = relationship("AttendanceIssueRequest", back_populates="student", cascade="all, delete-orphan")
    corrections = relationship("AttendanceCorrection", back_populates="student", cascade="all, delete-orphan")


# -------------------------------------------------------------
# 3. Teacher Model
# -------------------------------------------------------------
class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    sessions = relationship("AttendanceSession", back_populates="teacher")
    timetable_entries = relationship("Timetable", back_populates="teacher")
    session_logs = relationship("TeacherSessionRecord", back_populates="teacher")


# -------------------------------------------------------------
# 4. Class Model
# -------------------------------------------------------------
class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)  # e.g., "CSE-6A"
    department = Column(String(100), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    section = Column(String(10), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("department", "semester", "section", name="uq_class_dept_sem_sec"),
    )

    # Relationships
    students = relationship("Student", back_populates="class_obj")
    timetable_entries = relationship("Timetable", back_populates="class_obj")
    sessions = relationship("AttendanceSession", back_populates="class_obj")


# -------------------------------------------------------------
# 5. Subject Model
# -------------------------------------------------------------
class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "CS601"
    name = Column(String(150), nullable=False, index=True)             # e.g. "Internet of Things & Embedded Systems"
    department = Column(String(100), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    timetable_entries = relationship("Timetable", back_populates="subject")
    sessions = relationship("AttendanceSession", back_populates="subject")


# -------------------------------------------------------------
# 6. Timetable Model
# -------------------------------------------------------------
class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(String(20), nullable=False, index=True)  # "Monday", "Tuesday", etc.
    start_time = Column(String(10), nullable=False)                # "09:00"
    end_time = Column(String(10), nullable=False)                  # "10:00"
    room_no = Column(String(50), default="Lab-IoT-1", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    class_obj = relationship("Class", back_populates="timetable_entries")
    subject = relationship("Subject", back_populates="timetable_entries")
    teacher = relationship("Teacher", back_populates="timetable_entries")


# -------------------------------------------------------------
# 7. AttendanceSession Model
# -------------------------------------------------------------
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False, index=True)
    room_no = Column(String(50), default="Lab-IoT-1", nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)  # Archived if > 7 days old
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    class_obj = relationship("Class", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    teacher = relationship("Teacher", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    teacher_record = relationship("TeacherSessionRecord", back_populates="session", uselist=False, cascade="all, delete-orphan")
    headcount_records = relationship("HeadcountRecord", back_populates="session", cascade="all, delete-orphan")
    verification_logs = relationship("VerificationLog", back_populates="session", cascade="all, delete-orphan")
    corrections = relationship("AttendanceCorrection", back_populates="session", cascade="all, delete-orphan")
    issue_requests = relationship("AttendanceIssueRequest", back_populates="session", cascade="all, delete-orphan")
    timer_setting = relationship("HeadcountTimerSetting", back_populates="session", uselist=False, cascade="all, delete-orphan")


# -------------------------------------------------------------
# 8. AttendanceRecord Model
# -------------------------------------------------------------
class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False, index=True)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED, nullable=False, index=True)
    scan_method = Column(SQLEnum(ScanMethod), default=ScanMethod.RFID_CARD, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Unique constraint per student per session: a student can only have ONE attendance record per session!
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
        Index("idx_att_rec_session_status", "session_id", "status"),
    )

    # Relationships
    session = relationship("AttendanceSession", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")
    corrections = relationship("AttendanceCorrection", back_populates="attendance_record", cascade="all, delete-orphan")


# -------------------------------------------------------------
# 9. TeacherSessionRecord Model
# -------------------------------------------------------------
class TeacherSessionRecord(Base):
    __tablename__ = "teacher_session_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("AttendanceSession", back_populates="teacher_record")
    teacher = relationship("Teacher", back_populates="session_logs")


# -------------------------------------------------------------
# 10. HeadcountRecord Model
# -------------------------------------------------------------
class HeadcountRecord(Base):
    __tablename__ = "headcount_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    detected_count = Column(Integer, nullable=False)
    expected_count = Column(Integer, nullable=False)  # RFID swipe count at this moment
    image_path = Column(String(255), nullable=True)
    status = Column(SQLEnum(HeadcountStatus), nullable=False, index=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("AttendanceSession", back_populates="headcount_records")


# -------------------------------------------------------------
# 11. HeadcountTimerSetting Model
# -------------------------------------------------------------
class HeadcountTimerSetting(Base):
    __tablename__ = "headcount_timer_settings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), unique=True, nullable=True, index=True)
    interval_minutes = Column(Integer, default=15, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    camera_source = Column(String(255), default="0", nullable=False)  # "0" = laptop webcam, or rtsp URL
    camera_type = Column(SQLEnum(CameraType), default=CameraType.WEBCAM, nullable=False)
    rtsp_username = Column(String(100), nullable=True)
    rtsp_password = Column(String(100), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    session = relationship("AttendanceSession", back_populates="timer_setting")


# -------------------------------------------------------------
# 12. VerificationLog Model
# -------------------------------------------------------------
class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    headcount_detected = Column(Integer, nullable=False)
    rfid_swipes_count = Column(Integer, nullable=False)
    discrepancy_type = Column(SQLEnum(DiscrepancyType), nullable=False, index=True)
    severity = Column(SQLEnum(DiscrepancySeverity), default=DiscrepancySeverity.NORMAL, nullable=False, index=True)
    review_status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.PENDING_REVIEW, nullable=False, index=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("AttendanceSession", back_populates="verification_logs")
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])


# -------------------------------------------------------------
# 13. AttendanceCorrection Model (Audit Trail - Never Overwrite)
# -------------------------------------------------------------
class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    corrected_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(20), nullable=False)
    new_status = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)  # Explanation is strictly required
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    attendance_record = relationship("AttendanceRecord", back_populates="corrections")
    session = relationship("AttendanceSession", back_populates="corrections")
    student = relationship("Student", back_populates="corrections")
    corrected_by_user = relationship("User", foreign_keys=[corrected_by_user_id])


# -------------------------------------------------------------
# 14. AttendanceIssueRequest Model
# -------------------------------------------------------------
class AttendanceIssueRequest(Base):
    __tablename__ = "attendance_issue_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    issue_type = Column(String(100), nullable=False)  # e.g., "Marked Absent while Present"
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(IssueStatus), default=IssueStatus.PENDING, nullable=False, index=True)
    teacher_remarks = Column(Text, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="issue_requests")
    session = relationship("AttendanceSession", back_populates="issue_requests")
    resolver = relationship("User", foreign_keys=[resolved_by_user_id])
