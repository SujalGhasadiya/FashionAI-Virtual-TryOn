import math
from typing import Optional

import numpy as np
from PIL import Image

from app.services.wardrobe_embedding_service import get_or_create_item_embedding
from app.services.storage_service import media_url_to_absolute
from app.utils.helpers import ensure_local_file
from pymongo.database import Database
from pathlib import Path
import os


def _safe_norm(vector: list[float]) -> float:
    return math.sqrt(sum(component * component for component in vector))


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> Optional[float]:
    if not vec_a or not vec_b:
        return None
    if len(vec_a) != len(vec_b):
        return None
    norm_a = _safe_norm(vec_a)
    norm_b = _safe_norm(vec_b)
    if norm_a == 0.0 or norm_b == 0.0:
        return None
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    return dot / (norm_a * norm_b)


def _occasion_bonus(top: dict, bottom: dict, occasion: Optional[str]) -> float:
    target_occasion = (occasion or bottom.get("occasion") or "").strip().lower()
    top_occasion = (top.get("occasion") or "").strip().lower()

    if target_occasion and top_occasion == target_occasion:
        return 1.8
    if target_occasion and not top_occasion:
        return 0.2
    if not target_occasion and not top_occasion:
        return 0.5
    return 0.0


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _top_visual_features(top: dict) -> tuple[float, float, float, float, float] | None:
    image_url = top.get("image_url")
    local_path = ensure_local_file(image_url)
    
    if not local_path or not os.path.exists(local_path):
        return None

    try:
        with Image.open(local_path).convert("RGB") as image:
            arr = np.asarray(image, dtype=np.float32) / 255.0
    finally:
        # Cleanup if it was a downloaded file
        if local_path != image_url and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except:
                pass

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)

    # Saturation proxy from HSV components.
    saturation = float(np.mean((max_rgb - min_rgb) / (max_rgb + 1e-6)))
    brightness = float(np.mean((r + g + b) / 3.0))
    contrast = float(np.std((r + g + b) / 3.0))
    color_variance = float(np.mean(np.std(arr, axis=(0, 1))))

    gray = (r + g + b) / 3.0
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    texture = float((np.mean(gx) + np.mean(gy)) / 2.0)

    return saturation, brightness, contrast, color_variance, texture


def _brightness_balance(brightness: float, target: float) -> float:
    # Score near target brightness and decrease as it moves away.
    return _clip01(1.0 - abs(brightness - target) / 0.45)


def _visual_occasion_score(occasion: Optional[str], top: dict) -> float:
    target = (occasion or "").strip().lower()
    if not target:
        return 0.0

    features = _top_visual_features(top)
    if features is None:
        return 0.0

    saturation, brightness, contrast, color_variance, texture = features
    low_sat = _clip01(1.0 - saturation)
    low_texture = _clip01(1.0 - (texture * 5.0))
    low_color_var = _clip01(1.0 - (color_variance * 4.0))

    if target == "party":
        return (saturation * 1.4) + (contrast * 1.1) + (_brightness_balance(brightness, 0.62) * 0.5)
    if target == "office":
        return (low_sat * 1.3) + (low_texture * 1.5) + (low_color_var * 1.0) + (_brightness_balance(brightness, 0.72) * 0.9)
    if target == "formal":
        return (low_sat * 1.5) + (low_texture * 1.8) + (low_color_var * 1.2) + (_brightness_balance(brightness, 0.75) * 1.0)
    if target == "casual":
        return (_brightness_balance(brightness, 0.6) * 0.8) + (_brightness_balance(saturation, 0.45) * 0.9)
    if target == "sport":
        return (brightness * 1.0) + (contrast * 0.7) + (saturation * 0.5)
    if target == "vacation":
        return (brightness * 1.0) + (saturation * 0.9) + (contrast * 0.4)
    return 0.0


