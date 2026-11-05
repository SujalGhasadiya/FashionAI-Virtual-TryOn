import logging

from fastapi import HTTPException, UploadFile
from pymongo.database import Database

from app.database.repositories.wardrobe_repository import get_wardrobe_item_for_user, list_wardrobe_items_for_user
from app.services.wardrobe_embedding_service import (
    embed_new_wardrobe_item,
    get_or_create_item_embedding,
)
from app.services.storage_service import (
    absolute_to_media_url,
    create_wardrobe_item_path,
    save_upload_file,
)
from app.services.cloudinary_service import upload_to_cloudinary
from app.services.subscription_service import ensure_wardrobe_capacity, get_user_quota_snapshot
from app.utils.helpers import serialize_document, serialize_many, utcnow


logger = logging.getLogger("uvicorn.error")


def upload_wardrobe_item(type: str, file: UploadFile, current_user: dict, db: Database) -> dict:
    if type not in {"top", "bottom", "one-piece"}:
        raise HTTPException(status_code=400, detail="Wardrobe item type must be top, bottom, or one-piece")

    ensure_wardrobe_capacity(db, current_user)

    # 1. Save to a temporary local path first to perform embedding efficiently
    from app.core.config import settings
    import uuid
    import os
    
    temp_dir = settings.media_root / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_filename = f"up_{uuid.uuid4().hex}_{file.filename}"
    temp_path = temp_dir / temp_filename
    
    with open(temp_path, "wb") as f:
        f.write(file.file.read())

    # 2. Perform Embedding locally
    embedding_error = None
    vector = None
    try:
        from app.services.wardrobe_embedding_service import _extract_embedding_vector
        from pathlib import Path
        vector = _extract_embedding_vector(Path(temp_path))
    except Exception as e:
        logger.warning(f"Embedding failed during upload: {e}")
        embedding_error = str(e)[:300]

    # 3. Upload to Cloudinary
    try:
        image_url = upload_to_cloudinary(str(temp_path), folder=f"wardrobe/{current_user['_id']}")
    finally:
        # Cleanup temp file
        if temp_path.exists():
            os.remove(temp_path)

    item = {
        "user_id": str(current_user["_id"]),
        "type": type,
        "delete_status": "active",
        "active_status": "active",
        "occasion": None,
        "image_url": image_url,
        "embedding_done": vector is not None,
        "embedding_error": embedding_error,
        "created_at": utcnow(),
    }
    result = db.wardrobe_items.insert_one(item)
    item["_id"] = result.inserted_id

    if vector is not None:
        try:
            from app.services.wardrobe_embedding_service import _embedding_file_path, _load_embeddings, _save_embeddings, _normalize_item_type
            e_path = _embedding_file_path(str(current_user["_id"]))
            payload = _load_embeddings(e_path)
            payload["items"][str(item["_id"])] = {
                "type": _normalize_item_type(type),
                "image_url": image_url,
                "vector": vector,
                "updated_at": utcnow().isoformat(),
            }
            _save_embeddings(e_path, payload)
        except Exception as e:
            logger.error(f"Failed to save embedding vector to pkl: {e}")

    quota_snapshot = get_user_quota_snapshot(db, current_user)
    item.update(
        {
            "wardrobe_limit": quota_snapshot["wardrobe_limit"],
            "wardrobe_used": quota_snapshot["wardrobe_used"],
            "wardrobe_remaining": quota_snapshot["wardrobe_remaining"],
        }
    )
    return serialize_document(item)
    
