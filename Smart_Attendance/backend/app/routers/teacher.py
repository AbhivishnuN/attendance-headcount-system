from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import (
    Teacher,
    Student,
    User,
    Class,
    Subject,
    AttendanceSession,
    AttendanceRecord,
    TeacherSessionRecord,
    HeadcountRecord,
    HeadcountTimerSetting,
    VerificationLog,
    AttendanceCorrection,
    AttendanceIssueRequest,
    SessionStatus,
    AttendanceStatus,
    VerificationStatus,
    ScanMethod,
    DiscrepancyType,
    DiscrepancySeverity,
    ReviewStatus,
    CameraType,
)
from app.services.auth_dependencies import get_current_teacher

router = APIRouter(tags=["Teacher Operations (Role Protected)"])


# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------
class StartSessionRequest(BaseModel):
    class_id: int
    subject_id: int
    room_no: Optional[str] = "Lab-IoT-1"


class ScanRequest(BaseModel):
    student_id: str  # RFID card UID or student ID scanned by STM32 or simulator
    session_id: Optional[int] = None


class AttendanceCorrectionRequest(BaseModel):
    record_id: int
    new_status: str  # "PRESENT", "ABSENT", "LATE"
    reason: str      # Mandatory explanation


class TimerSettingUpdateRequest(BaseModel):
    interval_minutes: int
    is_enabled: bool
    camera_source: str
    camera_type: str = "WEBCAM"
    rtsp_username: Optional[str] = None
    rtsp_password: Optional[str] = None


class VerificationReviewRequest(BaseModel):
    log_id: int
    review_status: str  # "RESOLVED_VALID", "RESOLVED_PROXY_CONFIRMED", "RESOLVED_HARDWARE_GLITCH"
    reviewer_notes: str


class IssueResolveRequest(BaseModel):
    issue_id: int
    new_status: str   # "APPROVED", "REJECTED", "UNDER_REVIEW"
    teacher_remarks: str


# -------------------------------------------------------------
# 1. Sessions Management
# -------------------------------------------------------------
@router.post("/sessions/start")
def start_session(
    payload: StartSessionRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Starts a new attendance session for the class and subject."""
    # Check if this teacher already has an active session
    active = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.teacher_id == teacher.id, AttendanceSession.status == SessionStatus.ACTIVE)
        .first()
    )
    if active:
        # Auto-complete previously active session
        active.status = SessionStatus.COMPLETED
        active.end_time = datetime.now(timezone.utc)

    new_session = AttendanceSession(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        status=SessionStatus.ACTIVE,
        room_no=payload.room_no or "Lab-IoT-1",
        start_time=datetime.now(timezone.utc),
    )
    db.add(new_session)
    db.flush()

    teacher_rec = TeacherSessionRecord(
        session_id=new_session.id,
        teacher_id=teacher.id,
        check_in_time=datetime.now(timezone.utc),
    )
    db.add(teacher_rec)
    db.commit()
    db.refresh(new_session)

    return {
        "message": "Attendance session started successfully.",
        "session_id": new_session.id,
        "class_id": new_session.class_id,
        "subject_id": new_session.subject_id,
        "start_time": new_session.start_time.isoformat(),
        "status": new_session.status.value,
    }


@router.get("/sessions/active")
def get_active_session(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieves the current active session for the teacher."""
    session = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.teacher_id == teacher.id, AttendanceSession.status == SessionStatus.ACTIVE)
        .first()
    )
    if not session:
        return {"active": False, "session": None}

    return {
        "active": True,
        "session": {
            "id": session.id,
            "class_name": session.class_obj.name if session.class_obj else "Unknown Class",
            "subject_name": session.subject.name if session.subject else "Unknown Subject",
            "subject_code": session.subject.code if session.subject else "",
            "room_no": session.room_no,
            "start_time": session.start_time.isoformat() if session.start_time else None,
            "status": session.status.value,
        }
    }


@router.get("/sessions/{session_id}/attendance")
def get_session_attendance(
    session_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns the attendance roster for a given session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == session_id)
        .order_by(AttendanceRecord.timestamp.desc())
        .all()
    )

    items = []
    for r in records:
        stu = r.student
        items.append({
            "record_id": r.id,
            "student_id": stu.id if stu else None,
            "roll_no": stu.roll_no if stu else "N/A",
            "card_id": stu.student_id if stu else "N/A",
            "name": stu.name if stu else "Unknown",
            "status": r.status.value,
            "verification_status": r.verification_status.value,
            "scan_method": r.scan_method.value,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        })

    return {
        "session_id": session.id,
        "total_marked": len(items),
        "present_count": sum(1 for r in items if r["status"] == "PRESENT"),
        "records": items,
    }


