from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.controllers.payment_controller import create_plan_payment_order, verify_plan_payment
from app.core.deps import get_current_active_user
from app.database.connection import get_db
from app.schemas import RazorpayOrderOut, RazorpayPaymentVerificationRequest, RazorpayPlanOrderRequest, UserProfile


router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/razorpay/order", response_model=RazorpayOrderOut)
def create_razorpay_order_route(
    payload: RazorpayPlanOrderRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return create_plan_payment_order(payload, current_user, db)


@router.post("/razorpay/verify", response_model=UserProfile)
def verify_razorpay_payment_route(
    payload: RazorpayPaymentVerificationRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return verify_plan_payment(payload, current_user, db)


__all__ = ["router"]