def upload_wardrobe_item_from_temp(type: str, filename: str, current_user: dict, db: Database) -> dict:
    from app.services.subscription_service import ensure_wardrobe_capacity
    from app.core.config import settings
    import os
    
    ensure_wardrobe_capacity(db, current_user)
    
    temp_path = settings.media_root / "temp" / filename
    if not temp_path.exists():
        raise HTTPException(status_code=404, detail="Temporary image not found or expired.")
        
    # 1. Perform Embedding locally using the existing temp file
    embedding_error = None
    vector = None
    try:
        from app.services.wardrobe_embedding_service import _extract_embedding_vector
        from pathlib import Path
        vector = _extract_embedding_vector(Path(temp_path))
    except Exception as e:
        logger.warning(f"Embedding failed during temp save: {e}")
        embedding_error = str(e)[:300]

    # 2. Upload to Cloudinary
    try:
        image_url = upload_to_cloudinary(str(temp_path), folder=f"wardrobe/{current_user['_id']}")
    finally:
        # Cleanup temp file
        if temp_path.exists():
            os.remove(temp_path)
    
    item = {
        "user_id": str(current_user["_id"]),
        "type": type,
        "delete_status": "active",
        "active_status": "active",
        "occasion": None,
        "image_url": image_url,
        "embedding_done": vector is not None,
        "embedding_error": embedding_error,
        "created_at": utcnow(),
    }
    result = db.wardrobe_items.insert_one(item)
    item["_id"] = result.inserted_id

    if vector is not None:
        try:
            from app.services.wardrobe_embedding_service import _embedding_file_path, _load_embeddings, _save_embeddings, _normalize_item_type
            e_path = _embedding_file_path(str(current_user["_id"]))
            payload = _load_embeddings(e_path)
            payload["items"][str(item["_id"])] = {
                "type": _normalize_item_type(type),
                "image_url": image_url,
                "vector": vector,
                "updated_at": utcnow().isoformat(),
            }
            _save_embeddings(e_path, payload)
        except Exception as e:
            logger.error(f"Failed to save embedding vector to pkl (from temp): {e}")

    quota_snapshot = get_user_quota_snapshot(db, current_user)
    item.update({
        "wardrobe_limit": quota_snapshot["wardrobe_limit"],
        "wardrobe_used": quota_snapshot["wardrobe_used"],
        "wardrobe_remaining": quota_snapshot["wardrobe_remaining"],
    })
    return serialize_document(item)


def list_wardrobe_items(current_user: dict, db: Database, include_inactive: bool = True) -> list[dict]:
    items = list_wardrobe_items_for_user(db, str(current_user["_id"]), include_inactive=include_inactive)
    return serialize_many(items)


def delete_wardrobe_item(item_id: str, current_user: dict, db: Database) -> None:
    item = get_wardrobe_item_for_user(db, item_id, str(current_user["_id"]), include_inactive=True)
    if item is None:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")

    db.wardrobe_items.update_one(
        {"_id": item["_id"]},
        {
            "$set": {
                "delete_status": "inactive",
                "active_status": "inactive",
                "embedding_done": False,
                "embedding_error": None,
                "embedding_updated_at": utcnow(),
            }
        },
    )


def update_wardrobe_item_status(item_id: str, active_status: str, current_user: dict, db: Database) -> dict:
    item = get_wardrobe_item_for_user(db, item_id, str(current_user["_id"]), include_inactive=True)
    if item is None:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")

    if active_status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Active status must be active or inactive")

    if active_status == "active":
        ensure_wardrobe_capacity(db, current_user)

    db.wardrobe_items.update_one(
        {"_id": item["_id"]},
        {
            "$set": {
                "active_status": active_status,
                "embedding_updated_at": utcnow(),
            }
        },
    )
    item["active_status"] = active_status
    return serialize_document(item)


def sync_wardrobe_embeddings(current_user: dict, db: Database) -> dict:
    user_id = str(current_user["_id"])
    items = list_wardrobe_items_for_user(db, user_id)

    created = 0
    existing = 0
    failures: list[str] = []

    for item in items:
        item_id = str(item["_id"])
        try:
            _, created_now = get_or_create_item_embedding(
                user_id=user_id,
                item_id=item_id,
                item_type=item.get("type", ""),
                image_url=item.get("image_url", ""),
            )
            if created_now:
                created += 1
            else:
                existing += 1

            db.wardrobe_items.update_one(
                {"_id": item["_id"]},
                {"$set": {"embedding_done": True, "embedding_error": None, "embedding_updated_at": utcnow()}},
            )
        except Exception as exc:
            message = f"{item_id}: {str(exc)[:220]}"
            failures.append(message)
            db.wardrobe_items.update_one(
                {"_id": item["_id"]},
                {"$set": {"embedding_done": False, "embedding_error": str(exc)[:300]}},
            )

    return {
        "processed": len(items),
        "created": created,
        "existing": existing,
        "failed": len(failures),
        "failures": failures,
    }

__all__ = [
    "delete_wardrobe_item",
    "list_wardrobe_items",
    "sync_wardrobe_embeddings",
    "upload_wardrobe_item",
    "upload_wardrobe_item_from_temp",
    "update_wardrobe_item_status",
]
