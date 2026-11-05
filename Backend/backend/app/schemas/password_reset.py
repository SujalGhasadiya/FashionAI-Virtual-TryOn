from pydantic import BaseModel, EmailStr, Field


class SendPasswordResetRequest(BaseModel):
    email: EmailStr


class VerifyPasswordResetRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]+$")


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)


class PasswordResetVerifyResponse(BaseModel):
    success: bool
    message: str
    reset_token: str | None = None


class GenericResponse(BaseModel):
    success: bool
    message: str


__all__ = [
    "SendPasswordResetRequest",
    "VerifyPasswordResetRequest",
    "ResetPasswordRequest",
    "PasswordResetVerifyResponse",
    "GenericResponse",
]
