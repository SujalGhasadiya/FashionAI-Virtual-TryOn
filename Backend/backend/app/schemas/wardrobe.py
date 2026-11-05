from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class WardrobeItemOut(BaseModel):
    id: str
    user_id: str
    type: str
    delete_status: str = "active"
    active_status: str = "active"
    image_url: str
    occasion: Optional[str] = None
    embedding_done: bool
    embedding_error: Optional[str] = None
    embedding_updated_at: Optional[datetime] = None
    wardrobe_limit: Optional[int] = None
    wardrobe_used: Optional[int] = None
    wardrobe_remaining: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WardrobeItemStatusUpdateRequest(BaseModel):
    active_status: Literal["active", "inactive"]


class WardrobeEmbeddingSyncOut(BaseModel):
    processed: int
    created: int
    existing: int
    failed: int
    failures: list[str]

__all__ = ["WardrobeEmbeddingSyncOut", "WardrobeItemOut"]
