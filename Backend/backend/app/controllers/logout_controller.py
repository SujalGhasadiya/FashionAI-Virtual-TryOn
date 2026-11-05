"""
Logout controller for session invalidation.
"""
from fastapi import HTTPException
from pymongo.database import Database
from jose import jwt

from app.core.security import ALGORITHM, SECRET_KEY
from app.database.repositories.session_repository import invalidate_session


def logout(token: str, db: Database) -> dict:
    """
    Logout by invalidating the current session.
    
    Args:
        token: JWT token containing session_id
        db: MongoDB database instance
        
    Returns:
        Confirmation message
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        session_id = payload.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Invalid token format")
        
        # Invalidate the session
        if invalidate_session(db, session_id):
            return {"message": "Successfully logged out"}
        else:
            raise HTTPException(status_code=400, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Logout failed: {str(e)}")


__all__ = ["logout"]
