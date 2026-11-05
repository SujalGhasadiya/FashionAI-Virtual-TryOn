from fastapi import HTTPException
from pymongo.database import Database

from app.database.repositories.user_repository import get_user
from app.database.repositories.wardrobe_repository import get_wardrobe_item_for_user
from app.schemas import RecommendationCandidate, RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import rank_tops_for_bottom, rank_bottoms_for_top
from app.services.subscription_service import ensure_recommendation_limit, get_remaining_recommendations_today
from app.utils.helpers import serialize_document, serialize_many, utcnow


def recommend_tops(payload: RecommendationRequest, current_user: dict, db: Database) -> RecommendationResponse:
    bottom_item = get_wardrobe_item_for_user(db, payload.bottom_item_id, str(current_user["_id"]), include_inactive=False)
    if bottom_item is None:
        raise HTTPException(status_code=404, detail="Bottom item not found")
    if bottom_item["type"] != "bottom":
        raise HTTPException(status_code=400, detail="Recommendations require a bottom item")

    top_count = db.wardrobe_items.count_documents(
        {"user_id": str(current_user["_id"]), "type": "top", "delete_status": {"$ne": "inactive"}, "active_status": "active"}
    )
    if top_count == 0:
        raise HTTPException(status_code=400, detail="Upload at least one top item before requesting recommendations")

    ensure_recommendation_limit(db, current_user)

    ranked = rank_tops_for_bottom(
        db=db,
        user_id=str(current_user["_id"]),
        bottom_item=bottom_item,
        occasion=payload.occasion,
        limit=payload.suggestion_count,
    )
    recommendation = {
        "user_id": str(current_user["_id"]),
        "bottom_item_id": str(bottom_item["_id"]),
        "occasion": payload.occasion,
        "suggested_top_ids": [str(item["_id"]) for item, _ in ranked],
        "created_at": utcnow(),
    }
    result = db.recommendations.insert_one(recommendation)
    recommendation["_id"] = result.inserted_id

    refreshed_user = get_user(db, str(current_user["_id"]))
    return RecommendationResponse(
        recommendation_id=str(recommendation["_id"]),
        subscription_plan=str(refreshed_user.get("subscription_plan") or "free"),
        remaining_recommendations_today=get_remaining_recommendations_today(
            db, str(current_user["_id"]), refreshed_user
        ),
        results=[
            RecommendationCandidate(
                top_item_id=str(item["_id"]),
                score=score,
                top_item=serialize_document(item),
            )
            for item, score in ranked
        ],
    )


def recommendation_history(current_user: dict, db: Database) -> list[dict]:
    history = list(db.recommendations.find({"user_id": str(current_user["_id"])}).sort("created_at", -1))
    return serialize_many(history)


def recommend_bottoms(payload: RecommendationRequest, current_user: dict, db: Database) -> RecommendationResponse:
    """Get bottom recommendations for a selected top item."""
    top_item = get_wardrobe_item_for_user(db, payload.bottom_item_id, str(current_user["_id"]), include_inactive=False)
    if top_item is None:
        raise HTTPException(status_code=404, detail="Top item not found")
    if top_item["type"] != "top":
        raise HTTPException(status_code=400, detail="Recommendations require a top item")

    bottom_count = db.wardrobe_items.count_documents(
        {"user_id": str(current_user["_id"]), "type": "bottom", "delete_status": {"$ne": "inactive"}, "active_status": "active"}
    )
    if bottom_count == 0:
        raise HTTPException(status_code=400, detail="Upload at least one bottom item before requesting recommendations")

    ensure_recommendation_limit(db, current_user)

    ranked = rank_bottoms_for_top(
        db=db,
        user_id=str(current_user["_id"]),
        top_item=top_item,
        occasion=payload.occasion,
        limit=payload.suggestion_count,
    )
    recommendation = {
        "user_id": str(current_user["_id"]),
        "top_item_id": str(top_item["_id"]),
        "occasion": payload.occasion,
        "suggested_bottom_ids": [str(item["_id"]) for item, _ in ranked],
        "created_at": utcnow(),
    }
    result = db.recommendations.insert_one(recommendation)
    recommendation["_id"] = result.inserted_id

    refreshed_user = get_user(db, str(current_user["_id"]))
    return RecommendationResponse(
        recommendation_id=str(recommendation["_id"]),
        subscription_plan=str(refreshed_user.get("subscription_plan") or "free"),
        remaining_recommendations_today=get_remaining_recommendations_today(
            db, str(current_user["_id"]), refreshed_user
        ),
        results=[
            RecommendationCandidate(
                top_item_id=str(item["_id"]),
                score=score,
                top_item=serialize_document(item),
            )
            for item, score in ranked
        ],
    )

__all__ = ["recommend_tops", "recommend_bottoms", "recommendation_history"]
