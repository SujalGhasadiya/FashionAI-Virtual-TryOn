from pymongo.database import Database

from app.utils.helpers import to_object_id


def get_user(db: Database, user_id: str) -> dict | None:
    return db.users.find_one({"_id": to_object_id(user_id)})


def get_user_by_email(db: Database, email: str) -> dict | None:
    return db.users.find_one({"email": email})


def list_users(db: Database) -> list[dict]:
    return list(db.users.find().sort("created_at", -1))


__all__ = ["get_user", "get_user_by_email", "list_users"]
