from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import HTTPException, status
from pymongo.database import Database

from app.database.seed.subscription_plans import DEFAULT_SUBSCRIPTION_PLAN, SUBSCRIPTION_PLAN_SEED_DATA


SUBSCRIPTION_PLANS_COLLECTION = "subscription_plans"

SUBSCRIPTION_PLANS: dict[str, dict[str, Any]] = {
    plan["code"]: dict(plan) for plan in SUBSCRIPTION_PLAN_SEED_DATA
}


def _plan_document(plan: dict[str, Any]) -> dict[str, Any]:
    document = dict(plan)
    document.setdefault("active", True)
    return document


def sync_subscription_plans_collection(db: Database) -> None:
    collection = db[SUBSCRIPTION_PLANS_COLLECTION]
    for plan in list_subscription_plans():
        collection.update_one(
            {"code": plan["code"]},
            {"$set": _plan_document(plan)},
            upsert=True,
        )


def load_subscription_plans_from_collection(db: Database) -> None:
    collection = db[SUBSCRIPTION_PLANS_COLLECTION]
    existing_plans = list(collection.find({}))
    if not existing_plans:
        sync_subscription_plans_collection(db)
        return

    master_plans = {plan["code"]: dict(plan) for plan in SUBSCRIPTION_PLAN_SEED_DATA}
    SUBSCRIPTION_PLANS.clear()
    for plan in existing_plans:
        code = str(plan.get("code") or "").strip().lower()
        if not code:
            continue
        default_plan = master_plans.get(code, {})
        SUBSCRIPTION_PLANS[code] = {
            **default_plan,
            "code": code,
            "name": plan.get("name", default_plan.get("name", code.title())),
            "description": plan.get("description", default_plan.get("description")),
            "price_inr": float(plan.get("price_inr", default_plan.get("price_inr", 0.0))),
            "sort_order": int(plan.get("sort_order", default_plan.get("sort_order", 0))),
            "wardrobe_limit": plan.get("wardrobe_limit", default_plan.get("wardrobe_limit")),
            "tryon_daily_limit": plan.get("tryon_daily_limit", default_plan.get("tryon_daily_limit")),
            "recommendation_daily_limit": plan.get(
                "recommendation_daily_limit",
                default_plan.get("recommendation_daily_limit"),
            ),
            "saved_tryon_monthly_limit": plan.get(
                "saved_tryon_monthly_limit", default_plan.get("saved_tryon_monthly_limit")
            ),
            "is_default": bool(plan.get("is_default", default_plan.get("is_default", False))),
            "active": plan.get("active", default_plan.get("active", True)),
        }

    sync_subscription_plans_collection(db)

    if DEFAULT_SUBSCRIPTION_PLAN not in SUBSCRIPTION_PLANS:
        SUBSCRIPTION_PLANS[DEFAULT_SUBSCRIPTION_PLAN] = dict(master_plans[DEFAULT_SUBSCRIPTION_PLAN])
        sync_subscription_plans_collection(db)


def get_subscription_plan_code(user: dict[str, Any]) -> str:
    plan_code = str(user.get("subscription_plan") or DEFAULT_SUBSCRIPTION_PLAN).strip().lower()
    if plan_code not in SUBSCRIPTION_PLANS:
        return DEFAULT_SUBSCRIPTION_PLAN
    return plan_code


def get_subscription_plan(user: dict[str, Any]) -> dict[str, Any]:
    return SUBSCRIPTION_PLANS[get_subscription_plan_code(user)]


def list_subscription_plans() -> list[dict[str, Any]]:
    return sorted(SUBSCRIPTION_PLANS.values(), key=lambda item: item["sort_order"])


def list_active_subscription_plans() -> list[dict[str, Any]]:
    return sorted([p for p in SUBSCRIPTION_PLANS.values() if p.get("active", True)], key=lambda item: item["sort_order"])


def add_subscription_plan(plan: dict[str, Any]) -> dict[str, Any]:
    code = plan.get("code")
    if not code:
        raise ValueError("code is required")
    code = str(code).strip().lower()
    if code in SUBSCRIPTION_PLANS:
        raise ValueError("plan with this code already exists")
    plan_copy = dict(plan)
    plan_copy["code"] = code
    plan_copy.setdefault("sort_order", max((p.get("sort_order", 0) for p in SUBSCRIPTION_PLANS.values()), default=0) + 1)
    plan_copy.setdefault("active", True)
    SUBSCRIPTION_PLANS[code] = plan_copy
    return plan_copy


