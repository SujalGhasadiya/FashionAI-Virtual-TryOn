import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


def ensure_media_directories() -> None:
    for path in (
        settings.media_root,
        settings.user_media_root,
        settings.wardrobe_media_root,
        settings.tryon_media_root,
    ):
        path.mkdir(parents=True, exist_ok=True)


def _safe_extension(filename: str | None, default: str = ".jpg") -> str:
    if not filename:
        return default
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else default


def save_upload_file(upload: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    upload.file.seek(0)
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)


def create_profile_photo_path(user_id: int | str, filename: str | None) -> Path:
    return settings.user_media_root / str(user_id) / f"profile{_safe_extension(filename)}"


def create_override_photo_path(user_id: int | str, filename: str | None) -> Path:
    token = uuid4().hex[:12]
    return settings.user_media_root / str(user_id) / f"override_{token}{_safe_extension(filename)}"


def create_wardrobe_item_path(user_id: int | str, filename: str | None) -> Path:
    token = uuid4().hex[:12]
    return settings.wardrobe_media_root / str(user_id) / f"{token}{_safe_extension(filename)}"


def create_tryon_output_path(user_id: int | str, job_id: int | str) -> Path:
    return settings.tryon_media_root / str(user_id) / f"{job_id}.png"


def absolute_to_media_url(path: str | Path | None) -> str | None:
    if path is None:
        return None
    absolute = Path(path).resolve()
    try:
        relative = absolute.relative_to(settings.media_root.resolve())
    except ValueError:
        return str(path)
    return f"/media/{relative.as_posix()}"


def media_url_to_absolute(media_url: str | None) -> Path | None:
    if not media_url:
        return None
    cleaned = media_url.replace("/media/", "", 1).replace("\\", "/")
    return settings.media_root / cleaned


def delete_file_if_exists(path: str | Path | None) -> None:
    if not path:
        return
    target = Path(path)
    if target.exists() and target.is_file():
        os.remove(target)

__all__ = [
    "absolute_to_media_url",
    "create_override_photo_path",
    "create_profile_photo_path",
    "create_tryon_output_path",
    "create_wardrobe_item_path",
    "delete_file_if_exists",
    "ensure_media_directories",
    "media_url_to_absolute",
    "save_upload_file",
]
