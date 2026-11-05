from fastapi import APIRouter, Depends, status
from pymongo.database import Database

from app.controllers.recommendation_controller import recommendation_history, recommend_tops, recommend_bottoms
from app.core.deps import get_current_fully_registered_user
from app.database.connection import get_db
from app.schemas import RecommendationHistoryOut, RecommendationRequest, RecommendationResponse


router = APIRouter(prefix="/recommend", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
def recommend_tops_route(
    payload: RecommendationRequest,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return recommend_tops(payload, current_user, db)


@router.post("/bottoms", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
def recommend_bottoms_route(
    payload: RecommendationRequest,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return recommend_bottoms(payload, current_user, db)


@router.get("/history", response_model=list[RecommendationHistoryOut])
def recommendation_history_route(
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return recommendation_history(current_user, db)

__all__ = ["router"]
