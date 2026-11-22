from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Student, AttendanceRecord, AttendanceSession, Subject, AttendanceIssueRequest, IssueStatus
from app.services.auth_dependencies import get_current_student

router = APIRouter(prefix="/student", tags=["Student Portal (Read-Only)"])


class IssueCreateRequest(BaseModel):
    session_id: Optional[int] = None
    issue_type: str
    description: str


@router.get("/profile")
def get_student_profile(student: Student = Depends(get_current_student)):
    """Returns student profile (own data only)."""
    return {
        "id": student.id,
        "roll_no": student.roll_no,
        "student_id": student.student_id,
        "name": student.name,
        "department": student.department,
        "semester": student.semester,
        "section": student.section,
        "class_name": student.class_obj.name if student.class_obj else None,
    }


@router.get("/attendance")
def get_student_attendance(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Returns attendance history for the authenticated student only."""
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceRecord.timestamp.desc())
        .all()
    )

    history = []
    for r in records:
        session = r.session
        sub_name = session.subject.name if session and session.subject else "General"
        sub_code = session.subject.code if session and session.subject else "N/A"
        teacher_name = session.teacher.name if session and session.teacher else "Instructor"
        history.append({
            "record_id": r.id,
            "session_id": r.session_id,
            "subject_code": sub_code,
            "subject_name": sub_name,
            "teacher_name": teacher_name,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "status": r.status.value,
            "verification_status": r.verification_status.value,
            "scan_method": r.scan_method.value,
        })

    return {"student_id": student.id, "roll_no": student.roll_no, "records": history}


@router.get("/summary")
def get_student_summary(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Calculates overall and subject-wise attendance percentages for the student."""
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
    total_classes = len(records)
    present_classes = sum(1 for r in records if r.status.value == "PRESENT")
    overall_percentage = round((present_classes / total_classes * 100), 1) if total_classes > 0 else 100.0

    # Subject-wise calculation
    subject_map = {}
    for r in records:
        if not r.session or not r.session.subject:
            continue
        code = r.session.subject.code
        name = r.session.subject.name
        if code not in subject_map:
            subject_map[code] = {"code": code, "name": name, "total": 0, "present": 0}
        subject_map[code]["total"] += 1
        if r.status.value == "PRESENT":
            subject_map[code]["present"] += 1

    subject_wise = []
    for code, data in subject_map.items():
        pct = round((data["present"] / data["total"] * 100), 1) if data["total"] > 0 else 0.0
        subject_wise.append({
            "subject_code": data["code"],
            "subject_name": data["name"],
            "total_sessions": data["total"],
            "present_sessions": data["present"],
            "percentage": pct,
        })

    return {
        "overall_percentage": overall_percentage,
        "total_classes": total_classes,
        "present_classes": present_classes,
        "absent_classes": total_classes - present_classes,
        "subject_wise": subject_wise,
    }


@router.get("/issues")
def get_student_issues(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Lists discrepancy and issue requests submitted by the student."""
    issues = (
        db.query(AttendanceIssueRequest)
        .filter(AttendanceIssueRequest.student_id == student.id)
        .order_by(AttendanceIssueRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": i.id,
            "session_id": i.session_id,
            "issue_type": i.issue_type,
            "description": i.description,
            "status": i.status.value,
            "teacher_remarks": i.teacher_remarks,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        }
        for i in issues
    ]


@router.post("/issues", status_code=status.HTTP_201_CREATED)
def submit_student_issue(
    payload: IssueCreateRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Submits a discrepancy dispute / attendance request to teacher."""
    issue = AttendanceIssueRequest(
        student_id=student.id,
        session_id=payload.session_id,
        issue_type=payload.issue_type,
        description=payload.description,
        status=IssueStatus.PENDING,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return {
        "message": "Issue request submitted successfully.",
        "issue_id": issue.id,
        "status": issue.status.value,
    }
