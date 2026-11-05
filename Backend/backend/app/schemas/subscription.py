from pydantic import BaseModel, Field


class SubscriptionPlanOut(BaseModel):
    code: str
    name: str
    description: str | None = None
    price_inr: float = Field(default=0.0, ge=0)
    wardrobe_limit: int | None = Field(default=None, ge=0)
    tryon_daily_limit: int | None = Field(default=None, ge=0)
    recommendation_daily_limit: int | None = Field(default=None, ge=0)
    saved_tryon_monthly_limit: int | None = Field(default=None, ge=0)
    is_default: bool = False
    active: bool = True


class SubscriptionPlanCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    price_inr: float = Field(default=0.0, ge=0)
    wardrobe_limit: int | None = Field(default=None, ge=0)
    tryon_daily_limit: int | None = Field(default=None, ge=0)
    recommendation_daily_limit: int | None = Field(default=None, ge=0)
    saved_tryon_monthly_limit: int | None = Field(default=None, ge=0)
    is_default: bool = False
    active: bool = True


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    price_inr: float | None = Field(default=None, ge=0)
    description: str | None = None
    wardrobe_limit: int | None = Field(default=None, ge=0)
    tryon_daily_limit: int | None = Field(default=None, ge=0)
    recommendation_daily_limit: int | None = Field(default=None, ge=0)
    saved_tryon_monthly_limit: int | None = Field(default=None, ge=0)
    is_default: bool | None = None
    active: bool | None = None


__all__ = ["SubscriptionPlanOut"]