def update_subscription_plan(code: str, updates: dict[str, Any]) -> dict[str, Any]:
    code = str(code).strip().lower()
    if code not in SUBSCRIPTION_PLANS:
        raise KeyError("plan not found")
    plan = SUBSCRIPTION_PLANS[code]
    for k, v in updates.items():
        if k == "code":
            continue
        plan[k] = v
    SUBSCRIPTION_PLANS[code] = plan
    return plan


def delete_subscription_plan(code: str) -> None:
    code = str(code).strip().lower()
    if code in SUBSCRIPTION_PLANS:
        del SUBSCRIPTION_PLANS[code]


def _start_of_day(now: Optional[datetime] = None) -> datetime:
    current = now or datetime.now(timezone.utc)
    return datetime(current.year, current.month, current.day, tzinfo=timezone.utc)


def _start_of_month(now: Optional[datetime] = None) -> datetime:
    current = now or datetime.now(timezone.utc)
    return datetime(current.year, current.month, 1, tzinfo=timezone.utc)


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _subscription_cycle_start(user: dict[str, Any], now: Optional[datetime] = None) -> datetime:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    subscription_started_at = _normalize_datetime(user.get("subscription_started_at"))
    if subscription_started_at is None:
        subscription_started_at = _normalize_datetime(user.get("updated_at"))
    if subscription_started_at is None:
        subscription_started_at = _normalize_datetime(user.get("created_at"))
    if subscription_started_at is None:
        return _start_of_month(current)

    return subscription_started_at


def _subscription_duration() -> timedelta:
    # Keep expiry and displayed cycle end in sync.
    return timedelta(days=28)  # Approximate monthly cycle as 28 days for simplicity
#days=28)

def _subscription_cycle_end(user: dict[str, Any], now: Optional[datetime] = None) -> datetime:
    return _subscription_cycle_start(user, now) + _subscription_duration()


def _is_subscription_expired(user: dict[str, Any], now: Optional[datetime] = None) -> bool:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    subscription_started_at = _normalize_datetime(user.get("subscription_started_at"))
    if subscription_started_at is None:
        return False

    expiration = subscription_started_at + _subscription_duration()
    return current > expiration


def get_active_wardrobe_count(db: Database, user_id: str) -> int:
    return db.wardrobe_items.count_documents({"user_id": user_id, "delete_status": {"$ne": "inactive"}, "active_status": "active"})


def _user_daily_usage_start(user: dict[str, Any], now: Optional[datetime] = None) -> datetime:
    day_start = _start_of_day(now)
    subscription_started_at = _normalize_datetime(user.get("subscription_started_at"))
    if subscription_started_at is not None and subscription_started_at > day_start:
        return subscription_started_at
    return day_start


def get_tryon_count_today(db: Database, user_id: str, user: dict[str, Any], now: Optional[datetime] = None) -> int:
    start = _user_daily_usage_start(user, now)
    return db.tryon_jobs.count_documents({
        "user_id": user_id, 
        "created_at": {"$gte": start},
        "status": {"$in": ["processing", "completed"]}
    })


def get_recommendation_count_today(db: Database, user_id: str, user: dict[str, Any], now: Optional[datetime] = None) -> int:
    start = _user_daily_usage_start(user, now)
    return db.recommendations.count_documents({"user_id": user_id, "created_at": {"$gte": start}})


def get_saved_tryon_count_this_month(db: Database, user: dict[str, Any], now: Optional[datetime] = None) -> int:
    start = _subscription_cycle_start(user, now)
    return db.tryon_jobs.count_documents(
        {"user_id": str(user["_id"]), "is_saved": True, "created_at": {"$gte": start}}
    )


def get_remaining_tryons_today(db: Database, user_id: str, user: dict[str, Any]) -> Optional[int]:
    if _is_subscription_expired(user):
        return 0

    limit = get_subscription_plan(user)["tryon_daily_limit"]
    if limit is None:
        return None
    used = get_tryon_count_today(db, user_id, user)
    return max(limit - used, 0)


def get_remaining_recommendations_today(db: Database, user_id: str, user: dict[str, Any]) -> Optional[int]:
    if _is_subscription_expired(user):
        return 0

    limit = get_subscription_plan(user)["recommendation_daily_limit"]
    if limit is None:
        return None
    used = get_recommendation_count_today(db, user_id, user)
    return max(limit - used, 0)


def get_remaining_wardrobe_slots(db: Database, user: dict[str, Any]) -> Optional[int]:
    plan = get_subscription_plan(user)
    limit = plan["wardrobe_limit"]
    if limit is None:
        return None
    active_count = get_active_wardrobe_count(db, str(user["_id"]))
    return max(limit - active_count, 0)


