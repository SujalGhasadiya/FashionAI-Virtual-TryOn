from pymongo.database import Database


def get_admin_by_email(db: Database, email: str) -> dict | None:
    return db.admins.find_one({"email": email})


def get_admin_by_id(db: Database, admin_id: str) -> dict | None:
    from app.utils.helpers import to_object_id

    return db.admins.find_one({"_id": to_object_id(admin_id)})


def list_admins(db: Database) -> list[dict]:
    return list(db.admins.find().sort("created_at", -1))


__all__ = ["get_admin_by_email", "get_admin_by_id", "list_admins"]
