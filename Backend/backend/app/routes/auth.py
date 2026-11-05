from fastapi import APIRouter, Depends, File, Form, UploadFile, status, Request
from pymongo.database import Database

from app.controllers.auth_controller import login, register_step_one, register_step_two
from app.controllers.otp_controller import send_otp, verify_otp
from app.controllers.otp_controller import (
    send_password_reset_otp,
    verify_password_reset_otp,
    reset_password_with_token,
)
from app.core.deps import get_current_active_user, oauth2_scheme
from app.database.connection import get_db
from app.schemas import AuthResponse, LoginRequest, RegisterStepOneRequest, UserProfile
from app.schemas.otp import SendOTPRequest, VerifyOTPRequest, OTPResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/step-1", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_step_one_route(payload: RegisterStepOneRequest, db: Database = Depends(get_db)):
    return register_step_one(payload, db)


@router.post("/register/step-2", response_model=UserProfile)
async def register_step_two_route(
    gender_preference: str = Form(...),
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return register_step_two(gender_preference, photo, current_user, db)


@router.post("/login", response_model=AuthResponse)
def login_route(
    payload: LoginRequest,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Login endpoint with single-session enforcement.
    Invalidates all previous sessions for the user and creates a new one.
    """
    # Extract client IP address (handles X-Forwarded-For proxy header)
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    
    # Extract user agent
    user_agent = request.headers.get("user-agent")
    
    return login(payload, db, ip_address=ip_address, user_agent=user_agent)


@router.post("/logout", response_model=dict)
def logout_route(
    current_user: dict = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme),
    db: Database = Depends(get_db)
):
    """
    Logout endpoint that invalidates the current session.
    
    This implements single-session enforcement by:
    - Marking the current session as inactive
    - Forcing the client to clear their token
    - Preventing further API calls with this token
    """
    from app.controllers.logout_controller import logout
    return logout(token, db)


@router.post("/send-otp", response_model=OTPResponse)
async def send_otp_route(request: SendOTPRequest) -> OTPResponse:
    """Send OTP verification code to email."""
    result = await send_otp(request.email)
    return OTPResponse(success=result["success"], message=result["message"])


@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp_route(request: VerifyOTPRequest) -> OTPResponse:
    """Verify OTP code for email verification."""
    result = await verify_otp(request.email, request.otp_code)
    return OTPResponse(success=result["success"], message=result["message"])


# Password reset flow
from app.schemas.password_reset import (
    SendPasswordResetRequest,
    VerifyPasswordResetRequest,
    ResetPasswordRequest,
    PasswordResetVerifyResponse,
    GenericResponse,
)


@router.post("/password-reset/send", response_model=GenericResponse)
async def password_reset_send_route(request: SendPasswordResetRequest) -> GenericResponse:
    result = await send_password_reset_otp(request.email)
    return GenericResponse(success=result["success"], message=result["message"])


@router.post("/password-reset/verify", response_model=PasswordResetVerifyResponse)
async def password_reset_verify_route(request: VerifyPasswordResetRequest) -> PasswordResetVerifyResponse:
    result = await verify_password_reset_otp(request.email, request.otp_code)
    return PasswordResetVerifyResponse(success=result["success"], message=result["message"], reset_token=result.get("reset_token"))


@router.post("/password-reset/reset", response_model=GenericResponse)
def password_reset_reset_route(request: ResetPasswordRequest) -> GenericResponse:
    result = reset_password_with_token(request.reset_token, request.new_password)
    return GenericResponse(success=result["success"], message=result["message"])

__all__ = ["router"]
