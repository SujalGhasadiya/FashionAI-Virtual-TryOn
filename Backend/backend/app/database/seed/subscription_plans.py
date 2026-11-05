from __future__ import annotations

from typing import Any


DEFAULT_SUBSCRIPTION_PLAN = "free"

SUBSCRIPTION_PLAN_SEED_DATA: list[dict[str, Any]] = [
    {
        "code": "free",
        "name": "Free",
        "description": "Starter access for new users.",
        "price_inr": 0.0,
        "sort_order": 0,
        "wardrobe_limit": 5,
        "tryon_daily_limit": 1,
        "recommendation_daily_limit": 1,
        "saved_tryon_monthly_limit": 0,
        "is_default": True,
        "active": True,
    },
    {
        "code": "basic",
        "name": "Basic",
        "description": "More wardrobe space and daily usage for regular users.",
        "price_inr": 299.0,
        "sort_order": 1,
        "wardrobe_limit": 10,
        "tryon_daily_limit": 4,
        "recommendation_daily_limit": 5,
        "saved_tryon_monthly_limit": 0,
        "is_default": False,
        "active": True,
    },
    {
        "code": "standard",
        "name": "Standard",
        "description": "Balanced plan with occasion-aware recommendations and saved outputs.",
        "price_inr": 799.0,
        "sort_order": 2,
        "wardrobe_limit": 20,
        "tryon_daily_limit": 7,
        "recommendation_daily_limit": 10,
        "saved_tryon_monthly_limit": 15,
        "is_default": False,
        "active": True,
    },
    {
        "code": "premium",
        "name": "Premium",
        "description": "Highest usage limits for heavy users.",
        "price_inr": 1499.0,
        "sort_order": 3,
        "wardrobe_limit": 35,
        "tryon_daily_limit": 10,
        "recommendation_daily_limit": None,
        "saved_tryon_monthly_limit": 20,
        "is_default": False,
        "active": True,
    },
]


__all__ = ["DEFAULT_SUBSCRIPTION_PLAN", "SUBSCRIPTION_PLAN_SEED_DATA"]