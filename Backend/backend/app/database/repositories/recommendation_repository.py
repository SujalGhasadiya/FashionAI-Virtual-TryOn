from pymongo.database import Database


def list_recommendations_for_user(db: Database, user_id: str) -> list[dict]:
    return list(db.recommendations.find({"user_id": user_id}).sort("created_at", -1))


__all__ = ["list_recommendations_for_user"]
