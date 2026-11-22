from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import (
    AttendanceSession,
    AttendanceRecord,
    TeacherSessionRecord,
    HeadcountRecord,
    VerificationLog
)


def archive_old_records(db: Session, days: int = 7) -> dict:
    """
    Archives records older than `days` days by setting `is_archived = True`.
    Never deletes any record from the database to maintain full audit history.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    archived_counts = {}

    # 1. Archive attendance sessions
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.created_at < cutoff_date,
        AttendanceSession.is_archived == False
    ).all()
    for s in sessions:
        s.is_archived = True
    archived_counts["sessions"] = len(sessions)

    # 2. Archive attendance records
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.created_at < cutoff_date,
        AttendanceRecord.is_archived == False
    ).all()
    for r in records:
        r.is_archived = True
    archived_counts["attendance_records"] = len(records)

    # 3. Archive teacher session records
    teacher_records = db.query(TeacherSessionRecord).filter(
        TeacherSessionRecord.created_at < cutoff_date,
        TeacherSessionRecord.is_archived == False
    ).all()
    for tr in teacher_records:
        tr.is_archived = True
    archived_counts["teacher_session_records"] = len(teacher_records)

    # 4. Archive headcount records
    headcounts = db.query(HeadcountRecord).filter(
        HeadcountRecord.created_at < cutoff_date,
        HeadcountRecord.is_archived == False
    ).all()
    for h in headcounts:
        h.is_archived = True
    archived_counts["headcount_records"] = len(headcounts)

    # 5. Archive verification logs
    logs = db.query(VerificationLog).filter(
        VerificationLog.created_at < cutoff_date,
        VerificationLog.is_archived == False
    ).all()
    for log in logs:
        log.is_archived = True
    archived_counts["verification_logs"] = len(logs)

    db.commit()
    return archived_counts
