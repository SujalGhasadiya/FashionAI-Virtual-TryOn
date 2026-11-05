from pydantic import BaseModel, EmailStr, Field


class RazorpayPlanOrderRequest(BaseModel):
    plan_code: str = Field(min_length=1, max_length=64)


class RazorpayOrderOut(BaseModel):
    order_id: str
    amount_paise: int
    currency: str
    key_id: str
    merchant_name: str
    description: str
    plan_code: str
    plan_name: str
    customer_name: str
    customer_email: EmailStr


class RazorpayPaymentVerificationRequest(BaseModel):
    plan_code: str = Field(min_length=1, max_length=64)
    razorpay_order_id: str = Field(min_length=1, max_length=128)
    razorpay_payment_id: str = Field(min_length=1, max_length=128)
    razorpay_signature: str = Field(min_length=1, max_length=256)


__all__ = [
    "RazorpayOrderOut",
    "RazorpayPaymentVerificationRequest",
    "RazorpayPlanOrderRequest",
]