def get_user_quota_snapshot(db: Database, user: dict[str, Any]) -> dict[str, Any]:
    user_id = str(user["_id"])
    plan = get_subscription_plan(user)
    wardrobe_used = get_active_wardrobe_count(db, user_id)
    tryons_used_today = get_tryon_count_today(db, user_id, user)
    recommendations_used_today = get_recommendation_count_today(db, user_id, user)
    saved_tryons_used_this_month = get_saved_tryon_count_this_month(db, user)

    is_expired = _is_subscription_expired(user)
    tryon_limit = 0 if is_expired else plan["tryon_daily_limit"]
    recommendation_limit = 0 if is_expired else plan["recommendation_daily_limit"]
    saved_tryon_limit = 0 if is_expired else plan["saved_tryon_monthly_limit"]

    cycle_start = _subscription_cycle_start(user)
    cycle_end = _subscription_cycle_end(user)

    returned = {
        "subscription_plan": plan["code"],
        "wardrobe_limit": plan["wardrobe_limit"],
        "wardrobe_used": wardrobe_used,
        "wardrobe_remaining": None if plan["wardrobe_limit"] is None else max(plan["wardrobe_limit"] - wardrobe_used, 0),
        "tryon_daily_limit": tryon_limit,
        "tryons_used_today": tryons_used_today,
        "remaining_tryons_today": 0 if is_expired else None if tryon_limit is None else max(tryon_limit - tryons_used_today, 0),
        "recommendation_daily_limit": recommendation_limit,
        "recommendations_used_today": recommendations_used_today,
        "remaining_recommendations_today": 0 if is_expired else None
        if recommendation_limit is None
        else max(recommendation_limit - recommendations_used_today, 0),
        "saved_tryon_monthly_limit": saved_tryon_limit,
        "saved_tryons_used_this_month": saved_tryons_used_this_month,
        "remaining_saved_tryons_this_month": None if saved_tryon_limit is None else max(saved_tryon_limit - saved_tryons_used_this_month, 0),
        "subscription_cycle_start": cycle_start,
        "subscription_cycle_end": cycle_end,
        "subscription_expires_at": cycle_end,
        "is_subscription_expired": is_expired,
    }
    return returned


def ensure_wardrobe_capacity(db: Database, user: dict[str, Any]) -> None:
    plan = get_subscription_plan(user)
    limit = plan["wardrobe_limit"]
    if limit is None:
        return
    active_count = get_active_wardrobe_count(db, str(user["_id"]))
    if active_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Your {plan['name']} monthly plan allows {limit} wardrobe items. Please buy or upgrade a plan to continue.",
        )


def ensure_tryon_limit(db: Database, user: dict[str, Any]) -> None:
    if _is_subscription_expired(user):
        plan = get_subscription_plan(user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your {plan['name']} subscription has expired. Please renew or purchase a plan to use try-on.",
        )

    plan = get_subscription_plan(user)
    limit = plan["tryon_daily_limit"]
    if limit is None:
        return
    used = get_tryon_count_today(db, str(user["_id"]), user)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Your {plan['name']} monthly plan allows {limit} try-on request(s) per day. Please buy or upgrade a plan to continue.",
        )


def ensure_recommendation_limit(db: Database, user: dict[str, Any]) -> None:
    if _is_subscription_expired(user):
        plan = get_subscription_plan(user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your {plan['name']} subscription has expired. Please renew or purchase a plan to use recommendations.",
        )

    plan = get_subscription_plan(user)
    limit = plan["recommendation_daily_limit"]
    if limit is None:
        return
    used = get_recommendation_count_today(db, str(user["_id"]), user)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Your {plan['name']} monthly plan allows {limit} recommendation request(s) per day. Please buy or upgrade a plan to continue.",
        )


def should_save_tryon_output(db: Database, user: dict[str, Any]) -> bool:
    if _is_subscription_expired(user):
        return False

    plan = get_subscription_plan(user)
    limit = plan["saved_tryon_monthly_limit"]
    if limit is None:
        return True
    if limit == 0:
        return False
    saved_count = get_saved_tryon_count_this_month(db, user)
    return saved_count < limit


__all__ = [
    "DEFAULT_SUBSCRIPTION_PLAN",
    "SUBSCRIPTION_PLANS",
    "SUBSCRIPTION_PLANS_COLLECTION",
    "ensure_recommendation_limit",
    "ensure_tryon_limit",
    "ensure_wardrobe_capacity",
    "load_subscription_plans_from_collection",
    "get_remaining_recommendations_today",
    "get_remaining_tryons_today",
    "get_remaining_wardrobe_slots",
    "get_subscription_plan",
    "get_subscription_plan_code",
    "get_user_quota_snapshot",
    "list_subscription_plans",
    "sync_subscription_plans_collection",
    "should_save_tryon_output",
]