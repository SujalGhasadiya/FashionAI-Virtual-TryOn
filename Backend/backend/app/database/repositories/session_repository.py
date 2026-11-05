"""
Session repository for single-session authentication.
Handles all database operations related to sessions.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId
from pymongo.database import Database
import uuid


def create_session(
    db: Database,
    user_id: str,
    email: str,
    kind: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    expires_in_minutes: int = 10080
) -> dict:
    """
    Create a new session for a user.
    
    Args:
        db: MongoDB database instance
        user_id: User's ObjectId as string
        email: User's email
        kind: "user" or "admin"
        ip_address: Client's IP address
        user_agent: Client's user agent string
        expires_in_minutes: Session expiration time
        
    Returns:
        The created session document
    """
    session_id = f"sess_{uuid.uuid4().hex[:20]}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_in_minutes)
    
    session = {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "email": email,
        "session_id": session_id,
        "kind": kind,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": now,
        "expires_at": expires_at,
        "is_active": True,
        "last_activity": now
    }
    
    result = db.sessions.insert_one(session)
    session["_id"] = result.inserted_id
    return session


def invalidate_all_user_sessions(db: Database, user_id: str, exclude_session_id: Optional[str] = None) -> int:
    """
    Invalidate all active sessions for a user (for single-session enforcement).
    
    Args:
        db: MongoDB database instance
        user_id: User's ObjectId as string
        exclude_session_id: Optional session_id to keep active (for current login)
        
    Returns:
        Number of sessions invalidated
    """
    query = {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "is_active": True
    }
    
    if exclude_session_id:
        query["session_id"] = {"$ne": exclude_session_id}
    
    result = db.sessions.update_many(
        query,
        {"$set": {"is_active": False}}
    )
    
    return result.modified_count


def get_session_by_id(db: Database, session_id: str) -> Optional[dict]:
    """Get a session by session_id"""
    return db.sessions.find_one({"session_id": session_id})


def validate_session(db: Database, session_id: str) -> bool:
    """
    Validate if a session is still active and not expired.
    
    Args:
        db: MongoDB database instance
        session_id: Session ID to validate
        
    Returns:
        True if session is valid, False otherwise
    """
    now = datetime.now(timezone.utc)
    session = db.sessions.find_one({
        "session_id": session_id,
        "is_active": True,
        "expires_at": {"$gt": now}
    })
    return session is not None


def update_session_activity(db: Database, session_id: str) -> bool:
    """
    Update the last_activity timestamp for a session.
    
    Args:
        db: MongoDB database instance
        session_id: Session ID to update
        
    Returns:
        True if updated successfully
    """
    result = db.sessions.update_one(
        {"session_id": session_id},
        {"$set": {"last_activity": datetime.now(timezone.utc)}}
    )
    return result.modified_count > 0


def invalidate_session(db: Database, session_id: str) -> bool:
    """
    Mark a session as inactive (logout).
    
    Args:
        db: MongoDB database instance
        session_id: Session ID to invalidate
        
    Returns:
        True if invalidated successfully
    """
    result = db.sessions.update_one(
        {"session_id": session_id},
        {"$set": {"is_active": False}}
    )
    return result.modified_count > 0


def get_active_user_sessions(db: Database, user_id: str) -> list:
    """
    Get all active sessions for a user.
    
    Args:
        db: MongoDB database instance
        user_id: User's ObjectId as string
        
    Returns:
        List of active session documents
    """
    now = datetime.now(timezone.utc)
    return list(db.sessions.find({
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "is_active": True,
        "expires_at": {"$gt": now}
    }))


def cleanup_expired_sessions(db: Database) -> int:
    """
    Clean up expired sessions (housekeeping task).
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Number of sessions cleaned up
    """
    now = datetime.now(timezone.utc)
    result = db.sessions.delete_many({
        "expires_at": {"$lt": now}
    })
    return result.deleted_count


__all__ = [
    "create_session",
    "invalidate_all_user_sessions",
    "get_session_by_id",
    "validate_session",
    "update_session_activity",
    "invalidate_session",
    "get_active_user_sessions",
    "cleanup_expired_sessions"
]
