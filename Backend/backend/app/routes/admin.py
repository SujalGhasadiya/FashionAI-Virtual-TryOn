from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.controllers.admin_controller import (
    bootstrap_admin,
    get_admin_overview,
    login_admin,
    list_admin_plans,
    create_admin_plan,
    update_admin_plan,
)
from app.core.deps import get_current_admin
from app.database.connection import get_db
from app.schemas import (
    AdminAuthResponse,
    AdminBootstrapRequest,
    AdminLoginRequest,
    AdminOut,
    AdminOverviewOut,
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
)


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/bootstrap", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def bootstrap_admin_route(payload: AdminBootstrapRequest, db: Database = Depends(get_db)):
    return bootstrap_admin(payload, db)


@router.post("/login", response_model=AdminAuthResponse)
def login_admin_route(payload: AdminLoginRequest, db: Database = Depends(get_db)):
    return login_admin(payload, db)


@router.get("/overview", response_model=AdminOverviewOut)
def admin_overview_route(current_admin: dict = Depends(get_current_admin), db: Database = Depends(get_db)):
    return get_admin_overview(db)


@router.get("/plans", response_model=list[dict])
def admin_list_plans_route(current_admin: dict = Depends(get_current_admin), db: Database = Depends(get_db)):
    return list_admin_plans(db)


@router.post("/plans", response_model=dict, status_code=status.HTTP_201_CREATED)
def admin_create_plan_route(payload: SubscriptionPlanCreate, current_admin: dict = Depends(get_current_admin), db: Database = Depends(get_db)):
    return create_admin_plan(payload, db)


@router.put("/plans/{code}", response_model=dict)
def admin_update_plan_route(code: str, payload: SubscriptionPlanUpdate, current_admin: dict = Depends(get_current_admin), db: Database = Depends(get_db)):
    return update_admin_plan(code, payload, db)

__all__ = ["router"]
