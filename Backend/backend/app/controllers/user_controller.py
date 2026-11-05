from fastapi import HTTPException, UploadFile
from pymongo.database import Database

from app.database.repositories.user_repository import get_user
from app.schemas import PasswordChangeRequest, UserUpdateRequest
from app.services.auth_service import get_password_hash, verify_password
from app.services.storage_service import absolute_to_media_url, create_profile_photo_path, save_upload_file
from app.services.subscription_service import (
    list_active_subscription_plans,
    get_subscription_plan,
    list_subscription_plans,
    sync_subscription_plans_collection,
    get_user_quota_snapshot,
    get_active_wardrobe_count,
    _is_subscription_expired,
)
from app.utils.helpers import serialize_document, serialize_many, utcnow


def _build_user_profile(user: dict, db: Database) -> dict:
    profile = serialize_document(user) or {}
    profile.update(get_user_quota_snapshot(db, user))
    return profile


def get_me(current_user: dict, db: Database) -> dict:
    return _build_user_profile(current_user, db)


def update_me(payload: UserUpdateRequest, current_user: dict, db: Database) -> dict:
    updates = {"updated_at": utcnow()}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.gender_preference is not None:
        if payload.gender_preference not in {"male", "female", "other", "prefer_not_to_say"}:
            raise HTTPException(status_code=400, detail="Gender preference must be male, female, other, or prefer_not_to_say")
        updates["gender_preference"] = payload.gender_preference
    if payload.bio is not None:
        updates["bio"] = payload.bio

    merged_gender = updates.get("gender_preference", current_user.get("gender_preference"))
    updates["is_fully_registered"] = bool(current_user.get("profile_photo_url") and merged_gender)

    db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
    updated_user = get_user(db, str(current_user["_id"]))
    return _build_user_profile(updated_user, db)


def update_password(payload: PasswordChangeRequest, current_user: dict, db: Database) -> dict:
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    if not verify_password(payload.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": get_password_hash(payload.new_password), "updated_at": utcnow()}},
    )
    return {"message": "Password updated successfully"}


def upload_profile_photo(photo: UploadFile, current_user: dict, db: Database) -> dict:
    destination = create_profile_photo_path(str(current_user["_id"]), photo.filename)
    save_upload_file(photo, destination)

    updated_photo_url = absolute_to_media_url(destination)
    db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "profile_photo_url": updated_photo_url,
                "is_fully_registered": bool(updated_photo_url and current_user.get("gender_preference")),
                "updated_at": utcnow(),
            }
        },
    )
    updated_user = get_user(db, str(current_user["_id"]))
    return _build_user_profile(updated_user, db)

def activate_subscription_plan(plan_code: str, current_user: dict, db: Database, allow_paid_purchase: bool = False) -> dict:
    normalized_code = str(plan_code).strip().lower()
    available_plans = {plan["code"]: plan for plan in list_active_subscription_plans()}
    plan = available_plans.get(normalized_code)
    if plan is None:
        raise HTTPException(status_code=404, detail="Subscription plan not found or inactive")

    if float(plan.get("price_inr") or 0) > 0 and not allow_paid_purchase:
        raise HTTPException(
            status_code=400,
            detail="Paid plans must be purchased through the Razorpay checkout flow",
        )

    is_current_plan = get_subscription_plan(current_user)["code"] == normalized_code
    is_currently_expired = _is_subscription_expired(current_user)
    if is_current_plan and not is_currently_expired:
        return _build_user_profile(current_user, db)

    current_wardrobe_count = get_active_wardrobe_count(db, str(current_user["_id"]))
    new_limit = plan["wardrobe_limit"]
    if current_wardrobe_count > new_limit:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot downgrade to {plan['name']} because your wardrobe has "
                f"{current_wardrobe_count} items, but that plan allows only {new_limit}. "
                "Please remove extra items before downgrading."
            ),
        )

    now = utcnow()
    db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "subscription_plan": normalized_code,
                "subscription_started_at": now,
                "updated_at": now,
            }
        },
    )
    sync_subscription_plans_collection(db)
    updated_user = get_user(db, str(current_user["_id"]))
    return _build_user_profile(updated_user, db)


def purchase_subscription_plan(plan_code: str, current_user: dict, db: Database) -> dict:
    return activate_subscription_plan(plan_code, current_user, db)


def list_subscription_plans_route() -> list[dict]:
    return list_active_subscription_plans()

__all__ = [
    "activate_subscription_plan",
    "get_me",
    "purchase_subscription_plan",
    "list_subscription_plans_route",
    "update_me",
    "update_password",
    "upload_profile_photo",
]
