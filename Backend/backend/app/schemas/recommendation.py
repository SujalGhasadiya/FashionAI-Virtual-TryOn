from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.schemas.wardrobe import WardrobeItemOut


class RecommendationRequest(BaseModel):
    bottom_item_id: str
    occasion: Optional[str] = None
    suggestion_count: int = Field(default=3, ge=1, le=10)

    @validator("occasion")
    def normalize_occasion(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().lower()
        return cleaned or None


class RecommendationCandidate(BaseModel):
    top_item_id: str
    score: float
    top_item: WardrobeItemOut


class RecommendationResponse(BaseModel):
    recommendation_id: str
    subscription_plan: str = "free"
    remaining_recommendations_today: Optional[int] = None
    results: list[RecommendationCandidate]


class RecommendationHistoryOut(BaseModel):
    id: str
    user_id: str
    bottom_item_id: str
    occasion: str | None = None
    suggested_top_ids: list[str]
    created_at: datetime

    class Config:
        from_attributes = True

__all__ = [
    "RecommendationCandidate",
    "RecommendationHistoryOut",
    "RecommendationRequest",
    "RecommendationResponse",
]
