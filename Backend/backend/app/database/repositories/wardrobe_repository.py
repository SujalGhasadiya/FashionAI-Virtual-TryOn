from pymongo.database import Database

from app.utils.helpers import to_object_id


def get_wardrobe_item_for_user(
    db: Database,
    item_id: str,
    user_id: str,
    include_inactive: bool = True,
) -> dict | None:
    query = {"_id": to_object_id(item_id), "user_id": user_id, "delete_status": {"$ne": "inactive"}}
    if not include_inactive:
        query["active_status"] = {"$ne": "inactive"}
    return db.wardrobe_items.find_one(query)


def list_wardrobe_items_for_user(
    db: Database,
    user_id: str,
    include_inactive: bool = True,
) -> list[dict]:
    query = {"user_id": user_id, "delete_status": {"$ne": "inactive"}}
    if not include_inactive:
        query["active_status"] = {"$ne": "inactive"}
    return list(db.wardrobe_items.find(query).sort("created_at", -1))


__all__ = ["get_wardrobe_item_for_user", "list_wardrobe_items_for_user"]
