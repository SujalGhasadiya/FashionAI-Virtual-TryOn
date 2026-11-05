from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pymongo.database import Database

from app.core.security import ALGORITHM, SECRET_KEY
from app.database.connection import get_db
from app.database.repositories.admin_repository import get_admin_by_email
from app.database.repositories.user_repository import get_user_by_email
from app.database.repositories.session_repository import validate_session, update_session_activity
from app.schemas import TokenData


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Database = Depends(get_db)) -> dict:
    """
    Validate JWT token and check session validity for single-session enforcement.
    
    Raises HTTPException 401 if:
    - Token is invalid
    - Session is not found, inactive, or expired
    - User is logged in from another device (previous session)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        if email is None:
            raise credentials_exception
        token_kind = payload.get("kind")
        session_id = payload.get("session_id")  # Extract session_id from token
        token_data = TokenData(email=email, kind=token_kind, session_id=session_id)
    except JWTError as exc:
        raise credentials_exception from exc

    if token_data.kind not in (None, "user"):
        raise credentials_exception

    # Single-session enforcement: Validate session
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing session ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not validate_session(db, session_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has been invalidated. You were logged in from another device. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update session activity
    update_session_activity(db, session_id)

    user = get_user_by_email(db, token_data.email)
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


def get_current_fully_registered_user(current_user: dict = Depends(get_current_active_user)) -> dict:
    if not current_user.get("is_fully_registered"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete registration step 2 before using this feature",
        )
    return current_user


def get_current_admin(token: str = Depends(oauth2_scheme), db: Database = Depends(get_db)) -> dict:
    """
    Validate JWT token for admin and check session validity for single-session enforcement.
    
    Raises HTTPException 401 if:
    - Token is invalid
    - Session is not found, inactive, or expired
    - Admin is logged in from another device
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        token_kind = payload.get("kind")
        session_id = payload.get("session_id")  # Extract session_id from token
        if email is None or token_kind not in (None, "admin"):
            raise credentials_exception
        token_data = TokenData(email=email, kind=token_kind, session_id=session_id)
    except JWTError as exc:
        raise credentials_exception from exc

    # Single-session enforcement: Validate session
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing session ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not validate_session(db, session_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has been invalidated. You were logged in from another device. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update session activity
    update_session_activity(db, session_id)

    admin = get_admin_by_email(db, token_data.email)
    if admin is None:
        raise credentials_exception
    return admin

__all__ = [
    "get_current_active_user",
    "get_current_fully_registered_user",
    "get_current_admin",
    "get_current_user",
    "oauth2_scheme",
]
