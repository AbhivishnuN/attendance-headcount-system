import sys
import os
import csv
import argparse
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path so app modules can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.session import Base, engine, SessionLocal
from app.models import (
    RoleEnum,
    SessionStatus,
    AttendanceStatus,
    VerificationStatus,
    ScanMethod,
    CameraType,
    User,
    Student,
    Teacher,
    Class,
    Subject,
    Timetable,
    AttendanceSession,
    AttendanceRecord,
    TeacherSessionRecord,
    HeadcountTimerSetting,
)
from app.services.security import hash_password


def ensure_tables():
    """Ensure all database tables exist."""
    print(" Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)


def seed_teachers_from_csv(db, csv_path: str):
    print(f" Importing teachers from CSV: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"  Warning: CSV not found at {csv_path}")
        return []

    created_teachers = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            emp_id = row.get("employee_id", "").strip()
            name = row.get("name", "").strip()
            dept = row.get("department", "").strip()
            email = row.get("email", "").strip() or f"{emp_id.lower()}@college.edu"
            password = row.get("password", "").strip() or "Teacher@123"

            if not emp_id or not name:
                continue

            # Check if user already exists
            user = db.query(User).filter(User.username == emp_id.lower()).first()
            if not user:
                user = User(
                    username=emp_id.lower(),
                    email=email,
                    hashed_password=hash_password(password),
                    role=RoleEnum.TEACHER,
                    is_active=True,
                )
                db.add(user)
                db.flush()

            # Check teacher profile
            teacher = db.query(Teacher).filter(Teacher.employee_id == emp_id).first()
            if not teacher:
                teacher = Teacher(
                    user_id=user.id,
                    employee_id=emp_id,
                    name=name,
                    department=dept,
                    is_active=True,
                )
                db.add(teacher)
                db.flush()
                created_teachers.append(teacher)

    db.commit()
    print(f"   Successfully processed {len(created_teachers)} new teachers.")
    return created_teachers


def seed_students_from_csv(db, csv_path: str):
    print(f" Importing students from CSV: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"  Warning: CSV not found at {csv_path}")
        return []

    created_students = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            roll_no = row.get("roll_no", "").strip()
            student_id = row.get("student_id", "").strip()
            name = row.get("name", "").strip()
            dept = row.get("department", "").strip()
            semester_str = row.get("semester", "6").strip()
            section = row.get("section", "A").strip()
            password = row.get("password", "").strip() or "Student@123"

            try:
                semester = int(semester_str)
            except ValueError:
                semester = 6

            if not roll_no or not student_id or not name:
                continue

            # Ensure class exists (e.g., "CSE-6A")
            class_name = f"{dept}-{semester}{section}"
            cls = (
                db.query(Class)
                .filter(
                    Class.department == dept,
                    Class.semester == semester,
                    Class.section == section,
                )
                .first()
            )
            if not cls:
                cls = Class(
                    name=class_name,
                    department=dept,
                    semester=semester,
                    section=section,
                    is_active=True,
                )
                db.add(cls)
                db.flush()

            # Ensure user account exists
            user = db.query(User).filter(User.username == roll_no.lower()).first()
            if not user:
                user = User(
                    username=roll_no.lower(),
                    email=f"{roll_no.lower()}@college.edu",
                    hashed_password=hash_password(password),
                    role=RoleEnum.STUDENT,
                    is_active=True,
                )
                db.add(user)
                db.flush()

            # Ensure student profile exists
            student = db.query(Student).filter(Student.roll_no == roll_no).first()
            if not student:
                student = Student(
                    user_id=user.id,
                    roll_no=roll_no,
                    student_id=student_id,
                    name=name,
                    department=dept,
                    semester=semester,
                    section=section,
                    class_id=cls.id,
                    is_active=True,
                )
                db.add(student)
                db.flush()
                created_students.append(student)

    db.commit()
    print(f"   Successfully processed {len(created_students)} new students.")
    return created_students


def seed_subjects_and_timetable(db):
    print(" Seeding default subjects and timetable...")
    # Default Classes (CSE A through CSE L)
    default_classes = [
        ("CSE A", "A"),
        ("CSE B", "B"),
        ("CSE C", "C"),
        ("CSE D", "D"),
        ("CSE E", "E"),
        ("CSE F", "F"),
        ("CSE G", "G"),
        ("CSE H", "H"),
        ("CSE I", "I"),
        ("CSE J", "J"),
        ("CSE K", "K"),
        ("CSE L", "L"),
    ]
    for name, sec in default_classes:
        c = db.query(Class).filter(Class.name == name).first()
        if not c:
            c = Class(name=name, department="CSE", semester=3, section=sec, is_active=True)
            db.add(c)

    subjects_data = [
        ("1BITMA301", "Mathematics-III for IT Stream", "CSE", 3),
        ("1BCSDS302", "Data Structures", "CSE", 3),
        ("1BCSOS303", "Operating System", "CSE", 3),
        ("1BCSCO304", "Computer Organization", "CSE", 3),
        ("1BCSDL305", "Data Structures Laboratory", "CSE", 3),
        ("1BCSEL306", "Embedded IoT Laboratory", "CSE", 3),
        ("1BCSOO307", "Object Oriented Programming with Java", "CSE", 3),
        ("1BUHVK308", "Universal Human Values", "CSE", 3),
        ("MNC1BNSSK301 / 1BNCCK301 / 1BPHEK301", "NSS / NCC / Physical Education (PE)", "CSE", 3),
        ("IBMADS301", "Additional Mathematics / Bridge Course", "CSE", 3),
        ("YOGA", "Yoga", "CSE", 3),
    ]

    for code, name, dept, sem in subjects_data:
        sub = db.query(Subject).filter(Subject.code == code).first()
        if not sub:
            sub = Subject(code=code, name=name, department=dept, semester=sem, is_active=True)
            db.add(sub)
    db.commit()

    teacher = db.query(Teacher).first()
    cls = db.query(Class).first()
    sub_iot = db.query(Subject).filter(Subject.code == "CS601").first()

    if teacher and cls and sub_iot:
        tt = db.query(Timetable).filter(
            Timetable.class_id == cls.id,
            Timetable.subject_id == sub_iot.id,
            Timetable.day_of_week == "Monday",
        ).first()
        if not tt:
            tt = Timetable(
                class_id=cls.id,
                subject_id=sub_iot.id,
                teacher_id=teacher.id,
                day_of_week="Monday",
                start_time="09:00",
                end_time="10:00",
                room_no="Lab-IoT-1",
                is_active=True,
            )
            db.add(tt)
            db.commit()
            print("   Timetable schedule configured.")


def seed_default_headcount_settings(db):
    print(" Configuring default Headcount & Camera settings...")
    setting = db.query(HeadcountTimerSetting).filter(HeadcountTimerSetting.session_id == None).first()
    if not setting:
        setting = HeadcountTimerSetting(
            session_id=None,
            interval_minutes=15,
            is_enabled=True,
            camera_source="0",  # Default laptop webcam
            camera_type=CameraType.WEBCAM,
        )
        db.add(setting)
        db.commit()
        print("   Headcount timer default created (Interval: 15 min, Camera: Webcam 0).")


def seed_sample_sessions_and_attendance(db):
    print(" Creating initial sample attendance sessions for immediate testing...")
    teacher = db.query(Teacher).first()
    cls = db.query(Class).first()
    sub = db.query(Subject).filter(Subject.code == "CS601").first()
    students = db.query(Student).filter(Student.class_id == cls.id).all() if cls else []

    if not (teacher and cls and sub and students):
        print("  Skipping sample session creation: missing dependencies.")
        return

    # 1. Past completed session (Yesterday)
    past_start = datetime.now(timezone.utc) - timedelta(days=1, hours=2)
    past_end = past_start + timedelta(hours=1)
    past_session = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceSession.status == SessionStatus.COMPLETED
    ).first()

    if not past_session:
        past_session = AttendanceSession(
            class_id=cls.id,
            subject_id=sub.id,
            teacher_id=teacher.id,
            start_time=past_start,
            end_time=past_end,
            status=SessionStatus.COMPLETED,
            room_no="Lab-IoT-1",
            is_archived=False,
            created_at=past_start,
        )
        db.add(past_session)
        db.flush()

        # Teacher record for past session
        t_record = TeacherSessionRecord(
            session_id=past_session.id,
            teacher_id=teacher.id,
            check_in_time=past_start,
            check_out_time=past_end,
            is_archived=False,
            created_at=past_start,
        )
        db.add(t_record)

        # Mark first 80% students present, rest absent
        for idx, student in enumerate(students):
            is_present = idx < int(len(students) * 0.8)
            status = AttendanceStatus.PRESENT if is_present else AttendanceStatus.ABSENT
            rec = AttendanceRecord(
                session_id=past_session.id,
                student_id=student.id,
                timestamp=past_start + timedelta(minutes=idx * 2),
                status=status,
                verification_status=VerificationStatus.VERIFIED if is_present else VerificationStatus.PENDING,
                scan_method=ScanMethod.RFID_CARD if is_present else ScanMethod.MANUAL_OVERRIDE,
                is_archived=False,
                created_at=past_start,
            )
            db.add(rec)
        db.commit()
        print("   Created completed sample session with realistic student attendance records.")

    # 2. Active Session for live testing
    active_session = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceSession.status == SessionStatus.ACTIVE
    ).first()

    if not active_session:
        now = datetime.now(timezone.utc)
        active_session = AttendanceSession(
            class_id=cls.id,
            subject_id=sub.id,
            teacher_id=teacher.id,
            start_time=now,
            status=SessionStatus.ACTIVE,
            room_no="Lab-IoT-1",
            is_archived=False,
        )
        db.add(active_session)
        db.flush()

        t_record = TeacherSessionRecord(
            session_id=active_session.id,
            teacher_id=teacher.id,
            check_in_time=now,
            is_archived=False,
        )
        db.add(t_record)

        # Pre-seed 3 scanned students in this active session
        for i in range(min(3, len(students))):
            rec = AttendanceRecord(
                session_id=active_session.id,
                student_id=students[i].id,
                timestamp=now + timedelta(seconds=i * 15),
                status=AttendanceStatus.PRESENT,
                verification_status=VerificationStatus.VERIFIED,
                scan_method=ScanMethod.RFID_CARD,
                is_archived=False,
            )
            db.add(rec)
        db.commit()
        print(f"   Created LIVE Active Session ID #{active_session.id} ready for instant scanning!")


def print_summary(db):
    print("\n" + "=" * 65)
    print(" DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 65)
    
    teachers = db.query(Teacher).all()
    students = db.query(Student).all()
    classes = db.query(Class).all()
    subjects = db.query(Subject).all()
    sessions = db.query(AttendanceSession).all()

    print(f" Total Classes:    {len(classes)}")
    print(f" Total Subjects:   {len(subjects)}")
    print(f" Total Teachers:   {len(teachers)}")
    print(f" Total Students:   {len(students)}")
    print(f" Total Sessions:   {len(sessions)}")
    
    print("\n SAMPLE LOGIN CREDENTIALS:")
    print("-" * 65)
    if teachers:
        t = teachers[0]
        print(f" [TEACHER] Username: {t.employee_id.lower()} | Password: Teacher@123")
        print(f"            Name:     {t.name} ({t.employee_id})")
    if students:
        s = students[0]
        print(f" [STUDENT] Username: {s.roll_no.lower()}     | Password: Student@123")
        print(f"            Name:     {s.name} ({s.roll_no})")
        print(f"            RFID ID:  {s.student_id}")
    print("=" * 65 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Seed Database for Smart Attendance Management System")
    parser.add_argument("--students-csv", default=os.path.join(current_dir, "students_sample.csv"), help="Path to students CSV file")
    parser.add_argument("--teachers-csv", default=os.path.join(current_dir, "teachers_sample.csv"), help="Path to teachers CSV file")
    args = parser.parse_args()

    ensure_tables()
    db = SessionLocal()
    try:
        seed_teachers_from_csv(db, args.teachers_csv)
        seed_students_from_csv(db, args.students_csv)
        seed_subjects_and_timetable(db)
        seed_default_headcount_settings(db)
        seed_sample_sessions_and_attendance(db)
        print_summary(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
