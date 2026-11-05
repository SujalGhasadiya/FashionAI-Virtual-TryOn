from pydantic import BaseModel, EmailStr, Field


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]+$")


class OTPResponse(BaseModel):
    success: bool
    message: str


__all__ = ["SendOTPRequest", "VerifyOTPRequest", "OTPResponse"]
