import os
import sys
from pathlib import Path

# Set up paths
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.session import SessionLocal
from app.models.models import Class, Subject

classes_data = [
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

subjects_data = [
    ("1BITMA301", "Mathematics-III for IT Stream"),
    ("1BCSDS302", "Data Structures"),
    ("1BCSOS303", "Operating System"),
    ("1BCSCO304", "Computer Organization"),
    ("1BCSDL305", "Data Structures Laboratory"),
    ("1BCSEL306", "Embedded IoT Laboratory"),
    ("1BCSOO307", "Object Oriented Programming with Java"),
    ("1BUHVK308", "Universal Human Values"),
    ("MNC1BNSSK301 / 1BNCCK301 / 1BPHEK301", "NSS / NCC / Physical Education (PE)"),
    ("IBMADS301", "Additional Mathematics / Bridge Course"),
    ("YOGA", "Yoga"),
]

def update_db():
    db = SessionLocal()
    try:
        print("--- Adding Classes ---")
        for name, sec in classes_data:
            existing = db.query(Class).filter(Class.name == name).first()
            if not existing:
                cls_obj = Class(
                    name=name,
                    department="CSE",
                    semester=3,
                    section=sec,
                    is_active=True
                )
                db.add(cls_obj)
                print(f"Added Class: {name}")
            else:
                existing.is_active = True
                print(f"Class already exists: {name}")

        print("\n--- Adding Subjects ---")
        for code, name in subjects_data:
            existing = db.query(Subject).filter(Subject.code == code).first()
            if not existing:
                sub_obj = Subject(
                    code=code,
                    name=name,
                    department="CSE",
                    semester=3,
                    is_active=True
                )
                db.add(sub_obj)
                print(f"Added Subject: [{code}] {name}")
            else:
                existing.name = name
                existing.is_active = True
                print(f"Subject already exists, updated name: [{code}] {name}")

        db.commit()
        print("\nDatabase updated successfully!")

        all_c = db.query(Class).filter(Class.is_active == True).all()
        print(f"\nTotal Active Classes in DB: {len(all_c)}")
        for c in all_c:
            print(f"  ID {c.id}: {c.name}")

        all_s = db.query(Subject).filter(Subject.is_active == True).all()
        print(f"\nTotal Active Subjects in DB: {len(all_s)}")
        for s in all_s:
            print(f"  ID {s.id}: [{s.code}] {s.name}")

    finally:
        db.close()

if __name__ == "__main__":
    update_db()
