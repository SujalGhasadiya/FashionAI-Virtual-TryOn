from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_object_id(value: str | ObjectId) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


def serialize_document(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if document is None:
        return None
    serialized = dict(document)
    serialized["id"] = str(serialized.pop("_id"))
    return serialized


def serialize_many(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize_document(doc) for doc in documents]

def ensure_local_file(path_or_url: str) -> str:
    """
    If input is a URL, downloads it to temp and returns local path.
    If input is a legacy media URL (/media/...), converts to absolute local path.
    Otherwise returns path as is.
    """
    if not path_or_url:
        return path_or_url
        
    path_str = str(path_or_url)
    
    # Handle Cloudinary / Remote URLs
    if path_str.startswith("http"):
        from app.core.config import settings
        import uuid
        import requests
        import os
        
        # Ensure temp dir exists
        temp_dir = settings.media_root / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        ext = path_str.split(".")[-1].split("?")[0]
        if len(ext) > 4: ext = "jpg" # fallback
        
        local_path = temp_dir / f"dl_{uuid.uuid4().hex}.{ext}"
        
        try:
            response = requests.get(path_str, stream=True, timeout=30)
            if response.status_code == 200:
                with open(local_path, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                return str(local_path)
        except Exception as e:
            print(f"DEBUG: Download failed for {path_str}: {e}")
        return path_str

    # Handle Legacy Local Media URLs
    if path_str.startswith("/media/"):
        from app.services.storage_service import media_url_to_absolute
        abs_path = media_url_to_absolute(path_str)
        return str(abs_path) if abs_path else path_str

    return path_str

__all__ = ["serialize_document", "serialize_many", "to_object_id", "utcnow", "ensure_local_file"]
