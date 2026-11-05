from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminBootstrapRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    secret: str = Field(min_length=1, max_length=256)
    name: str = Field(default="System Admin", min_length=2, max_length=120)


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AdminOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class AdminOverviewOut(BaseModel):
    total_users: int
    fully_registered_users: int
    total_admins: int
    total_tryons: int
    total_recommendations: int
    total_saved_tryons: int
    total_wardrobe_items: int
    total_revenue: float
    monthly_revenue: float
    yearly_revenue: float
    monthly_chart: list[dict]
    yearly_chart: list[dict]
    subscription_distribution: list[dict]

__all__ = [
    "AdminAuthResponse",
    "AdminBootstrapRequest",
    "AdminLoginRequest",
    "AdminOut",
    "AdminOverviewOut",
]
