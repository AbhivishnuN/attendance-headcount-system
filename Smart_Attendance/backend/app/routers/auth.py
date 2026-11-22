from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import User, Student, Teacher, RoleEnum
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.services.security import verify_password, create_access_token
from app.services.auth_dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with username and password.
    Returns signed JWT access token and user role profile.
    """
    username = payload.username.strip().lower()
    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently disabled.",
        )

    name = user.username
    identifier = user.username
    department = None
    class_name = None

    if user.role == RoleEnum.STUDENT and user.student_profile:
        stu = user.student_profile
        name = stu.name
        identifier = stu.roll_no
        department = stu.department
        if stu.class_obj:
            class_name = stu.class_obj.name
    elif user.role in [RoleEnum.TEACHER, RoleEnum.ADMIN] and user.teacher_profile:
        tch = user.teacher_profile
        name = tch.name
        identifier = tch.employee_id
        department = tch.department

    token_data = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.value,
        "name": name,
        "identifier": identifier,
    }
    access_token = create_access_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role.value,
        name=name,
        identifier=identifier,
        department=department,
        class_name=class_name,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the currently logged-in user profile, resolving role-specific details.
    """
    name = current_user.username
    identifier = current_user.username
    dept = None
    sem = None
    sec = None
    card_id = None

    if current_user.role == RoleEnum.STUDENT and current_user.student_profile:
        stu = current_user.student_profile
        name = stu.name
        identifier = stu.roll_no
        dept = stu.department
        sem = stu.semester
        sec = stu.section
        card_id = stu.student_id
    elif current_user.role in [RoleEnum.TEACHER, RoleEnum.ADMIN] and current_user.teacher_profile:
        tch = current_user.teacher_profile
        name = tch.name
        identifier = tch.employee_id
        dept = tch.department

    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value,
        is_active=current_user.is_active,
        name=name,
        identifier=identifier,
        department=dept,
        semester=sem,
        section=sec,
        student_id=card_id,
    )
