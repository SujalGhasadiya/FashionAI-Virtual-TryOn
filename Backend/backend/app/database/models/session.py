"""
Session management models for single-session authentication.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Session(BaseModel):
    """Session document model for MongoDB"""
    user_id: str  # Reference to user ObjectId
    email: str
    session_id: str  # Unique session identifier
    kind: str  # "user" or "admin"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_active: bool = True
    last_activity: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "session_id": "sess_abc123def456",
                "kind": "user",
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0...",
                "created_at": "2026-05-17T10:00:00Z",
                "expires_at": "2026-05-17T11:00:00Z",
                "is_active": True,
                "last_activity": "2026-05-17T10:55:00Z"
            }
        }


__all__ = ["Session"]
