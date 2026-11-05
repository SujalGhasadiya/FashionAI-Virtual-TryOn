from pydantic import BaseModel, EmailStr, Field

from app.schemas.admin import AdminOut
from app.schemas.user import UserProfile


class TokenData(BaseModel):
    email: str | None = None
    kind: str | None = None
    session_id: str | None = None  # Session ID for single-session enforcement


class RegisterStepOneRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    kind: str = "user"
    user: UserProfile | None = None
    admin: AdminOut | None = None
    invalidated_sessions: int = 0

__all__ = ["AuthResponse", "LoginRequest", "RegisterStepOneRequest", "TokenData"]
