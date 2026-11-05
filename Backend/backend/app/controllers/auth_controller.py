from fastapi import HTTPException, UploadFile
from pymongo.database import Database

from app.core.config import settings
from app.database.models import EMAIL_VERIFICATIONS
from app.database.repositories.admin_repository import get_admin_by_email
from app.database.repositories.user_repository import get_user, get_user_by_email
from app.database.repositories.session_repository import (
    create_session,
    invalidate_all_user_sessions,
)
from app.schemas import AuthResponse, LoginRequest, RegisterStepOneRequest
from app.services.auth_service import create_access_token, get_password_hash, verify_password
from app.services.storage_service import absolute_to_media_url, create_profile_photo_path, save_upload_file
from app.services.cloudinary_service import upload_to_cloudinary
from app.services.subscription_service import DEFAULT_SUBSCRIPTION_PLAN
from app.utils.helpers import serialize_document, utcnow


def register_step_one(payload: RegisterStepOneRequest, db: Database) -> AuthResponse:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    email = payload.email.lower()
    if get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Check if email has been verified via OTP
    otp_record = db[EMAIL_VERIFICATIONS].find_one({"email": email})
    if not otp_record or not otp_record.get("is_verified"):
        raise HTTPException(
            status_code=400,
            detail="Email must be verified before registration. Please verify your email first.",
        )

    now = utcnow()
    user = {
        "name": payload.name,
        "email": email,
        "hashed_password": get_password_hash(payload.password),
        "profile_photo_url": None,
        "gender_preference": None,
        "subscription_plan": DEFAULT_SUBSCRIPTION_PLAN,
        "has_used_free_plan": True,
        "is_fully_registered": False,
        "subscription_started_at": now,
        "created_at": now,
        "updated_at": now,
    }
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    db_user = get_user(db, str(user["_id"]))
    
    # Create session for newly registered user
    session = create_session(
        db,
        str(user["_id"]),
        email,
        "user"
    )
    
    token = create_access_token({
        "email": db_user["email"],
        "kind": "user",
        "session_id": session["session_id"]
    })
    return AuthResponse(access_token=token, kind="user", user=serialize_document(db_user))


def register_step_two(gender_preference: str, photo: UploadFile, current_user: dict, db: Database) -> dict:
    if gender_preference not in {"male", "female", "other"}:
        raise HTTPException(status_code=400, detail="Gender preference must be male, female, or other")

    # Upload profile photo to Cloudinary
    profile_photo_url = upload_to_cloudinary(photo.file, folder=f"profiles/{current_user['_id']}")

    db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "gender_preference": gender_preference,
                "profile_photo_url": profile_photo_url,
                "is_fully_registered": True,
                "updated_at": utcnow(),
            }
        },
    )
    updated_user = get_user(db, str(current_user["_id"]))
    return serialize_document(updated_user)


def login(payload: LoginRequest, db: Database, ip_address: str = None, user_agent: str = None) -> AuthResponse:
    """
    Login endpoint with single-session enforcement.
    
    - Validates credentials
    - Invalidates all previous sessions for the user
    - Creates a new session
    - Returns JWT token with session_id embedded
    
    Args:
        payload: Login request with email and password
        db: MongoDB database instance
        ip_address: Client IP address (optional)
        user_agent: Client user agent (optional)
        
    Returns:
        AuthResponse with access token and user info
    """
    admin = get_admin_by_email(db, payload.email)
    if admin is not None:
        if not verify_password(payload.password, admin["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Single-session: Invalidate all previous admin sessions
        invalidated_count = invalidate_all_user_sessions(db, str(admin["_id"]))
        
        # Create new session for admin
        session = create_session(
            db,
            str(admin["_id"]),
            admin["email"],
            "admin",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        token = create_access_token({
            "email": admin["email"],
            "kind": "admin",
            "session_id": session["session_id"]
        })
        return AuthResponse(
            access_token=token,
            kind="admin",
            admin=serialize_document(admin),
            invalidated_sessions=invalidated_count,
        )

    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Single-session: Invalidate all previous user sessions
    invalidated_count = invalidate_all_user_sessions(db, str(user["_id"]))
    
    # Create new session for user
    session = create_session(
        db,
        str(user["_id"]),
        user["email"],
        "user",
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    token = create_access_token({
        "email": user["email"],
        "kind": "user",
        "session_id": session["session_id"]
    })
    return AuthResponse(
        access_token=token,
        kind="user",
        user=serialize_document(user),
        invalidated_sessions=invalidated_count,
    )

__all__ = ["login", "register_step_one", "register_step_two"]