# -------------------------------------------------------------
# 2. Hardware / RFID Scan Endpoint (STM32 & UI Simulator)
# -------------------------------------------------------------
@router.post("/scan")
def process_scan(
    payload: ScanRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Processes an RFID / Barcode scan from STM32 or the Dashboard Simulator.
    Applies all scan rules:
      1. Check if ID belongs to teacher -> detect separately, never add to student list!
      2. Check student exists -> reject invalid ID
      3. Check active session -> reject if no active session
      4. Reject duplicate scans for same student in the session
      5. Save record and return status
    """
    raw_id = payload.student_id.strip()

    # Rule 1: Check if scanned ID belongs to a Teacher
    is_teacher_id = db.query(Teacher).filter(
        (Teacher.employee_id.ilike(raw_id)) | (Teacher.employee_id.ilike(f"TCH-{raw_id}"))
    ).first()
    if is_teacher_id:
        return {
            "status": "TEACHER_DETECTED",
            "message": f"Teacher scanned ({is_teacher_id.name}). Verified session supervisor; not added to student list.",
            "teacher_id": is_teacher_id.employee_id,
        }

    # Find active session
    session_id = payload.session_id
    if session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    else:
        session = (
            db.query(AttendanceSession)
            .filter(AttendanceSession.teacher_id == teacher.id, AttendanceSession.status == SessionStatus.ACTIVE)
            .first()
        )

    # Rule 3: Reject if no active session
    if not session or session.status != SessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scan rejected: No active attendance session found. Please start a session first.",
        )

    # Rule 2: Check student exists
    student = db.query(Student).filter(
        (Student.student_id.ilike(raw_id)) | (Student.roll_no.ilike(raw_id))
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan rejected: Unknown card ID '{raw_id}'. No student registered with this identifier.",
        )

    # Rule 4: Reject duplicate scan
    existing_rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == student.id,
    ).first()

    if existing_rec:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate scan: Student {student.name} ({student.roll_no}) already marked present at {existing_rec.timestamp.strftime('%H:%M:%S')}.",
        )

    # Create Attendance Record
    now = datetime.now(timezone.utc)
    new_record = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        timestamp=now,
        status=AttendanceStatus.PRESENT,
        verification_status=VerificationStatus.VERIFIED,
        scan_method=ScanMethod.RFID_CARD,
        is_archived=False,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "status": "SUCCESS",
        "message": f"Attendance marked for {student.name}",
        "record": {
            "record_id": new_record.id,
            "student_id": student.id,
            "roll_no": student.roll_no,
            "card_id": student.student_id,
            "name": student.name,
            "status": new_record.status.value,
            "verification_status": new_record.verification_status.value,
            "scan_method": new_record.scan_method.value,
            "timestamp": new_record.timestamp.isoformat(),
        }
    }


# -------------------------------------------------------------
# 3. Manual Correction (Audit Trail - Never Overwritten)
# -------------------------------------------------------------
@router.post("/attendance/correct")
def correct_attendance(
    payload: AttendanceCorrectionRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Manually corrects a student's attendance record.
    Strictly requires a justification reason and records to immutable audit table.
    """
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A detailed reason is required for any manual attendance correction.",
        )

    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == payload.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    prev_status = record.status.value
    new_status = payload.new_status.upper()

    try:
        status_enum = AttendanceStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Allowed: PRESENT, ABSENT, LATE")

    # Record audit log
    correction = AttendanceCorrection(
        record_id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        corrected_by_user_id=teacher.user_id,
        previous_status=prev_status,
        new_status=new_status,
        reason=payload.reason.strip(),
    )
    db.add(correction)

    # Update current status
    record.status = status_enum
    record.scan_method = ScanMethod.MANUAL_OVERRIDE
    db.commit()

    return {
        "message": f"Attendance status updated from {prev_status} to {new_status}.",
        "record_id": record.id,
        "new_status": new_status,
        "audit_id": correction.id,
    }