def score_top_for_bottom(
    top: dict,
    bottom: dict,
    occasion: Optional[str],
    top_vector: Optional[list[float]],
    bottom_vector: Optional[list[float]],
) -> float:
    score = 0.0
    cosine = _cosine_similarity(top_vector or [], bottom_vector or [])
    if cosine is not None:
        # Map cosine from [-1, 1] to [0, 1].
        embedding_component = ((cosine + 1.0) / 2.0)
    else:
        # Keep recommender functional even when an embedding is unavailable.
        embedding_component = 0.35 if top.get("embedding_done") else 0.15

    occasion_component = _occasion_bonus(top, bottom, occasion)
    style_component = _visual_occasion_score(occasion, top)

    occasion_name = (occasion or "").strip().lower()
    if occasion_name in {"formal", "office"}:
        # For formal/office, style should dominate over raw embedding similarity.
        score += (embedding_component * 2.6) + (style_component * 1.35)
    elif occasion_name:
        score += (embedding_component * 3.1) + (style_component * 1.0)
    else:
        score += embedding_component * 3.4

    score += occasion_component

    if top.get("embedding_done"):
        score += 0.2

    return round(score, 3)


def _get_item_embedding(user_id: str, item: dict, db: Database) -> Optional[list[float]]:
    item_id = str(item.get("_id"))
    try:
        vector, created_now = get_or_create_item_embedding(
            user_id=user_id,
            item_id=item_id,
            item_type=item.get("type", ""),
            image_url=item.get("image_url", ""),
        )
        if created_now:
            db.wardrobe_items.update_one(
                {"_id": item["_id"]},
                {"$set": {"embedding_done": True, "embedding_error": None}},
            )
        return vector
    except Exception as exc:
        db.wardrobe_items.update_one(
            {"_id": item["_id"]},
            {"$set": {"embedding_done": False, "embedding_error": str(exc)[:300]}},
        )
        return None


def rank_tops_for_bottom(
    db: Database,
    user_id: str,
    bottom_item: dict,
    occasion: Optional[str],
    limit: int = 5,
) -> list[tuple[dict, float]]:
    tops = list(
        db.wardrobe_items.find(
            {
                "user_id": user_id,
                "type": "top",
                "delete_status": {"$ne": "inactive"},
                "active_status": "active",
                "_id": {"$ne": bottom_item["_id"]},
            }
        ).sort("created_at", -1)
    )

    bottom_vector = _get_item_embedding(user_id=user_id, item=bottom_item, db=db)

    ranked = []
    for top in tops:
        top_vector = _get_item_embedding(user_id=user_id, item=top, db=db)
        ranked.append((top, score_top_for_bottom(top, bottom_item, occasion, top_vector, bottom_vector)))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[:limit]


def rank_bottoms_for_top(
    db: Database,
    user_id: str,
    top_item: dict,
    occasion: Optional[str],
    limit: int = 5,
) -> list[tuple[dict, float]]:
    """Rank bottoms for a given top item using embeddings and occasion scoring."""
    bottoms = list(
        db.wardrobe_items.find(
            {
                "user_id": user_id,
                "type": "bottom",
                "delete_status": {"$ne": "inactive"},
                "active_status": "active",
                "_id": {"$ne": top_item["_id"]},
            }
        ).sort("created_at", -1)
    )

    top_vector = _get_item_embedding(user_id=user_id, item=top_item, db=db)

    ranked = []
    for bottom in bottoms:
        bottom_vector = _get_item_embedding(user_id=user_id, item=bottom, db=db)
        # Use symmetric scoring function: treat the candidate (bottom) as the "top" argument
        # so the scoring logic (occasion/style) applies to the candidate item correctly.
        ranked.append((bottom, score_top_for_bottom(bottom, top_item, occasion, bottom_vector, top_vector)))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[:limit]

__all__ = ["rank_tops_for_bottom", "rank_bottoms_for_top", "score_top_for_bottom"]
