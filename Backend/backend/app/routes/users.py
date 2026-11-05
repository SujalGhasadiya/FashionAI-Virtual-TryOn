from fastapi import APIRouter, Depends, File, UploadFile
from pymongo.database import Database

from app.controllers.user_controller import (
    get_me,
    purchase_subscription_plan,
    list_subscription_plans_route,
    update_me,
    update_password,
    upload_profile_photo,
)
from app.core.deps import get_current_active_user
from app.database.connection import get_db
from app.schemas import PasswordChangeRequest, SubscriptionPlanOut, UserProfile, UserUpdateRequest


router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserProfile)
def get_me_route(current_user: dict = Depends(get_current_active_user), db: Database = Depends(get_db)):
    return get_me(current_user, db)


@router.patch("/me", response_model=UserProfile)
def update_me_route(
    payload: UserUpdateRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return update_me(payload, current_user, db)


@router.patch("/me/password")
def update_password_route(
    payload: PasswordChangeRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return update_password(payload, current_user, db)


@router.post("/me/photo", response_model=UserProfile)
async def upload_profile_photo_route(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return upload_profile_photo(photo, current_user, db)


@router.post("/me/subscription/{plan_code}", response_model=UserProfile)
def purchase_subscription_plan_route(
    plan_code: str,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    return purchase_subscription_plan(plan_code, current_user, db)


@router.get("/plans", response_model=list[SubscriptionPlanOut])
def list_subscription_plans_route_handler():
    return list_subscription_plans_route()

__all__ = ["router"]
