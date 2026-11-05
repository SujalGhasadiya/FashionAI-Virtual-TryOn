from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import settings
from app.database.repositories.admin_repository import get_admin_by_email
from app.schemas import AdminAuthResponse, AdminBootstrapRequest, AdminLoginRequest, AdminOverviewOut
from app.services.analytics_service import get_overview_metrics
from app.services.admin_service import create_admin
from app.services.auth_service import create_access_token, verify_password
from app.utils.helpers import serialize_document
from app.services.subscription_service import (
    list_subscription_plans,
    add_subscription_plan,
    update_subscription_plan,
    sync_subscription_plans_collection,
)
from app.schemas import SubscriptionPlanCreate, SubscriptionPlanUpdate


def bootstrap_admin(payload: AdminBootstrapRequest, db: Database) -> dict:
    configured_secret = settings.admin_creation_secret.strip()
    if not configured_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_CREATION_SECRET is not configured on the server",
        )

    if payload.secret != configured_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid admin creation secret")

    existing_admin = get_admin_by_email(db, payload.email)
    if existing_admin is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin email is already registered")

    return create_admin(db, name=payload.name, email=payload.email, password=payload.password)


def login_admin(payload: AdminLoginRequest, db: Database) -> AdminAuthResponse:
    admin = get_admin_by_email(db, payload.email)
    if admin is None or not verify_password(payload.password, admin["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    from app.database.repositories.session_repository import (
        create_session,
        invalidate_all_user_sessions,
    )
    invalidate_all_user_sessions(db, str(admin["_id"]))
    session = create_session(db, str(admin["_id"]), admin["email"], "admin")

    token = create_access_token({
        "email": admin["email"],
        "kind": "admin",
        "session_id": session["session_id"],
    })
    return AdminAuthResponse(access_token=token, admin=serialize_document(admin))


def get_admin_overview(db: Database) -> AdminOverviewOut:
    return AdminOverviewOut(**get_overview_metrics(db))


def list_admin_plans(db: Database) -> list[dict]:
    # Return all plans for admin management
    return list_subscription_plans()


def create_admin_plan(payload: SubscriptionPlanCreate, db: Database) -> dict:
    try:
        plan = add_subscription_plan(payload.dict())
        sync_subscription_plans_collection(db)
        return plan
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def update_admin_plan(code: str, payload: SubscriptionPlanUpdate, db: Database) -> dict:
    try:
        plan = update_subscription_plan(code, payload.dict(exclude_unset=True))
        sync_subscription_plans_collection(db)
        return plan
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")


__all__ = [
    "bootstrap_admin",
    "get_admin_overview",
    "login_admin",
    "list_admin_plans",
    "create_admin_plan",
    "update_admin_plan",
]
