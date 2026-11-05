from pymongo.database import Database

from app.core.security import get_password_hash
from app.database.repositories.admin_repository import get_admin_by_email
from app.utils.helpers import serialize_document, utcnow


def create_admin(db: Database, *, name: str, email: str, password: str, role: str = "super_admin") -> dict:
    existing = get_admin_by_email(db, email)
    if existing is not None:
        raise ValueError("Admin email is already registered")

    now = utcnow()
    admin_document = {
        "name": name,
        "email": email,
        "hashed_password": get_password_hash(password),
        "role": role,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = db.admins.insert_one(admin_document)
    admin_document["_id"] = result.inserted_id
    return serialize_document(admin_document)


__all__ = ["create_admin"]