# -------------------------------------------------------------
# 4. Headcount & Settings
# -------------------------------------------------------------
@router.get("/headcount/settings")
def get_headcount_settings(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieves camera and timer settings, masking sensitive RTSP passwords."""
    setting = db.query(HeadcountTimerSetting).filter(HeadcountTimerSetting.session_id == None).first()
    if not setting:
        setting = HeadcountTimerSetting(
            session_id=None,
            interval_minutes=15,
            is_enabled=True,
            camera_source="0",
            camera_type=CameraType.WEBCAM,
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)

    masked_pw = "********" if setting.rtsp_password else None
    return {
        "id": setting.id,
        "interval_minutes": setting.interval_minutes,
        "is_enabled": setting.is_enabled,
        "camera_source": setting.camera_source,
        "camera_type": setting.camera_type.value,
        "rtsp_username": setting.rtsp_username,
        "rtsp_password_masked": masked_pw,
        "last_run_at": setting.last_run_at.isoformat() if setting.last_run_at else None,
    }


@router.put("/headcount/settings")
def update_headcount_settings(
    payload: TimerSettingUpdateRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Updates headcount interval and camera source config."""
    setting = db.query(HeadcountTimerSetting).filter(HeadcountTimerSetting.session_id == None).first()
    if not setting:
        setting = HeadcountTimerSetting(session_id=None)
        db.add(setting)

    setting.interval_minutes = max(1, payload.interval_minutes)
    setting.is_enabled = payload.is_enabled
    setting.camera_source = payload.camera_source
    setting.camera_type = CameraType(payload.camera_type) if payload.camera_type in ["WEBCAM", "RTSP_CCTV"] else CameraType.WEBCAM
    if payload.rtsp_username is not None:
        setting.rtsp_username = payload.rtsp_username
    if payload.rtsp_password and payload.rtsp_password != "********":
        setting.rtsp_password = payload.rtsp_password

    db.commit()
    return {"message": "Headcount settings updated successfully."}


@router.post("/headcount/run")
def trigger_headcount_run(
    session_id: Optional[int] = None,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Manually triggers an instantaneous headcount execution.
    (Step 6 wires the live camera frame count; count is evaluated against RFID swipes).
    """
    active_session = None
    if session_id:
        active_session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not active_session:
        active_session = (
            db.query(AttendanceSession)
            .filter(AttendanceSession.teacher_id == teacher.id, AttendanceSession.status == SessionStatus.ACTIVE)
            .first()
        )

    if not active_session:
        raise HTTPException(status_code=400, detail="Cannot run headcount: No active attendance session.")

    rfid_swipes = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == active_session.id, AttendanceRecord.status == AttendanceStatus.PRESENT)
        .count()
    )

    # For Step 2 foundation, detected matches or notes
    detected = rfid_swipes
    status_hc = "MATCH"

    now = datetime.now(timezone.utc)
    record = HeadcountRecord(
        session_id=active_session.id,
        timestamp=now,
        detected_count=detected,
        expected_count=rfid_swipes,
        status=status_hc,
        is_archived=False,
    )
    db.add(record)
    db.commit()

    return {
        "message": "Headcount executed successfully.",
        "session_id": active_session.id,
        "headcount_detected": detected,
        "rfid_swipes_count": rfid_swipes,
        "status": status_hc,
        "timestamp": now.isoformat(),
    }


@router.get("/headcount/history")
def get_headcount_history(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieves history of headcount snapshots and runs."""
    records = db.query(HeadcountRecord).order_by(HeadcountRecord.timestamp.desc()).limit(20).all()
    return [
        {
            "id": h.id,
            "session_id": h.session_id,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None,
            "detected_count": h.detected_count,
            "expected_count": h.expected_count,
            "status": h.status.value,
        }
        for h in records
    ]


# -------------------------------------------------------------
# 5. Verification Review
# -------------------------------------------------------------
@router.post("/verification/review")
def review_verification_log(
    payload: VerificationReviewRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Submits teacher review notes on a verification discrepancy log."""
    log = db.query(VerificationLog).filter(VerificationLog.id == payload.log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Verification log not found.")

    log.review_status = ReviewStatus(payload.review_status)
    log.reviewer_notes = payload.reviewer_notes
    log.reviewed_by_user_id = teacher.user_id
    db.commit()

    return {"message": "Verification discrepancy reviewed successfully.", "log_id": log.id}


# -------------------------------------------------------------
# 6. Reports (Copy & CSV Export)
# -------------------------------------------------------------
@router.get("/reports/copy")
def copy_attendance_report(
    session_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Formats attendance for direct 1-click clipboard copying."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    lines = [
        f"Session Attendance: {session.class_obj.name if session.class_obj else 'Class'} - {session.subject.name if session.subject else 'Subject'}",
        f"Date: {session.start_time.strftime('%Y-%m-%d %H:%M')}",
        "Roll No\tName\tStatus\tTime",
    ]
    for r in records:
        stu = r.student
        t_str = r.timestamp.strftime("%H:%M:%S") if r.timestamp else "-"
        lines.append(f"{stu.roll_no if stu else '-'}\t{stu.name if stu else '-'}\t{r.status.value}\t{t_str}")

    return {"report_text": "\n".join(lines)}


@router.get("/reports/csv", response_class=PlainTextResponse)
def export_attendance_csv(
    session_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Exports session attendance as downloadable CSV."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    lines = ["Roll No,Student ID,Name,Status,Verification,Scan Method,Timestamp"]
    for r in records:
        stu = r.student
        t_str = r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else ""
        lines.append(f"{stu.roll_no if stu else ''},{stu.student_id if stu else ''},{stu.name if stu else ''},{r.status.value},{r.verification_status.value},{r.scan_method.value},{t_str}")

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_session_{session_id}.csv"}
    )


# -------------------------------------------------------------
# 7. Teacher Profile
# -------------------------------------------------------------
@router.get("/teacher/profile")
def get_teacher_profile(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns the authenticated teacher's profile details."""
    return {
        "id": teacher.id,
        "employee_id": teacher.employee_id,
        "name": teacher.name,
        "department": teacher.department,
        "email": teacher.user.email if teacher.user else f"{teacher.employee_id.lower()}@university.edu",
        "designation": "Assistant Professor",
    }


# -------------------------------------------------------------
# 8. Classes & Subjects (for session start dropdowns)
# -------------------------------------------------------------
@router.get("/teacher/classes")
def get_all_classes(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns all active classes for session start dropdown."""
    classes = db.query(Class).filter(Class.is_active == True).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "department": c.department,
            "semester": c.semester,
            "section": c.section,
        }
        for c in classes
    ]


@router.get("/teacher/subjects")
def get_all_subjects(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns all active subjects for session start dropdown."""
    subjects = db.query(Subject).filter(Subject.is_active == True).all()
    return [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "department": s.department,
            "semester": s.semester,
        }
        for s in subjects
    ]


# -------------------------------------------------------------
# 9. All Sessions (for reports dropdown)
# -------------------------------------------------------------
@router.get("/sessions/all")
def get_all_sessions(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns all sessions created by this teacher, newest first."""
    sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.teacher_id == teacher.id)
        .order_by(AttendanceSession.start_time.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "class_name": s.class_obj.name if s.class_obj else "Unknown",
            "subject_name": s.subject.name if s.subject else "Unknown",
            "subject_code": s.subject.code if s.subject else "",
            "room_no": s.room_no,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "status": s.status.value,
        }
        for s in sessions
    ]


# -------------------------------------------------------------
# 10. End Session
# -------------------------------------------------------------
@router.post("/sessions/{session_id}/end")
def end_session(
    session_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Marks the given session as COMPLETED."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="You do not own this session.")
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Session is not active.")

    session.status = SessionStatus.COMPLETED
    session.end_time = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Session ended successfully.", "session_id": session_id}


# -------------------------------------------------------------
# 11. Verification Logs
# -------------------------------------------------------------
@router.get("/verification/logs")
def get_verification_logs(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns all verification discrepancy logs, newest first."""
    logs = (
        db.query(VerificationLog)
        .order_by(VerificationLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "headcount_record_id": log.headcount_record_id,
            "discrepancy_type": log.discrepancy_type.value if log.discrepancy_type else None,
            "severity": log.severity.value if log.severity else None,
            "rfid_count": log.rfid_count,
            "camera_count": log.camera_count,
            "discrepancy_count": log.discrepancy_count,
            "review_status": log.review_status.value if log.review_status else "PENDING",
            "reviewer_notes": log.reviewer_notes,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


# -------------------------------------------------------------
# 12. Student Issue Requests (teacher view)
# -------------------------------------------------------------
@router.get("/teacher/issues")
def get_all_student_issues(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Returns all student issue/dispute requests for teacher review."""
    issues = (
        db.query(AttendanceIssueRequest)
        .order_by(AttendanceIssueRequest.created_at.desc())
        .all()
    )
    result = []
    for iss in issues:
        stu = iss.student
        result.append({
            "id": iss.id,
            "student_name": stu.name if stu else "Unknown",
            "roll_no": stu.roll_no if stu else "N/A",
            "session_id": iss.session_id,
            "issue_type": iss.issue_type,
            "description": iss.description,
            "status": iss.status,
            "teacher_remarks": iss.teacher_remarks,
            "created_at": iss.created_at.isoformat() if iss.created_at else None,
            "resolved_at": iss.resolved_at.isoformat() if iss.resolved_at else None,
        })
    return result


@router.post("/teacher/issues/resolve")
def resolve_student_issue(
    payload: IssueResolveRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Teacher resolves or updates a student issue request."""
    issue = db.query(AttendanceIssueRequest).filter(AttendanceIssueRequest.id == payload.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue request not found.")

    issue.status = payload.new_status
    issue.teacher_remarks = payload.teacher_remarks
    if payload.new_status in ("APPROVED", "REJECTED"):
        issue.resolved_at = datetime.now(timezone.utc)

    db.commit()
    return {"message": f"Issue #{payload.issue_id} updated to {payload.new_status}."}
