import pickle
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.core.config import settings
from app.services.storage_service import media_url_to_absolute
from app.utils.helpers import ensure_local_file
import os


def _normalize_item_type(item_type: str) -> str:
    cleaned = (item_type or "").strip().lower()
    if cleaned == "top":
        return "upper"
    if cleaned == "bottom":
        return "lower"
    return "unknown"


@lru_cache(maxsize=1)
def _load_embedding_stack() -> tuple[Any, Any, Any, Any]:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, 2)

    if not settings.clothing_model_path.exists():
        raise RuntimeError(f"Clothing model not found: {settings.clothing_model_path}")

    state = torch.load(settings.clothing_model_path, map_location=device)
    model.load_state_dict(state)
    model.fc = nn.Identity()
    model = model.to(device)
    model.eval()

    transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    return torch, model, transform, device


def _extract_embedding_vector(image_path: Path) -> list[float]:
    torch, model, transform, device = _load_embedding_stack()
    with Image.open(image_path).convert("RGB") as image:
        tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        features = model(tensor)
    return features.squeeze(0).detach().cpu().numpy().astype(np.float32).tolist()


def _embedding_file_path(user_id: str) -> Path:
    return settings.user_wardrobe_embeddings_root / str(user_id) / "embeddings.pkl"


def _load_embeddings(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"items": {}}

    with path.open("rb") as handle:
        data = pickle.load(handle)

    if not isinstance(data, dict):
        return {"items": {}}
    if "items" not in data or not isinstance(data["items"], dict):
        data["items"] = {}
    return data


def _save_embeddings(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        pickle.dump(payload, handle)


def _is_valid_vector(value: Any) -> bool:
    return isinstance(value, list) and len(value) > 0


def embed_new_wardrobe_item(user_id: str, item_id: str, item_type: str, image_url: str) -> None:
    local_path = ensure_local_file(image_url)
    
    try:
        embedding = _extract_embedding_vector(Path(local_path))
    finally:
        # Cleanup if it was a downloaded file
        if local_path != image_url and os.path.exists(local_path):
            os.remove(local_path)
    embeddings_path = _embedding_file_path(user_id)
    payload = _load_embeddings(embeddings_path)

    payload["items"][str(item_id)] = {
        "type": _normalize_item_type(item_type),
        "image_url": image_url,
        "vector": embedding,
        "updated_at": datetime.utcnow().isoformat(),
    }
    _save_embeddings(embeddings_path, payload)


def get_user_embeddings(user_id: str) -> dict[str, Any]:
    return _load_embeddings(_embedding_file_path(user_id)).get("items", {})


def get_or_create_item_embedding(
    user_id: str,
    item_id: str,
    item_type: str,
    image_url: str,
) -> tuple[list[float], bool]:
    embeddings_path = _embedding_file_path(user_id)
    payload = _load_embeddings(embeddings_path)

    existing = payload["items"].get(str(item_id))
    if isinstance(existing, dict) and _is_valid_vector(existing.get("vector")):
        return existing["vector"], False

    local_path = ensure_local_file(image_url)
    
    try:
        embedding = _extract_embedding_vector(Path(local_path))
    finally:
        # Cleanup if it was a downloaded file
        if local_path != image_url and os.path.exists(local_path):
            os.remove(local_path)
    payload["items"][str(item_id)] = {
        "type": _normalize_item_type(item_type),
        "image_url": image_url,
        "vector": embedding,
        "updated_at": datetime.utcnow().isoformat(),
    }
    _save_embeddings(embeddings_path, payload)
    return embedding, True


def remove_wardrobe_embedding(user_id: str, item_id: str) -> None:
    embeddings_path = _embedding_file_path(user_id)
    if not embeddings_path.exists():
        return

    payload = _load_embeddings(embeddings_path)
    if str(item_id) not in payload["items"]:
        return

    payload["items"].pop(str(item_id), None)
    _save_embeddings(embeddings_path, payload)


__all__ = [
    "embed_new_wardrobe_item",
    "get_or_create_item_embedding",
    "get_user_embeddings",
    "remove_wardrobe_embedding",
]