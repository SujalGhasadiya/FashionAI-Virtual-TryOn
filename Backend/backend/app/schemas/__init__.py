"""Pydantic schema modules split by feature area."""

from app.schemas.admin import (
    AdminAuthResponse,
    AdminBootstrapRequest,
    AdminLoginRequest,
    AdminOut,
    AdminOverviewOut,
)
from app.schemas.auth import AuthResponse, LoginRequest, RegisterStepOneRequest, TokenData
from app.schemas.recommendation import (
    RecommendationCandidate,
    RecommendationHistoryOut,
    RecommendationRequest,
    RecommendationResponse,
)
from app.schemas.payment import RazorpayOrderOut, RazorpayPaymentVerificationRequest, RazorpayPlanOrderRequest
from app.schemas.subscription import SubscriptionPlanOut
from app.schemas.subscription import SubscriptionPlanCreate, SubscriptionPlanUpdate
from app.schemas.tryon import TryOnJobOut
from app.schemas.user import PasswordChangeRequest, UserProfile, UserUpdateRequest
from app.schemas.wardrobe import WardrobeEmbeddingSyncOut, WardrobeItemOut, WardrobeItemStatusUpdateRequest

__all__ = [
    "AdminAuthResponse",
    "AdminBootstrapRequest",
    "AdminLoginRequest",
    "AdminOut",
    "AdminOverviewOut",
    "AuthResponse",
    "LoginRequest",
    "PasswordChangeRequest",
    "RecommendationCandidate",
    "RecommendationHistoryOut",
    "RecommendationRequest",
    "RecommendationResponse",
    "RazorpayOrderOut",
    "RazorpayPaymentVerificationRequest",
    "RazorpayPlanOrderRequest",
    "RegisterStepOneRequest",
    "SubscriptionPlanOut",
    "SubscriptionPlanCreate",
    "SubscriptionPlanUpdate",
    "TokenData",
    "TryOnJobOut",
    "UserProfile",
    "UserUpdateRequest",
    "WardrobeEmbeddingSyncOut",
    "WardrobeItemOut",
    "WardrobeItemStatusUpdateRequest",
]
