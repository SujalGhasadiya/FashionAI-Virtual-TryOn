from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    profile_photo_url: str | None = None
    gender_preference: str | None = None
    bio: str | None = None
    subscription_plan: str = "free"
    has_used_free_plan: bool = False
    is_fully_registered: bool
    wardrobe_limit: int = 0
    wardrobe_used: int = 0
    wardrobe_remaining: int = 0
    tryon_daily_limit: Optional[int] = None
    tryons_used_today: int = 0
    remaining_tryons_today: Optional[int] = None
    recommendation_daily_limit: Optional[int] = None
    recommendations_used_today: int = 0
    remaining_recommendations_today: Optional[int] = None
    saved_tryon_monthly_limit: int = 0
    saved_tryons_used_this_month: int = 0
    remaining_saved_tryons_this_month: int = 0
    subscription_started_at: datetime | None = None
    subscription_cycle_start: datetime | None = None
    subscription_cycle_end: datetime | None = None
    subscription_expires_at: datetime | None = None
    is_subscription_expired: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    gender_preference: str | None = None
    bio: str | None = Field(default=None, max_length=500)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
    confirm_new_password: str = Field(min_length=6, max_length=128)


class SubscriptionPlanOut(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    price_inr: float = 0.0
    wardrobe_limit: int
    tryon_daily_limit: int
    recommendation_daily_limit: Optional[int] = None
    saved_tryon_monthly_limit: int
    is_default: bool = False
    active: bool = True

    class Config:
        from_attributes = True

__all__ = ["PasswordChangeRequest", "SubscriptionPlanOut", "UserProfile", "UserUpdateRequest"]
