from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import settings
from app.controllers.user_controller import activate_subscription_plan
from app.database.models import PAYMENTS
from app.schemas import RazorpayOrderOut, RazorpayPaymentVerificationRequest, RazorpayPlanOrderRequest
from app.services.razorpay_service import create_razorpay_order, fetch_razorpay_order, verify_razorpay_signature
from app.services.subscription_service import list_active_subscription_plans
from app.utils.helpers import utcnow


def _get_active_plan(plan_code: str) -> dict:
    normalized_code = str(plan_code).strip().lower()
    available_plans = {plan["code"]: plan for plan in list_active_subscription_plans()}
    plan = available_plans.get(normalized_code)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found or inactive")
    return plan


def _build_receipt(user_id: str, plan_code: str, timestamp: int) -> str:
    compact_plan = "".join(ch for ch in str(plan_code).lower() if ch.isalnum())[:8] or "plan"
    compact_user = "".join(ch for ch in str(user_id).lower() if ch.isalnum())[-8:] or "user"
    receipt = f"pln_{compact_plan}_{compact_user}_{timestamp}"
    return receipt[:40]


def _mark_payment_failed(
    db: Database,
    user_id: str,
    razorpay_order_id: str,
    plan_code: str,
    reason: str,
) -> None:
    now = utcnow()
    db[PAYMENTS].update_one(
        {"user_id": user_id, "razorpay_order_id": razorpay_order_id},
        {
            "$set": {
                "status": "verification_failed",
                "failure_reason": reason,
                "updated_at": now,
            },
            "$setOnInsert": {
                "user_id": user_id,
                "plan_code": plan_code,
                "created_at": now,
            },
        },
        upsert=True,
    )


def create_plan_payment_order(
    payload: RazorpayPlanOrderRequest,
    current_user: dict,
    db: Database,
) -> RazorpayOrderOut:
    plan = _get_active_plan(payload.plan_code)
    amount_paise = int(round(float(plan["price_inr"]) * 100))
    if amount_paise <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This plan does not require online payment",
        )

    timestamp = int(datetime.now(timezone.utc).timestamp())
    receipt = _build_receipt(str(current_user["_id"]), plan["code"], timestamp)
    notes = {
        "user_id": str(current_user["_id"]),
        "user_email": str(current_user.get("email") or ""),
        "plan_code": plan["code"],
    }
    order = create_razorpay_order(amount_paise, receipt, notes)

    now = utcnow()
    db[PAYMENTS].update_one(
        {
            "user_id": str(current_user["_id"]),
            "razorpay_order_id": str(order.get("id") or ""),
        },
        {
            "$set": {
                "user_id": str(current_user["_id"]),
                "user_email": str(current_user.get("email") or ""),
                "plan_code": plan["code"],
                "plan_name": str(plan.get("name") or plan["code"].title()),
                "amount_paise": int(order.get("amount") or amount_paise),
                "currency": str(order.get("currency") or settings.razorpay_currency),
                "receipt": receipt,
                "razorpay_order_id": str(order.get("id") or ""),
                "status": "created",
                "notes": notes,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    return RazorpayOrderOut(
        order_id=str(order.get("id") or ""),
        amount_paise=int(order.get("amount") or amount_paise),
        currency=str(order.get("currency") or settings.razorpay_currency),
        key_id=settings.razorpay_key_id,
        merchant_name=settings.razorpay_checkout_name,
        description=settings.razorpay_checkout_description,
        plan_code=plan["code"],
        plan_name=str(plan.get("name") or plan["code"].title()),
        customer_name=str(current_user.get("name") or ""),
        customer_email=str(current_user.get("email") or ""),
    )


def verify_plan_payment(
    payload: RazorpayPaymentVerificationRequest,
    current_user: dict,
    db: Database,
) -> dict:
    user_id = str(current_user["_id"])
    plan = _get_active_plan(payload.plan_code)
    order = fetch_razorpay_order(payload.razorpay_order_id)
    notes = order.get("notes") or {}

    if str(notes.get("user_id") or "") != user_id:
        _mark_payment_failed(db, user_id, payload.razorpay_order_id, plan["code"], "order_user_mismatch")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order does not belong to this user")

    if str(notes.get("plan_code") or "").strip().lower() != plan["code"]:
        _mark_payment_failed(db, user_id, payload.razorpay_order_id, plan["code"], "order_plan_mismatch")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order does not match this plan")

    expected_amount = int(round(float(plan["price_inr"]) * 100))
    order_amount = int(order.get("amount") or 0)
    if order_amount != expected_amount:
        _mark_payment_failed(db, user_id, payload.razorpay_order_id, plan["code"], "amount_mismatch")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount does not match the plan price")

    if not verify_razorpay_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        _mark_payment_failed(db, user_id, payload.razorpay_order_id, plan["code"], "invalid_signature")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Razorpay payment signature")

    now = utcnow()
    db[PAYMENTS].update_one(
        {
            "user_id": user_id,
            "razorpay_order_id": payload.razorpay_order_id,
        },
        {
            "$set": {
                "status": "verified",
                "plan_code": plan["code"],
                "payment_captured": bool(order.get("status") == "paid"),
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
                "verified_at": now,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    updated_user = activate_subscription_plan(plan["code"], current_user, db, allow_paid_purchase=True)
    db[PAYMENTS].update_one(
        {
            "user_id": user_id,
            "razorpay_order_id": payload.razorpay_order_id,
        },
        {
            "$set": {
                "status": "completed",
                "subscription_activated": True,
                "updated_at": utcnow(),
            }
        },
    )
    return updated_user


__all__ = ["create_plan_payment_order", "verify_plan_payment"]