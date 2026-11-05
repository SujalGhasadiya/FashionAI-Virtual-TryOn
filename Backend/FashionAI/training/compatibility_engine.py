from __future__ import annotations

import os
import pickle
import random
import sys
import types
from dataclasses import dataclass
from typing import Optional

import cv2
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

EMBEDDINGS_PATH = r"D:\VirtualTryon\FashionAI\datasets\user_wardrobes\mycloset\embeddings.pkl"
DATASET_ROOT = r"D:\VirtualTryon\FashionAI\datasets\user_wardrobes\mycloset\items"

# Candidate pool size for stage-1 retrieval.
TOP_CANDIDATES_PER_CLASS = 120
FULL_INNER_POOL = 36
FULL_OUTER_POOL = 20
FULL_BOTTOM_POOL = 48
FULL_PAIR_POOL = 160
EMBEDDING_HUBNESS_K = 24
EMBEDDING_HUBNESS_BLEND = 0.55
FORMAL_FACE_PENALTY_BUDGET = 96
TOPWEAR_RERANK_CAP = 320

_FACE_CASCADE: Optional[object] = None

# Strictness flags for cleaner, less random results.
ALLOW_UNKNOWN_CATEGORY = True
ALLOW_UNISEX_FOR_GENDERED_QUERY = False
DEFAULT_TARGET_GENDER = "WOMEN"

# Normalized categories used in rules.
CATEGORY_ALIASES = {
    "TEE": "TOP",
    "TEES": "TOP",
    "TANK": "TOP",
    "TANKS": "TOP",
    "TSHIRT": "TOP",
    "TSHIRTS": "TOP",
    "TOPS": "TOP",
    "BLOUSE": "SHIRT",
    "BLOUSES": "SHIRT",
    "SHIRTS": "SHIRT",
    "POLO": "SHIRT",
    "POLOS": "SHIRT",
    "BLAZER": "OUTERWEAR",
    "BLAZERS": "OUTERWEAR",
    "JACKET": "OUTERWEAR",
    "JACKETS": "OUTERWEAR",
    "COAT": "OUTERWEAR",
    "COATS": "OUTERWEAR",
    "VEST": "OUTERWEAR",
    "VESTS": "OUTERWEAR",
    "SWEATER": "OUTERWEAR",
    "SWEATERS": "OUTERWEAR",
    "SWEATSHIRT": "OUTERWEAR",
    "SWEATSHIRTS": "OUTERWEAR",
    "HOODIE": "OUTERWEAR",
    "HOODIES": "OUTERWEAR",
    "OUTWEAR": "OUTERWEAR",
    "OUTERWEAR": "OUTERWEAR",
    "TROUSER": "PANTS",
    "TROUSERS": "PANTS",
    "JEAN": "PANTS",
    "JEANS": "PANTS",
    "PANTS": "PANTS",
    "SHORT": "SHORTS",
    "SHORTS": "SHORTS",
    "SKIRTS": "SKIRT",
    "LEGGING": "PANTS",
    "LEGGINGS": "PANTS",
}

OCCASION_PROFILES = {
    "casual": {
        "top_allowed": {"TOP", "SHIRT", "OUTERWEAR"},
        "bottom_allowed": {"PANTS", "SHORTS", "SKIRT"},
        "top_preferred": {"TOP", "SHIRT"},
        "bottom_preferred": {"PANTS", "SHORTS", "SKIRT"},
    },
    "office": {
        "top_allowed": {"SHIRT", "OUTERWEAR"},
        "bottom_allowed": {"PANTS", "SKIRT"},
        "top_preferred": {"SHIRT", "OUTERWEAR"},
        "bottom_preferred": {"PANTS", "SKIRT"},
    },
    "party": {
        "top_allowed": {"TOP", "SHIRT", "OUTERWEAR"},
        "bottom_allowed": {"SKIRT", "PANTS"},
        "top_preferred": {"TOP", "SHIRT", "OUTERWEAR"},
        "bottom_preferred": {"SKIRT", "PANTS"},
    },
    "sport": {
        "top_allowed": {"TOP", "OUTERWEAR"},
        "bottom_allowed": {"SHORTS", "PANTS"},
        "top_preferred": {"TOP"},
        "bottom_preferred": {"SHORTS", "PANTS"},
    },
    "vacation": {
        "top_allowed": {"TOP", "SHIRT", "OUTERWEAR"},
        "bottom_allowed": {"SHORTS", "SKIRT", "PANTS"},
        "top_preferred": {"TOP", "SHIRT"},
        "bottom_preferred": {"SHORTS", "SKIRT"},
    },
    "formal": {
        "top_allowed": {"SHIRT", "OUTERWEAR"},
        "bottom_allowed": {"PANTS", "SKIRT"},
        "top_preferred": {"SHIRT", "OUTERWEAR"},
        "bottom_preferred": {"PANTS", "SKIRT"},
    },
}

STYLE_KEYWORD_WEIGHTS = {
    "casual": {
        "bonus": {
            "TEE": 0.06,
            "TSHIRT": 0.06,
            "KNIT": 0.05,
            "COTTON": 0.05,
            "DENIM": 0.04,
        },
        "penalty": {
            "SEQUIN": 0.12,
            "SATIN": 0.08,
            "BLAZER": 0.07,
        },
    },
    "party": {
        "bonus": {
            "LACE": 0.10,
            "SEQUIN": 0.12,
            "RUFFLE": 0.07,
            "SATIN": 0.08,
            "CHIFFON": 0.08,
            "BLAZER": 0.10,
            "JACKET": 0.10,
            "JACKETS": 0.10,
        },
        "penalty": {
            "HOODIE": 0.20,
            "SWEATSHIRT": 0.20,
            "GRAPHIC": 0.14,
            "JOGGER": 0.18,
        },
    },
    "office": {
        "bonus": {
            "BLAZER": 0.10,
            "SHIRT": 0.08,
            "TROUSER": 0.08,
        },
        "penalty": {
            "GRAPHIC": 0.14,
            "HOODIE": 0.18,
            "SHORTS": 0.12,
        },
    },
    "formal": {
        "bonus": {
            "BLAZER": 0.10,
            "SATIN": 0.08,
        },
        "penalty": {
            "GRAPHIC": 0.16,
            "HOODIE": 0.20,
            "SWEATSHIRT": 0.20,
        },
    },
    "sport": {
        "bonus": {
            "SPORT": 0.16,
            "ATHLETIC": 0.16,
            "ACTIVE": 0.14,
            "JERSEY": 0.12,
            "TANK": 0.10,
            "DRY": 0.10,
        },
        "penalty": {
            "LACE": 0.16,
            "SEQUIN": 0.18,
            "SATIN": 0.14,
            "BLAZER": 0.18,
            "CHIFFON": 0.14,
        },
    },
    "vacation": {
        "bonus": {
            "FLORAL": 0.12,
            "PRINT": 0.08,
            "LINEN": 0.12,
            "BEACH": 0.14,
            "RESORT": 0.14,
            "BOHO": 0.10,
            "CROCHET": 0.10,
            "CAMI": 0.08,
            "TANK": 0.08,
        },
        "penalty": {
            "BLAZER": 0.14,
            "TROUSER": 0.10,
            "PINSTRIPE": 0.10,
            "FORMAL": 0.10,
        },
    },
}

OCCASION_ALIASES = {
    "vaction": "vacation",
    "vacay": "vacation",
    "travel": "vacation",
}

PARTY_HARD_BAN_TOKENS = {
    "DENIM",
    "SHORT",
    "SHORTS",
    "JOGGER",
    "SPORT",
    "ATHLETIC",
    "DISTRESSED",
    "FRAY",
    "FRAYED",
    "RIPPED",
    "GRAPHIC",
    "HOODIE",
    "SWEATSHIRT",
}

PARTY_POSITIVE_TOKENS = {
    "LACE",
    "SEQUIN",
    "RUFFLE",
    "SATIN",
    "CHIFFON",
    "BLAZER",
    "JACKET",
    "JACKETS",
    "SKIRT",
    "DRESS",
}

PARTY_SOFT_BAN_TOKENS = {
    "TEE",
    "TEES",
    "TSHIRT",
    "TSHIRTS",
    "TANK",
    "TANKS",
    "CAMI",
    "CAMISOLE",
    "RIBBED",
    "COTTON",
    "BASIC",
}

PARTY_STRUCTURED_TOKENS = {
    "BLAZER",
    "JACKET",
    "JACKETS",
    "COAT",
    "COATS",
    "SATIN",
    "CHIFFON",
    "LACE",
    "SEQUIN",
}

SPORT_POSITIVE_TOKENS = {
    "SPORT",
    "ATHLETIC",
    "ACTIVE",
    "TRAIN",
    "GYM",
    "RUN",
    "JERSEY",
    "TANK",
    "BRA",
    "TRACK",
    "DRY",
    "FIT",
}

VACATION_POSITIVE_TOKENS = {
    "LINEN",
    "BEACH",
    "RESORT",
    "TROPICAL",
    "FLORAL",
    "LIGHT",
    "BREEZY",
    "COTTON",
    "CAMI",
    "SLEEVELESS",
}

ONE_PIECE_GARMENT_TOKENS = {
    "DRESS",
    "GOWN",
    "MAXI",
    "MIDI",
    "MINIDRESS",
    "JUMPSUIT",
    "ROMPER",
    "OVERALL",
}

MALE_HINT_TOKENS = {"MEN", "MAN", "MALE", "BOY", "BOYS", "MENS", "GENT", "GENTS"}
FEMALE_HINT_TOKENS = {"WOMEN", "WOMAN", "FEMALE", "GIRL", "GIRLS", "LADY", "LADIES", "WOMENS"}
FORMAL_BOTTOM_PANTS_TOKENS = {"PANT", "PANTS", "TROUSER", "TROUSERS", "JEAN", "JEANS", "CHINO", "SLACK"}
SKIRT_HINT_TOKENS = {"SKIRT", "SKIRTS"}
MENS_FORMAL_TOP_TOKENS = {
    "SHIRT",
    "SHIRTS",
    "BLAZER",
    "BLAZERS",
    "JACKET",
    "JACKETS",
    "COAT",
    "COATS",
    "SWEATER",
    "SWEATERS",
}
MENS_FORMAL_TOP_BAN_TOKENS = {
    "TEE",
    "TEES",
    "TSHIRT",
    "TSHIRTS",
    "TANK",
    "TANKS",
    "SHORTSLEEVE",
    "SHORT-SLEEVE",
    "SLEEVELESS",
    "HOODIE",
    "HOODIES",
    "SWEATSHIRT",
    "SWEATSHIRTS",
    "GRAPHIC",
}
FEMININE_STYLE_TOKENS = {
    "BOW",
    "RIBBON",
    "LACE",
    "RUFFLE",
    "RUFFLES",
    "FRILL",
    "PEPLUM",
    "CHIFFON",
    "SATIN",
    "FLORAL",
    "LEGGING",
    "LEGGINGS",
}

FORMAL_BOTTOM_STYLE_TOKENS = {
    "BELT",
    "PLEAT",
    "PLEATED",
    "PINSTRIPE",
    "STRIPE",
    "SLACK",
    "SLACKS",
    "TROUSER",
    "TROUSERS",
    "TAILORED",
    "PENCIL",
    "MIDI",
}

CASUAL_REVEALING_TOP_TOKENS = {
    "CAMI",
    "CAMISOLE",
    "BRALETTE",
    "TANK",
    "TUBE",
    "CROP",
    "CROPPED",
    "SLEEVELESS",
    "SPAGHETTI",
}

GRAPHIC_CASUAL_TOP_TOKENS = {
    "GRAPHIC",
    "SLOGAN",
    "PRINT",
    "TYPO",
}

STRUCTURED_TOP_TOKENS = {
    "SHIRT",
    "BLOUSE",
    "BLAZER",
    "JACKET",
    "KNIT",
    "CARDIGAN",
    "SWEATER",
}

FORMAL_TOP_BAN_TOKENS = {
    "GRAPHIC",
    "SLOGAN",
    "PRINT",
    "HOODIE",
    "HOODIES",
    "SWEATSHIRT",
    "SWEATSHIRTS",
    "ATHLETIC",
    "SPORT",
    "DISTRESSED",
    "RIPPED",
}

SPORT_TOP_BAN_TOKENS = {
    "BLAZER",
    "BLAZERS",
    "SATIN",
    "LACE",
    "CHIFFON",
    "SEQUIN",
}

VACATION_TOP_BAN_TOKENS = {
    "BLAZER",
    "BLAZERS",
    "PINSTRIPE",
    "FORMAL",
}

TOP_SEMANTIC_CATEGORIES = {"TOP", "SHIRT", "OUTERWEAR"}
BOTTOM_SEMANTIC_CATEGORIES = {"PANTS", "SHORTS", "SKIRT"}
INNER_TOP_CATEGORIES = {"TOP", "SHIRT"}
WOMENS_TOPWEAR_CATEGORIES = {"TOP", "SHIRT", "OUTERWEAR"}

# Occasion-aware planning used by topwear recommendation.
# This is intentionally structural (candidate shaping + selection constraints)
# rather than tiny score-percentage adjustments.
OCCASION_CATEGORY_TARGET_RATIO = {
    "casual": {"TOP": 0.60, "SHIRT": 0.30, "OUTERWEAR": 0.10},
    "office": {"SHIRT": 0.65, "OUTERWEAR": 0.35, "TOP": 0.00},
    "formal": {"OUTERWEAR": 0.55, "SHIRT": 0.45, "TOP": 0.00},
    "party": {"OUTERWEAR": 0.45, "TOP": 0.35, "SHIRT": 0.20},
    "sport": {"TOP": 0.80, "OUTERWEAR": 0.20, "SHIRT": 0.00},
    "vacation": {"TOP": 0.60, "SHIRT": 0.35, "OUTERWEAR": 0.05},
}

OCCASION_INTENT_PRIORS = {
    "casual": {
        "favor": {"TEE", "TEES", "TSHIRT", "TSHIRTS", "TOP", "KNIT", "COTTON", "DENIM"},
        "disfavor": {"SEQUIN", "SATIN", "CHIFFON", "BLAZER", "PINSTRIPE"},
    },
    "office": {
        "favor": {"SHIRT", "SHIRTS", "BLOUSE", "BLOUSES", "BLAZER", "TROUSER", "TAILORED", "PINSTRIPE"},
        "disfavor": {"GRAPHIC", "SLOGAN", "HOODIE", "SWEATSHIRT", "SPORT", "ATHLETIC", "SEQUIN"},
    },
    "formal": {
        "favor": {"BLAZER", "SATIN", "CHIFFON", "SILK", "TAILORED", "ELEGANT", "JACKET", "COAT"},
        "disfavor": {"GRAPHIC", "SLOGAN", "HOODIE", "SWEATSHIRT", "SPORT", "ATHLETIC", "DENIM"},
    },
    "party": {
        "favor": {"LACE", "SEQUIN", "RUFFLE", "SATIN", "CHIFFON", "BLAZER", "JACKET", "GLOSS"},
        "disfavor": {"HOODIE", "SWEATSHIRT", "JOGGER", "GRAPHIC", "ATHLETIC", "GYM"},
    },
    "sport": {
        "favor": {"SPORT", "ATHLETIC", "ACTIVE", "JERSEY", "TANK", "TRAIN", "GYM", "DRY", "FIT"},
        "disfavor": {"LACE", "SEQUIN", "SATIN", "CHIFFON", "BLAZER", "PINSTRIPE", "ELEGANT"},
    },
    "vacation": {
        "favor": {"FLORAL", "PRINT", "LINEN", "BEACH", "RESORT", "BOHO", "CROCHET", "CAMI", "SLEEVELESS"},
        "disfavor": {"BLAZER", "PINSTRIPE", "FORMAL", "TAILORED", "SWEATSHIRT", "HOODIE"},
    },
}

@dataclass
class Item:
    name: str
    vector: np.ndarray
    class_name: str
    gender: str
    category: str


@dataclass
class FullOutfit:
    inner_top: Item
    outerwear: Item
    bottom: Item
    score: float


def normalize_category(raw: str) -> str:
    return CATEGORY_ALIASES.get(raw.upper(), raw.upper())


def parse_metadata(name: str) -> tuple[str, str]:
    tokens = [tok.upper() for tok in name.replace(".", "_").split("_") if tok]

    gender = "UNISEX"
    category = "UNKNOWN"

    for tok in tokens:
        if tok == "MEN":
            gender = "MEN"
        elif tok == "WOMEN":
            gender = "WOMEN"

    for tok in tokens:
        norm = normalize_category(tok)
        if norm in {"TOP", "SHIRT", "OUTERWEAR", "PANTS", "SHORTS", "SKIRT"}:
            category = norm
            break

    return gender, category


def get_image_path(item_name: str, class_name: str) -> str:
    return os.path.join(DATASET_ROOT, class_name, item_name)


def cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray, matrix_norms: np.ndarray) -> np.ndarray:
    q = query_vec.astype(np.float32).reshape(-1)
    q_norm = np.linalg.norm(q) + 1e-12
    sims = matrix.dot(q) / (matrix_norms * q_norm + 1e-12)
    return sims


def hubness_corrected_similarity(
    query_vec: np.ndarray,
    matrix: np.ndarray,
    matrix_norms: np.ndarray,
    base_sims: np.ndarray,
    probe_idx: np.ndarray,
    k: int = EMBEDDING_HUBNESS_K,
    blend: float = EMBEDDING_HUBNESS_BLEND,
) -> np.ndarray:
    """Apply CSLS-like hubness correction on a probe set and blend with cosine sims."""
    if probe_idx.size < 3:
        return base_sims

    probe_mat = matrix[probe_idx].astype(np.float32)
    probe_norms = np.linalg.norm(probe_mat, axis=1)
    probe_norms = np.maximum(probe_norms, 1e-12)

    pair = probe_mat.dot(probe_mat.T) / (np.outer(probe_norms, probe_norms) + 1e-12)
    np.fill_diagonal(pair, -1.0)

    k_eff = max(1, min(k, probe_idx.size - 1))
    row_topk = np.partition(pair, -k_eff, axis=1)[:, -k_eff:]
    r_x = row_topk.mean(axis=1)

    probe_sims = base_sims[probe_idx]
    q_k = max(1, min(k_eff, probe_sims.size))
    r_q = float(np.mean(np.sort(probe_sims)[-q_k:]))

    csls_probe = 2.0 * probe_sims - r_q - r_x

    out = base_sims.copy()
    out[probe_idx] = (1.0 - blend) * probe_sims + blend * csls_probe
    return out


def get_dominant_color(img_path: str, color_cache: dict[str, np.ndarray]) -> np.ndarray:
    if img_path in color_cache:
        return color_cache[img_path]

    image = cv2.imread(img_path)
    if image is None:
        color_cache[img_path] = np.array([0.0, 0.0, 0.0], dtype=np.float32)
        return color_cache[img_path]

    image = cv2.resize(image, (50, 50))
    avg_bgr = image.mean(axis=(0, 1)).astype(np.float32)
    avg_rgb = avg_bgr[::-1]

    color_cache[img_path] = avg_rgb
    return avg_rgb


def detect_pattern(img_path: str, pattern_cache: dict[str, bool]) -> bool:
    if img_path in pattern_cache:
        return pattern_cache[img_path]

    image = cv2.imread(img_path)
    if image is None:
        pattern_cache[img_path] = False
        return False

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = float(np.var(gray))

    patterned = variance > 800.0
    pattern_cache[img_path] = patterned
    return patterned


def compatible_gender(g1: str, g2: str) -> bool:
    # g1 is treated as query gender in this project.
    if g1 == "UNISEX":
        return True

    if g2 == "UNISEX":
        return ALLOW_UNISEX_FOR_GENDERED_QUERY

    return g1 == g2


def choose_target_gender(
    query_gender: str,
    upper_items: list[Item],
    lower_items: list[Item],
    top_sim: np.ndarray,
    bottom_sim: np.ndarray,
    probe_k: int = 300,
) -> str:
    if query_gender in {"MEN", "WOMEN"}:
        return query_gender

    votes = {"MEN": 0.0, "WOMEN": 0.0}

    top_idx = np.argsort(-top_sim)[:probe_k]
    bottom_idx = np.argsort(-bottom_sim)[:probe_k]

    for i in top_idx:
        g = upper_items[int(i)].gender
        if g in votes:
            votes[g] += float(top_sim[int(i)])

    for j in bottom_idx:
        g = lower_items[int(j)].gender
        if g in votes:
            votes[g] += float(bottom_sim[int(j)])

    if votes["MEN"] == 0.0 and votes["WOMEN"] == 0.0:
        return DEFAULT_TARGET_GENDER

    return "MEN" if votes["MEN"] > votes["WOMEN"] else "WOMEN"


def gender_matches_target(item_gender: str, target_gender: str) -> bool:
    if item_gender == target_gender:
        return True
    if item_gender == "UNISEX":
        return ALLOW_UNISEX_FOR_GENDERED_QUERY
    return False


def semantic_class_ok(item: Item, expected_class: str) -> bool:
    # If category is unknown from filename, keep item but with lower confidence.
    if item.category == "UNKNOWN":
        return ALLOW_UNKNOWN_CATEGORY

    if expected_class == "upper":
        return item.category in TOP_SEMANTIC_CATEGORIES

    if expected_class == "lower":
        return item.category in BOTTOM_SEMANTIC_CATEGORIES

    return False


def category_score(top_cat: str, bottom_cat: str, profile: dict[str, set[str]]) -> float:
    score = 0.0

    top_allowed = profile["top_allowed"]
    bottom_allowed = profile["bottom_allowed"]
    top_preferred = profile["top_preferred"]
    bottom_preferred = profile["bottom_preferred"]

    if top_cat not in top_allowed:
        return -0.50
    if bottom_cat not in bottom_allowed:
        return -0.50

    score += 0.08
    score += 0.08

    if top_cat in top_preferred:
        score += 0.08
    if bottom_cat in bottom_preferred:
        score += 0.08

    # Helpful pair priors.
    if top_cat in {"TOP", "SHIRT", "OUTERWEAR"} and bottom_cat in {"PANTS", "SHORTS", "SKIRT"}:
        score += 0.06

    if top_cat == "OUTERWEAR" and bottom_cat == "SHORTS":
        score -= 0.03

    return score


def style_keyword_score(item_name: str, occasion: str) -> float:
    cfg = STYLE_KEYWORD_WEIGHTS.get(normalize_occasion_name(occasion))
    if not cfg:
        return 0.0

    tokens = [tok.upper() for tok in item_name.replace(".", "_").split("_") if tok]
    token_set = set(tokens)

    score = 0.0
    for kw, val in cfg.get("bonus", {}).items():
        if kw in token_set:
            score += val

    for kw, val in cfg.get("penalty", {}).items():
        if kw in token_set:
            score -= val

    return score


def normalize_occasion_name(occasion: str) -> str:
    key = (occasion or "casual").strip().lower()
    key = OCCASION_ALIASES.get(key, key)
    if key not in OCCASION_PROFILES:
        key = "casual"
    return key


def has_style_token(item_name: str, keywords: set[str]) -> bool:
    tokens = {tok.upper() for tok in item_name.replace(".", "_").split("_") if tok}
    return any(kw in tokens for kw in keywords)


def has_any_token(item_name: str, keywords: set[str]) -> bool:
    return has_style_token(item_name, keywords)


def is_one_piece_item(item_name: str) -> bool:
    return has_any_token(item_name, ONE_PIECE_GARMENT_TOKENS)


def party_item_allowed(item: Item) -> bool:
    # Hard ban obvious casual-only terms for party mode.
    if has_any_token(item.name, PARTY_HARD_BAN_TOKENS):
        return False
    return True


def party_outerwear_allowed(item: Item) -> bool:
    # For party layering, keep only blazer/jacket-like outerwear.
    if item.category != "OUTERWEAR":
        return False
    return has_any_token(item.name, {"BLAZER", "JACKET", "JACKETS", "COAT", "COATS"})


def party_presence_bonus(inner: Item, outer: Optional[Item], bottom: Item) -> float:
    names = [inner.name, bottom.name]
    if outer is not None:
        names.append(outer.name)

    # Encourage at least one strong party signal in the whole outfit.
    has_signal = any(has_any_token(name, PARTY_POSITIVE_TOKENS) for name in names)
    if has_signal:
        return 0.12
    return -0.25


def item_tokens(item_name: str) -> set[str]:
    return {tok.upper() for tok in item_name.replace(".", "_").split("_") if tok}


def conflicts_with_target_gender(item_name: str, target_gender: str) -> bool:
    tokens = item_tokens(item_name)
    if target_gender == "MEN":
        return any(t in FEMALE_HINT_TOKENS for t in tokens)
    if target_gender == "WOMEN":
        return any(t in MALE_HINT_TOKENS for t in tokens)
    return False


def is_formal_mens_bottom(item: Item) -> bool:
    # For MEN formal/office mode, require pants-like bottoms.
    if item.category == "PANTS":
        return True
    if item.category == "SKIRT":
        return False

    tokens = item_tokens(item.name)
    has_pants_hint = any(t in FORMAL_BOTTOM_PANTS_TOKENS for t in tokens)
    has_skirt_hint = any(t in SKIRT_HINT_TOKENS for t in tokens)
    has_feminine_hint = any(t in FEMININE_STYLE_TOKENS for t in tokens)
    if has_skirt_hint:
        return False
    if has_feminine_hint:
        return False
    if item.category == "UNKNOWN":
        return has_pants_hint
    return item.category in {"PANTS"}


def is_formal_mens_top(item: Item) -> bool:
    tokens = item_tokens(item.name)
    has_formal_top_hint = any(t in MENS_FORMAL_TOP_TOKENS for t in tokens)
    has_casual_hint = any(t in MENS_FORMAL_TOP_BAN_TOKENS for t in tokens)
    has_feminine_hint = any(t in FEMININE_STYLE_TOKENS for t in tokens)

    if has_casual_hint or has_feminine_hint:
        return False
    if item.category in {"SHIRT", "OUTERWEAR"}:
        return True
    if item.category == "UNKNOWN":
        return has_formal_top_hint
    return False


def bottom_context_score(inner: Item, outer: Item, bottom: Item, occasion: str) -> float:
    inner_t = item_tokens(inner.name)
    outer_t = item_tokens(outer.name)
    bottom_t = item_tokens(bottom.name)

    score = 0.0

    has_structured_outer = any(t in outer_t for t in {"BLAZER", "JACKET", "JACKETS", "COAT", "COATS", "LEATHER", "BIKER", "MOTO"})
    bottom_is_denim = any(t in bottom_t for t in {"JEAN", "JEANS", "DENIM"})

    # Structured outerwear often works best with pants/jeans in real-world styling.
    if has_structured_outer:
        if bottom.category == "PANTS":
            score += 0.14
        if bottom.category == "SKIRT":
            score -= 0.06

    # Shirt/blouse + blazer + pants is a strong classic silhouette.
    if ("SHIRT" in inner_t or "BLOUSE" in inner_t) and has_structured_outer and bottom.category == "PANTS":
        score += 0.08

    if occasion.lower() in {"casual", "office", "formal"} and bottom.category == "PANTS":
        score += 0.08

    if occasion.lower() == "party":
        # Keep both options possible, but avoid forcing skirts all the time.
        if bottom.category == "SKIRT":
            score += 0.03
        if bottom_is_denim:
            score += 0.05

    return score


def color_harmony_score(top_color: np.ndarray, bottom_color: np.ndarray) -> float:
    dist = float(np.linalg.norm(top_color - bottom_color))
    score = max(0.0, (150.0 - dist) / 300.0)
    if 40.0 < dist < 120.0:
        score += 0.08
    return score


def topwear_bottom_color_fit_score(top_color: np.ndarray, bottom_color: np.ndarray, occasion: str) -> float:
    """
    For topwear-on-bottom recommendations, avoid flat same-color pairing dominance
    and prefer moderate contrast that looks intentional.
    """
    dist = float(np.linalg.norm(top_color - bottom_color))
    score = 0.0

    # Very close color often looks too flat for this pairing task.
    if dist < 18.0:
        score -= 0.20
    elif dist < 35.0:
        score -= 0.10
    elif 35.0 <= dist <= 120.0:
        score += 0.14
    elif dist <= 170.0:
        score += 0.06
    else:
        score -= 0.04

    th, ts, tv = rgb_to_hsv01(top_color)
    bh, bs, bv = rgb_to_hsv01(bottom_color)
    _ = th, bh

    # Neutral bottom + at least mildly saturated top is usually better than all-neutral.
    if bs < 0.16 and ts > 0.22:
        score += 0.05

    # Same low-saturation + same brightness tends to look dull.
    if abs(tv - bv) < 0.08 and max(ts, bs) < 0.20:
        score -= 0.08

    occ = normalize_occasion_name(occasion)
    if occ in {"office", "formal"} and dist > 170.0:
        score -= 0.06
    if occ == "party" and 80.0 <= dist <= 190.0:
        score += 0.05

    return score


def topwear_style_signature(item_name: str) -> str:
    tokens = item_tokens(item_name)
    priority = [
        "BLAZER",
        "JACKET",
        "SHIRT",
        "BLOUSE",
        "TEE",
        "TSHIRT",
        "TOP",
        "KNIT",
        "SWEATER",
        "SATIN",
        "LACE",
        "RUFFLE",
        "GRAPHIC",
    ]
    for t in priority:
        if t in tokens:
            return t
    return "PLAIN"


def occasion_intent_score(top_item: Item, occ: str) -> float:
    priors = OCCASION_INTENT_PRIORS.get(occ)
    if not priors:
        return 0.0

    tokens = item_tokens(top_item.name)
    hit_favor = sum(1 for t in tokens if t in priors["favor"])
    hit_disfavor = sum(1 for t in tokens if t in priors["disfavor"])

    score = 0.0
    if hit_favor > 0:
        score += min(0.36, 0.12 * hit_favor)
    if hit_disfavor > 0:
        score -= min(0.40, 0.14 * hit_disfavor)

    return score


def build_category_target_plan(occ: str, top_k: int, available_by_category: dict[str, int]) -> dict[str, int]:
    ratio = OCCASION_CATEGORY_TARGET_RATIO.get(occ, OCCASION_CATEGORY_TARGET_RATIO["casual"])

    # Base target count from ratio, then distribute remaining slots by largest fractional remainder.
    raw = {cat: ratio.get(cat, 0.0) * float(top_k) for cat in WOMENS_TOPWEAR_CATEGORIES}
    targets = {cat: min(available_by_category.get(cat, 0), int(raw[cat])) for cat in WOMENS_TOPWEAR_CATEGORIES}

    remaining = top_k - sum(targets.values())
    if remaining <= 0:
        return targets

    remainder_order = sorted(
        WOMENS_TOPWEAR_CATEGORIES,
        key=lambda c: (raw[c] - int(raw[c]), ratio.get(c, 0.0)),
        reverse=True,
    )

    while remaining > 0:
        moved = False
        for cat in remainder_order:
            if targets[cat] >= available_by_category.get(cat, 0):
                continue
            targets[cat] += 1
            remaining -= 1
            moved = True
            if remaining == 0:
                break
        if not moved:
            break

    return targets


def vector_cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return float(np.dot(a, b) / (na * nb + 1e-12))


def is_formal_like_bottom(item: Item) -> bool:
    if item.category == "SKIRT":
        return True
    tokens = item_tokens(item.name)
    return any(t in FORMAL_BOTTOM_STYLE_TOKENS for t in tokens)


def topwear_bottom_suitability_score(bottom_item: Item, top_item: Item, occasion: str) -> float:
    score = 0.0
    top_tokens = item_tokens(top_item.name)
    occ = normalize_occasion_name(occasion)

    # For formal-looking bottoms, avoid very casual/revealing tops.
    if is_formal_like_bottom(bottom_item) and occ in {"casual", "office", "formal"}:
        if any(t in CASUAL_REVEALING_TOP_TOKENS for t in top_tokens):
            score -= 0.28
        if any(t in GRAPHIC_CASUAL_TOP_TOKENS for t in top_tokens):
            score -= 0.22
        if any(t in STRUCTURED_TOP_TOKENS for t in top_tokens):
            score += 0.16

    if bottom_item.category == "SHORTS":
        if occ in {"office", "formal"}:
            if top_item.category in {"TOP", "SHIRT"}:
                score += 0.04
            if top_item.category == "OUTERWEAR":
                score -= 0.12
        else:
            if top_item.category in {"TOP", "SHIRT"}:
                score += 0.06

    if top_item.category == "UNKNOWN":
        score -= 0.06

    # Stronger occasion identity so casual/sport/vacation don't collapse to same tops.
    if occ == "sport":
        if top_item.category == "TOP":
            score += 0.18
        if top_item.category == "SHIRT":
            score -= 0.16
        if top_item.category == "OUTERWEAR":
            score -= 0.10

    if occ == "vacation":
        if top_item.category in {"TOP", "SHIRT"}:
            score += 0.10
        if top_item.category == "OUTERWEAR":
            score -= 0.14

    if occ == "party":
        has_party_signal = any(t in PARTY_POSITIVE_TOKENS for t in top_tokens)
        has_soft_casual = any(t in PARTY_SOFT_BAN_TOKENS for t in top_tokens)
        has_party_structure = any(t in PARTY_STRUCTURED_TOKENS for t in top_tokens)

        if has_party_signal:
            score += 0.20
        if has_party_structure:
            score += 0.08
        if has_soft_casual and not has_party_signal:
            score -= 0.26
        if top_item.category == "TOP" and not has_party_signal:
            score -= 0.14

    return score


def is_lifestyle_view_filename(item_name: str) -> bool:
    n = item_name.lower()
    return (
        "_additional" in n
        or "look" in n
        or "outfit" in n
        or "model" in n
    )


def top_item_allowed_for_occasion(top_item: Item, occ: str) -> bool:
    tokens = item_tokens(top_item.name)

    if occ in {"formal", "office"}:
        if top_item.category not in {"SHIRT", "OUTERWEAR"}:
            return False
        if is_lifestyle_view_filename(top_item.name):
            return False
        if any(t in FORMAL_TOP_BAN_TOKENS for t in tokens):
            return False
        return True

    if occ == "sport":
        if any(t in SPORT_TOP_BAN_TOKENS for t in tokens):
            return False
        return True

    if occ == "vacation":
        if any(t in VACATION_TOP_BAN_TOKENS for t in tokens):
            return False
        return True

    if occ == "party":
        if has_any_token(top_item.name, PARTY_HARD_BAN_TOKENS):
            return False
        if is_lifestyle_view_filename(top_item.name):
            return False

        has_party_signal = any(t in PARTY_POSITIVE_TOKENS for t in tokens)
        has_party_structure = any(t in PARTY_STRUCTURED_TOKENS for t in tokens)
        has_soft_casual = any(t in PARTY_SOFT_BAN_TOKENS for t in tokens)

        # Party mode should avoid plain casual tops unless there is a clear dressy cue.
        if top_item.category == "TOP" and has_soft_casual and not has_party_signal:
            return False
        if top_item.category == "OUTERWEAR" and not (has_party_signal or has_party_structure):
            return False

        return True

    return True


def estimate_image_ahash(img_path: str, ahash_cache: dict[str, int]) -> int:
    if img_path in ahash_cache:
        return ahash_cache[img_path]

    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        ahash_cache[img_path] = -1
        return -1

    tiny = cv2.resize(img, (8, 8), interpolation=cv2.INTER_AREA)
    mean_val = float(tiny.mean())
    bits = (tiny > mean_val).astype(np.uint8).flatten()
    h = 0
    for b in bits:
        h = (h << 1) | int(b)

    ahash_cache[img_path] = h
    return h


def penalize_person_photo(img_path: str, face_cache: dict[str, float]) -> float:
    if img_path in face_cache:
        return face_cache[img_path]

    image = cv2.imread(img_path)
    if image is None:
        face_cache[img_path] = 0.0
        return 0.0

    try:
        global _FACE_CASCADE
        if _FACE_CASCADE is None:
            _FACE_CASCADE = cv2.CascadeClassifier(
                os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
            )

        cascade = _FACE_CASCADE
        if cascade is None or cascade.empty():
            face_cache[img_path] = 0.0
            return 0.0
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(28, 28))
        face_cache[img_path] = -0.26 if len(faces) > 0 else 0.0
    except Exception:
        face_cache[img_path] = 0.0

    return face_cache[img_path]


def rgb_to_hsv01(rgb: np.ndarray) -> tuple[float, float, float]:
    color = np.array([[rgb.astype(np.uint8)]], dtype=np.uint8)
    hsv = cv2.cvtColor(color, cv2.COLOR_RGB2HSV)[0, 0].astype(np.float32)
    # OpenCV HSV ranges: H [0,179], S [0,255], V [0,255]
    return float(hsv[0] / 179.0), float(hsv[1] / 255.0), float(hsv[2] / 255.0)


def hue_distance(h1: float, h2: float) -> float:
    d = abs(h1 - h2)
    return min(d, 1.0 - d)


def fashion_color_score(
    inner_rgb: np.ndarray,
    outer_rgb: np.ndarray,
    bottom_rgb: np.ndarray,
    occasion: str,
) -> float:
    ih, isat, iv = rgb_to_hsv01(inner_rgb)
    oh, osat, ov = rgb_to_hsv01(outer_rgb)
    bh, bsat, bv = rgb_to_hsv01(bottom_rgb)

    score = 0.0

    d_ib = hue_distance(ih, bh)
    d_io = hue_distance(ih, oh)
    d_ob = hue_distance(oh, bh)

    # Complementary accents can look strong and intentional.
    if 0.40 <= d_ib <= 0.60:
        score += 0.10
    if 0.40 <= d_io <= 0.60 or 0.40 <= d_ob <= 0.60:
        score += 0.06

    # Analogous palettes can work if there is enough saturation.
    if d_ib < 0.10 and (isat + bsat) / 2.0 > 0.20:
        score += 0.04

    # Neutral + accent balance.
    sats = [isat, osat, bsat]
    neutral_count = sum(1 for s in sats if s < 0.16)
    accent_count = sum(1 for s in sats if s > 0.28)
    if neutral_count >= 1 and accent_count >= 1:
        score += 0.07

    # Penalize flat monochrome gray-beige stacks.
    if max(d_ib, d_io, d_ob) < 0.08 and max(sats) < 0.22:
        score -= 0.22

    # Occasion-aware color expectations.
    occasion_l = normalize_occasion_name(occasion)
    if occasion_l == "party":
        if accent_count == 0:
            score -= 0.12
    elif occasion_l in {"office", "formal"}:
        if accent_count > 2:
            score -= 0.06

    # Tiny penalty if all pieces have nearly identical brightness.
    vals = [iv, ov, bv]
    if max(vals) - min(vals) < 0.08:
        score -= 0.05

    return score


def color_palette_signature(inner_rgb: np.ndarray, outer_rgb: np.ndarray, bottom_rgb: np.ndarray) -> str:
    def bucket(rgb: np.ndarray) -> tuple[int, int]:
        h, s, _v = rgb_to_hsv01(rgb)
        if s < 0.14:
            return (9, 0)  # neutral bucket
        return (int(h * 8) % 8, int(s * 3))

    b1 = bucket(inner_rgb)
    b2 = bucket(outer_rgb)
    b3 = bucket(bottom_rgb)
    return f"{b1}-{b2}-{b3}"


def pattern_score(top_patterned: bool, bottom_patterned: bool) -> float:
    if top_patterned and bottom_patterned:
        return -0.10
    if top_patterned != bottom_patterned:
        return 0.04
    return 0.0


def load_items() -> tuple[list[Item], list[Item]]:
    with open(EMBEDDINGS_PATH, "rb") as f:
        if "numpy._core" not in sys.modules:
            import numpy.core as numpy_core
            import numpy.core._multiarray_umath as numpy_multiarray_umath
            import numpy.core.multiarray as numpy_multiarray
            import numpy.core.numeric as numpy_numeric

            numpy_core_shim = types.ModuleType("numpy._core")
            numpy_core_shim.__dict__.update(numpy_core.__dict__)
            sys.modules["numpy._core"] = numpy_core_shim
            sys.modules["numpy._core.multiarray"] = numpy_multiarray
            sys.modules["numpy._core._multiarray_umath"] = numpy_multiarray_umath
            sys.modules["numpy._core.numeric"] = numpy_numeric

        raw = pickle.load(f)

    upper_items: list[Item] = []
    lower_items: list[Item] = []

    for name, data in raw.items():
        class_name = data["class"]
        vector = np.asarray(data["vector"], dtype=np.float32).reshape(-1)
        gender, category = parse_metadata(name)

        item = Item(
            name=name,
            vector=vector,
            class_name=class_name,
            gender=gender,
            category=category,
        )

        if class_name == "upper":
            upper_items.append(item)
        elif class_name == "lower":
            lower_items.append(item)

    return upper_items, lower_items


def build_matrix(items: list[Item]) -> tuple[np.ndarray, np.ndarray]:
    if not items:
        return np.empty((0, 0), dtype=np.float32), np.empty((0,), dtype=np.float32)

    matrix = np.vstack([it.vector for it in items]).astype(np.float32)
    norms = np.linalg.norm(matrix, axis=1)
    norms = np.maximum(norms, 1e-12)
    return matrix, norms


def recommend_topwear_for_bottom(
    query_item_name: str,
    occasion: str = "casual",
    top_k: int = 3,
    candidate_pool: int = TOP_CANDIDATES_PER_CLASS,
    target_gender: Optional[str] = None,
    allow_gender_fallback: bool = True,
    include_outerwear: bool = True,
) -> list[tuple[Item, float]]:
    upper_items, lower_items = load_items()
    name_to_item = {it.name: it for it in upper_items + lower_items}

    if query_item_name not in name_to_item:
        raise ValueError(f"Query item not found: {query_item_name}")

    query = name_to_item[query_item_name]
    if query.class_name != "lower" and query.category not in BOTTOM_SEMANTIC_CATEGORIES:
        raise ValueError("Query item must be a bottomwear item (pants/shorts/skirt).")

    occ = normalize_occasion_name(occasion)
    profile = OCCASION_PROFILES.get(occ, OCCASION_PROFILES["casual"])

    upper_matrix, upper_norms = build_matrix(upper_items)
    q_vec = query.vector
    base_top_sim = cosine_similarity(q_vec, upper_matrix, upper_norms)
    probe_idx = np.argsort(-base_top_sim)[: min(len(upper_items), max(candidate_pool * 4, 720))]
    top_sim = hubness_corrected_similarity(q_vec, upper_matrix, upper_norms, base_top_sim, probe_idx)

    resolved_gender = target_gender.upper() if target_gender else None
    if resolved_gender not in {"MEN", "WOMEN"}:
        lower_matrix, lower_norms = build_matrix(lower_items)
        bottom_sim = cosine_similarity(q_vec, lower_matrix, lower_norms)
        resolved_gender = choose_target_gender(query.gender, upper_items, lower_items, top_sim, bottom_sim)

    top_allowed = set(profile["top_allowed"])
    top_preferred = set(profile["top_preferred"])

    if not include_outerwear:
        top_allowed.discard("OUTERWEAR")
        top_preferred.discard("OUTERWEAR")

    if resolved_gender == "MEN" and occ in {"formal", "office"}:
        top_allowed = {"SHIRT", "OUTERWEAR"}
        top_preferred = {"SHIRT", "OUTERWEAR"}

    # Root fix: build an occasion-guided shortlist before reranking.
    # Without this, nearest-neighbor retrieval tends to collapse casual/sport/vacation
    # into the same tops for many query bottoms.
    guided_scores = top_sim.copy()
    for idx, top_item in enumerate(upper_items):
        score = guided_scores[idx]

        # Category-level occasion alignment.
        if top_item.category in top_preferred:
            score += 0.16
        elif top_item.category in top_allowed:
            score += 0.06
        else:
            score -= 0.42

        # Occasion lexical intent.
        score += occasion_intent_score(top_item, occ)

        # Hard validity gate penalty so invalid items do not dominate shortlist.
        if not top_item_allowed_for_occasion(top_item, occ):
            score -= 0.48

        if not gender_matches_target(top_item.gender, resolved_gender):
            score -= 0.48

        if conflicts_with_target_gender(top_item.name, resolved_gender):
            score -= 0.36

        guided_scores[idx] = score

    top_idx = np.argsort(-guided_scores)[: min(len(upper_items), max(candidate_pool * 2, TOPWEAR_RERANK_CAP))]

    color_cache: dict[str, np.ndarray] = {}
    pattern_cache: dict[str, bool] = {}

    ranked: list[tuple[Item, float, str, str, int]] = []
    query_path = get_image_path(query.name, query.class_name)
    query_color = get_dominant_color(query_path, color_cache)
    query_patterned = detect_pattern(query_path, pattern_cache)
    face_cache: dict[str, float] = {}
    face_penalty_budget_left = FORMAL_FACE_PENALTY_BUDGET
    ahash_cache: dict[str, int] = {}

    for i in top_idx:
        top_item = upper_items[int(i)]

        if is_one_piece_item(top_item.name):
            continue
        if not gender_matches_target(top_item.gender, resolved_gender):
            continue
        if conflicts_with_target_gender(top_item.name, resolved_gender):
            continue
        if not semantic_class_ok(top_item, "upper"):
            continue
        if top_item.category not in top_allowed and not (
            ALLOW_UNKNOWN_CATEGORY and top_item.category == "UNKNOWN"
        ):
            continue
        if not top_item_allowed_for_occasion(top_item, occ):
            continue
        if resolved_gender == "MEN" and occ in {"formal", "office"}:
            if not is_formal_mens_top(top_item):
                continue

        top_path = get_image_path(top_item.name, top_item.class_name)
        top_color = get_dominant_color(top_path, color_cache)
        top_patterned = detect_pattern(top_path, pattern_cache)
        if occ in {"office", "formal"} and face_penalty_budget_left > 0:
            person_penalty = penalize_person_photo(top_path, face_cache)
            face_penalty_budget_left -= 1
        else:
            person_penalty = 0.0

        score = float(top_sim[int(i)])
        if top_item.category in top_preferred:
            score += 0.08
        score += style_keyword_score(top_item.name, occasion)
        score += topwear_bottom_color_fit_score(top_color, query_color, occasion)
        score += pattern_score(top_patterned, query_patterned)
        score += topwear_bottom_suitability_score(query, top_item, occasion)
        score += person_penalty
        if occ in {"formal", "office"} and person_penalty < 0.0:
            score -= 0.24

        if occ == "party" and not has_any_token(top_item.name, PARTY_POSITIVE_TOKENS):
            score -= 0.24
            if top_item.category == "TOP":
                score -= 0.12
        if occ == "sport" and not has_any_token(top_item.name, SPORT_POSITIVE_TOKENS):
            score -= 0.22
        if occ == "vacation" and not has_any_token(top_item.name, VACATION_POSITIVE_TOKENS):
            score -= 0.12

        # Occasion-specific category priors for clearer behavior separation.
        if occ == "sport":
            if top_item.category == "TOP":
                score += 0.14
            elif top_item.category in {"SHIRT", "OUTERWEAR"}:
                score -= 0.12
        elif occ == "vacation":
            if top_item.category in {"TOP", "SHIRT"}:
                score += 0.08
            elif top_item.category == "OUTERWEAR":
                score -= 0.16
        elif occ == "party":
            if top_item.category == "OUTERWEAR":
                score += 0.05

        h, s, _v = rgb_to_hsv01(top_color)
        if s < 0.14:
            color_sig = "NEUTRAL"
        else:
            color_sig = f"H{int(h * 8) % 8}"
        style_sig = topwear_style_signature(top_item.name)
        img_hash = estimate_image_ahash(top_path, ahash_cache)

        ranked.append((top_item, score, color_sig, style_sig, img_hash))

    ranked.sort(key=lambda x: x[1], reverse=True)

    # Occasion-conditioned planning for category mix.
    available_by_category = {
        "TOP": 0,
        "SHIRT": 0,
        "OUTERWEAR": 0,
    }
    for top_item, _score, _color_sig, _style_sig, _img_hash in ranked:
        if top_item.category in available_by_category:
            available_by_category[top_item.category] += 1

    category_target = build_category_target_plan(occ, top_k, available_by_category)

    selected: list[tuple[Item, float]] = []
    selected_entries: list[tuple[Item, float, str, str, int]] = []
    used_names: set[str] = set()
    used_color_sig: set[str] = set()
    used_style_sig: set[str] = set()
    used_img_hashes: set[int] = set()
    used_neutral = 0
    used_category_counts: dict[str, int] = {"TOP": 0, "SHIRT": 0, "OUTERWEAR": 0}
    if occ in {"party", "vacation"}:
        neutral_budget = 0
    elif occ == "sport":
        neutral_budget = 1
    else:
        neutral_budget = 1 if top_k <= 4 else 2

    if not ranked:
        if target_gender is not None and allow_gender_fallback:
            return recommend_topwear_for_bottom(
                query_item_name=query_item_name,
                occasion=occasion,
                top_k=top_k,
                candidate_pool=candidate_pool,
                target_gender=None,
                allow_gender_fallback=False,
            )
        return selected

    max_r = max(x[1] for x in ranked)
    min_r = min(x[1] for x in ranked)
    score_span = max(max_r - min_r, 1e-12)

    # Diversity-aware reranking: keep quality high while suppressing near-duplicates.
    candidate_ranked = ranked[: min(len(ranked), max(candidate_pool, 220))]
    while len(selected) < top_k and candidate_ranked:
        best_idx = -1
        best_mmr = -1e9

        for idx, (top_item, score, color_sig, style_sig, img_hash) in enumerate(candidate_ranked):
            if top_item.name in used_names:
                continue
            if img_hash in used_img_hashes and img_hash != -1:
                continue

            max_sim = 0.0
            if selected_entries:
                max_sim = max(vector_cosine(top_item.vector, prev_item.vector) for prev_item, *_ in selected_entries)

            # Hard-stop very close embedding neighbors to avoid visually repeated tops.
            if max_sim > 0.968:
                continue

            repeated_color = color_sig in used_color_sig
            repeated_style = style_sig in used_style_sig
            allow_formal_repeat = occ in {"formal", "office"} and len(selected) <= 1
            if repeated_color and repeated_style and len(selected) >= 1 and not allow_formal_repeat:
                # Prevent same-style/same-color clones from dominating top-k.
                continue

            score_norm = (score - min_r) / score_span
            mmr = 0.70 * score_norm - 0.30 * max_sim

            # Structural occasion identity: encourage target category mix.
            cat = top_item.category
            if cat in category_target:
                cur = used_category_counts.get(cat, 0)
                tgt = category_target.get(cat, 0)
                if cur < tgt:
                    mmr += 0.20
                else:
                    mmr -= 0.12

            mmr += occasion_intent_score(top_item, occ)

            if repeated_color:
                mmr -= 0.12
            if repeated_style:
                mmr -= 0.12
            if color_sig == "NEUTRAL" and used_neutral >= neutral_budget:
                mmr -= 0.16

            # Reinforce occasion identity at selection time so categories diverge by use case.
            if occ == "sport" and top_item.category != "TOP":
                mmr -= 0.22
            elif occ == "vacation" and top_item.category == "OUTERWEAR":
                mmr -= 0.24
            elif occ in {"formal", "office"} and top_item.category == "TOP":
                mmr -= 0.22
            elif occ == "party" and top_item.category == "SHIRT":
                mmr -= 0.06
                if not has_any_token(top_item.name, PARTY_POSITIVE_TOKENS):
                    mmr -= 0.10

            if mmr > best_mmr:
                best_mmr = mmr
                best_idx = idx

        if best_idx < 0:
            break

        top_item, score, color_sig, style_sig, img_hash = candidate_ranked.pop(best_idx)
        selected.append((top_item, score))
        selected_entries.append((top_item, score, color_sig, style_sig, img_hash))
        used_names.add(top_item.name)
        used_color_sig.add(color_sig)
        used_style_sig.add(style_sig)
        if top_item.category in used_category_counts:
            used_category_counts[top_item.category] += 1
        if color_sig == "NEUTRAL":
            used_neutral += 1
        if img_hash != -1:
            used_img_hashes.add(img_hash)

    # Fallback fill if diversity constraints are too strict.
    if len(selected) < top_k:
        for top_item, score, color_sig, style_sig, img_hash in ranked:
            if top_item.name in used_names:
                continue
            if img_hash in used_img_hashes and img_hash != -1:
                continue

            repeated_color = color_sig in used_color_sig
            repeated_style = style_sig in used_style_sig
            allow_formal_repeat = occ in {"formal", "office"} and len(selected) <= 1
            if repeated_color and repeated_style and len(selected) >= 1 and not allow_formal_repeat:
                continue

            if color_sig == "NEUTRAL" and used_neutral >= neutral_budget:
                continue

            if occ == "sport" and top_item.category != "TOP":
                continue
            if occ == "vacation" and top_item.category == "OUTERWEAR":
                continue
            if occ in {"formal", "office"} and top_item.category == "TOP":
                continue

            if selected_entries:
                max_sim = max(vector_cosine(top_item.vector, prev_item.vector) for prev_item, *_ in selected_entries)
                if max_sim > 0.975:
                    continue

            selected.append((top_item, score))
            selected_entries.append((top_item, score, color_sig, style_sig, img_hash))
            used_names.add(top_item.name)
            used_color_sig.add(color_sig)
            used_style_sig.add(style_sig)
            if top_item.category in used_category_counts:
                used_category_counts[top_item.category] += 1
            if color_sig == "NEUTRAL":
                used_neutral += 1
            if img_hash != -1:
                used_img_hashes.add(img_hash)
            if len(selected) >= top_k:
                break

    # Final soft fill for formal/office to avoid returning too few results.
    if len(selected) < top_k and occ in {"formal", "office"}:
        for top_item, score, color_sig, style_sig, img_hash in ranked:
            if top_item.name in used_names:
                continue
            if img_hash in used_img_hashes and img_hash != -1:
                continue
            if top_item.category not in {"SHIRT", "OUTERWEAR"}:
                continue
            if selected_entries:
                max_sim = max(vector_cosine(top_item.vector, prev_item.vector) for prev_item, *_ in selected_entries)
                if max_sim > 0.992:
                    continue

            selected.append((top_item, score))
            selected_entries.append((top_item, score, color_sig, style_sig, img_hash))
            used_names.add(top_item.name)
            if top_item.category in used_category_counts:
                used_category_counts[top_item.category] += 1
            if img_hash != -1:
                used_img_hashes.add(img_hash)
            if len(selected) >= top_k:
                break

    if not selected and target_gender is not None and allow_gender_fallback:
        return recommend_topwear_for_bottom(
            query_item_name=query_item_name,
            occasion=occasion,
            top_k=top_k,
            candidate_pool=candidate_pool,
            target_gender=None,
            allow_gender_fallback=False,
        )

    return selected


def recommend_womens_topwear_for_bottom(
    query_item_name: str,
    occasion: str = "casual",
    top_k: int = 3,
    candidate_pool: int = TOP_CANDIDATES_PER_CLASS,
    include_outerwear: bool = True,
) -> list[tuple[Item, float]]:
    """Backward-compatible wrapper for women-focused topwear recommendation."""
    return recommend_topwear_for_bottom(
        query_item_name=query_item_name,
        occasion=occasion,
        top_k=top_k,
        candidate_pool=candidate_pool,
        target_gender="WOMEN",
        include_outerwear=include_outerwear,
    )


def recommend_outfits(
    query_item_name: str,
    occasion: str = "casual",
    top_k: int = 3,
    candidate_pool: int = TOP_CANDIDATES_PER_CLASS,
    target_gender: Optional[str] = None,
    allow_gender_fallback: bool = True,
) -> list[tuple[Item, Item, float]]:
    upper_items, lower_items = load_items()

    name_to_item = {it.name: it for it in upper_items + lower_items}
    if query_item_name not in name_to_item:
        raise ValueError(f"Query item not found: {query_item_name}")

    query = name_to_item[query_item_name]
    occ = normalize_occasion_name(occasion)
    profile = OCCASION_PROFILES.get(occ, OCCASION_PROFILES["casual"])

    upper_matrix, upper_norms = build_matrix(upper_items)
    lower_matrix, lower_norms = build_matrix(lower_items)

    q_vec = query.vector

    top_sim = cosine_similarity(q_vec, upper_matrix, upper_norms)
    bottom_sim = cosine_similarity(q_vec, lower_matrix, lower_norms)
    resolved_gender = target_gender.upper() if target_gender else None
    if resolved_gender not in {"MEN", "WOMEN"}:
        resolved_gender = choose_target_gender(query.gender, upper_items, lower_items, top_sim, bottom_sim)

    top_allowed = set(profile["top_allowed"])
    bottom_allowed = set(profile["bottom_allowed"])
    top_preferred = set(profile["top_preferred"])
    bottom_preferred = set(profile["bottom_preferred"])

    # Keep formal/office MEN outputs aligned with expected styling.
    if resolved_gender == "MEN":
        bottom_allowed.discard("SKIRT")
        bottom_preferred.discard("SKIRT")
        if occ in {"formal", "office"}:
            top_allowed = {"SHIRT", "OUTERWEAR"}
            top_preferred = {"SHIRT", "OUTERWEAR"}

    adjusted_profile = {
        "top_allowed": top_allowed,
        "bottom_allowed": bottom_allowed,
        "top_preferred": top_preferred,
        "bottom_preferred": bottom_preferred,
    }

    # Use broader retrieval when strict gender filtering is requested,
    # otherwise nearest neighbors are often too narrow and miss valid pairs.
    if target_gender in {"MEN", "WOMEN"}:
        top_pool = min(len(upper_items), max(candidate_pool, 800))
        bottom_pool = min(len(lower_items), max(candidate_pool, 2000))
    else:
        top_pool = min(len(upper_items), candidate_pool)
        bottom_pool = min(len(lower_items), candidate_pool)

    top_idx = np.argsort(-top_sim)[:top_pool]
    bottom_idx = np.argsort(-bottom_sim)[:bottom_pool]

    color_cache: dict[str, np.ndarray] = {}
    pattern_cache: dict[str, bool] = {}

    outfits: list[tuple[Item, Item, float]] = []

    for i in top_idx:
        top_item = upper_items[int(i)]

        # Top+bottom mode should avoid one-piece garments such as dresses.
        if is_one_piece_item(top_item.name):
            continue

        if conflicts_with_target_gender(top_item.name, resolved_gender):
            continue

        if not gender_matches_target(top_item.gender, resolved_gender):
            continue
        if not semantic_class_ok(top_item, "upper"):
            continue
        if top_item.category not in adjusted_profile["top_allowed"] and not (
            ALLOW_UNKNOWN_CATEGORY and top_item.category == "UNKNOWN"
        ):
            continue
        if resolved_gender == "MEN" and occ in {"formal", "office"}:
            if not is_formal_mens_top(top_item):
                continue

        top_path = get_image_path(top_item.name, top_item.class_name)
        top_color = get_dominant_color(top_path, color_cache)
        top_patterned = detect_pattern(top_path, pattern_cache)

        for j in bottom_idx:
            bottom_item = lower_items[int(j)]

            if conflicts_with_target_gender(bottom_item.name, resolved_gender):
                continue

            bottom_gender_ok = gender_matches_target(bottom_item.gender, resolved_gender)
            # For office/formal, enforce strict gender on bottoms to avoid women/unisex leakage.
            if not bottom_gender_ok and occ in {"formal", "office"}:
                continue
            if not bottom_gender_ok and occ not in {"formal", "office"}:
                continue
            if not semantic_class_ok(bottom_item, "lower"):
                continue
            if bottom_item.category not in adjusted_profile["bottom_allowed"] and not (
                ALLOW_UNKNOWN_CATEGORY and bottom_item.category == "UNKNOWN"
            ):
                continue
            if resolved_gender == "MEN" and occ in {"formal", "office"}:
                if not is_formal_mens_bottom(bottom_item):
                    continue

            # Avoid using the exact same item as query in pair output.
            if top_item.name == query_item_name or bottom_item.name == query_item_name:
                continue

            bottom_path = get_image_path(bottom_item.name, bottom_item.class_name)
            bottom_color = get_dominant_color(bottom_path, color_cache)
            bottom_patterned = detect_pattern(bottom_path, pattern_cache)

            sim_score = float((top_sim[int(i)] + bottom_sim[int(j)]) / 2.0)
            score = sim_score
            score += category_score(top_item.category, bottom_item.category, adjusted_profile)
            score += style_keyword_score(top_item.name, occasion)
            score += style_keyword_score(bottom_item.name, occasion)
            score += color_harmony_score(top_color, bottom_color)
            score += pattern_score(top_patterned, bottom_patterned)

            outfits.append((top_item, bottom_item, score))

    outfits.sort(key=lambda x: x[2], reverse=True)

    # Relaxed fallback pool: if strict filters produce nothing,
    # build candidates from nearest neighbors with minimal constraints.
    if not outfits:
        for i in top_idx:
            top_item = upper_items[int(i)]

            if is_one_piece_item(top_item.name):
                continue

            if top_item.name == query_item_name:
                continue

            if conflicts_with_target_gender(top_item.name, resolved_gender):
                continue

            if not gender_matches_target(top_item.gender, resolved_gender):
                continue
            if not semantic_class_ok(top_item, "upper"):
                continue
            if top_item.category not in adjusted_profile["top_allowed"] and not (
                ALLOW_UNKNOWN_CATEGORY and top_item.category == "UNKNOWN"
            ):
                continue
            if resolved_gender == "MEN" and occ in {"formal", "office"}:
                if not is_formal_mens_top(top_item):
                    continue

            top_path = get_image_path(top_item.name, top_item.class_name)
            top_color = get_dominant_color(top_path, color_cache)
            top_patterned = detect_pattern(top_path, pattern_cache)

            for j in bottom_idx:
                bottom_item = lower_items[int(j)]
                if bottom_item.name == query_item_name:
                    continue

                if conflicts_with_target_gender(bottom_item.name, resolved_gender):
                    continue

                bottom_gender_ok = gender_matches_target(bottom_item.gender, resolved_gender)
                if not bottom_gender_ok and occ in {"formal", "office"}:
                    continue
                if not bottom_gender_ok and occ not in {"formal", "office"}:
                    continue
                if not semantic_class_ok(bottom_item, "lower"):
                    continue
                if bottom_item.category not in adjusted_profile["bottom_allowed"] and not (
                    ALLOW_UNKNOWN_CATEGORY and bottom_item.category == "UNKNOWN"
                ):
                    continue
                if resolved_gender == "MEN" and occ in {"formal", "office"}:
                    if not is_formal_mens_bottom(bottom_item):
                        continue

                bottom_path = get_image_path(bottom_item.name, bottom_item.class_name)
                bottom_color = get_dominant_color(bottom_path, color_cache)
                bottom_patterned = detect_pattern(bottom_path, pattern_cache)

                sim_score = float((top_sim[int(i)] + bottom_sim[int(j)]) / 2.0)
                score = sim_score
                score += 0.5 * style_keyword_score(top_item.name, occasion)
                score += 0.5 * style_keyword_score(bottom_item.name, occasion)
                score += 0.5 * color_harmony_score(top_color, bottom_color)
                score += 0.5 * pattern_score(top_patterned, bottom_patterned)

                outfits.append((top_item, bottom_item, score))

        outfits.sort(key=lambda x: x[2], reverse=True)

    # Diversity filter: do not repeat same top/bottom in top_k output.
    selected: list[tuple[Item, Item, float]] = []
    used_tops: set[str] = set()
    used_bottoms: set[str] = set()

    if occ == "party":
        # In top+bottom mode, prefer visibly party-like tops first,
        # but do not require outerwear (that was for full-outfit mode).
        for top_item, bottom_item, score in outfits:
            is_party_top = has_style_token(top_item.name, PARTY_POSITIVE_TOKENS)
            if not is_party_top:
                continue

            selected.append((top_item, bottom_item, score))
            used_tops.add(top_item.name)
            used_bottoms.add(bottom_item.name)
            break

    for top_item, bottom_item, score in outfits:
        if top_item.name in used_tops or bottom_item.name in used_bottoms:
            continue

        selected.append((top_item, bottom_item, score))
        used_tops.add(top_item.name)
        used_bottoms.add(bottom_item.name)

        if len(selected) >= top_k:
            break

    # Fallback: if a forced gender produced no matches, retry with auto gender.
    if not selected and target_gender is not None and allow_gender_fallback:
        return recommend_outfits(
            query_item_name=query_item_name,
            occasion=occasion,
            top_k=top_k,
            candidate_pool=candidate_pool,
            target_gender=None,
            allow_gender_fallback=False,
        )

    return selected


def recommend_full_outfits(
    query_item_name: str,
    occasion: str = "party",
    top_k: int = 3,
    candidate_pool: int = TOP_CANDIDATES_PER_CLASS,
    include_outerwear: bool = True,
    target_gender: Optional[str] = None,
) -> list[FullOutfit]:
    upper_items, lower_items = load_items()

    name_to_item = {it.name: it for it in upper_items + lower_items}
    if query_item_name not in name_to_item:
        raise ValueError(f"Query item not found: {query_item_name}")

    query = name_to_item[query_item_name]
    occ = normalize_occasion_name(occasion)
    profile = OCCASION_PROFILES.get(occ, OCCASION_PROFILES["casual"])

    upper_matrix, upper_norms = build_matrix(upper_items)
    lower_matrix, lower_norms = build_matrix(lower_items)

    q_vec = query.vector

    top_sim = cosine_similarity(q_vec, upper_matrix, upper_norms)
    bottom_sim = cosine_similarity(q_vec, lower_matrix, lower_norms)
    resolved_gender = target_gender.upper() if target_gender else None
    if resolved_gender not in {"MEN", "WOMEN"}:
        resolved_gender = choose_target_gender(query.gender, upper_items, lower_items, top_sim, bottom_sim)

    sorted_upper = np.argsort(-top_sim)
    sorted_lower = np.argsort(-bottom_sim)

    inner_limit = min(candidate_pool, FULL_INNER_POOL)
    outer_limit = min(candidate_pool, FULL_OUTER_POOL)
    bottom_limit = min(candidate_pool, FULL_BOTTOM_POOL)
    pair_limit = FULL_PAIR_POOL

    inner_idx = []
    outer_idx = []
    for i in sorted_upper:
        item = upper_items[int(i)]
        if not gender_matches_target(item.gender, resolved_gender):
            continue
        if not semantic_class_ok(item, "upper"):
            continue
        if occ == "party" and not party_item_allowed(item):
            continue
        if item.category in INNER_TOP_CATEGORIES:
            inner_idx.append(int(i))
        if item.category == "OUTERWEAR" or has_style_token(item.name, {"BLAZER", "JACKET", "JACKETS"}):
            if occ == "party" and not party_outerwear_allowed(item):
                continue
            outer_idx.append(int(i))
        if len(inner_idx) >= inner_limit and len(outer_idx) >= outer_limit:
            break

    bottom_idx = []
    for j in sorted_lower:
        item = lower_items[int(j)]
        if not gender_matches_target(item.gender, resolved_gender):
            continue
        if not semantic_class_ok(item, "lower"):
            continue
        if occ == "party" and not party_item_allowed(item):
            continue
        if item.category not in profile["bottom_allowed"]:
            continue
        bottom_idx.append(int(j))
        if len(bottom_idx) >= bottom_limit:
            break

    if not inner_idx or not bottom_idx:
        return []

    if not include_outerwear:
        raise ValueError("Full outfit mode requires outerwear. Set include_outerwear=True.")

    if not outer_idx:
        return []

    color_cache: dict[str, np.ndarray] = {}
    pattern_cache: dict[str, bool] = {}

    inner_features: dict[int, tuple[np.ndarray, bool, float]] = {}
    for i in inner_idx:
        inner = upper_items[i]
        if inner.name == query_item_name:
            continue
        if inner.category not in profile["top_allowed"]:
            continue
        if occ == "party" and not party_item_allowed(inner):
            continue

        inner_path = get_image_path(inner.name, inner.class_name)
        inner_color = get_dominant_color(inner_path, color_cache)
        inner_pattern = detect_pattern(inner_path, pattern_cache)
        inner_style = style_keyword_score(inner.name, occasion)
        inner_features[i] = (inner_color, inner_pattern, inner_style)

    bottom_features: dict[int, tuple[np.ndarray, bool, float]] = {}
    for j in bottom_idx:
        bottom = lower_items[j]
        if bottom.name == query_item_name:
            continue
        bottom_path = get_image_path(bottom.name, bottom.class_name)
        bottom_color = get_dominant_color(bottom_path, color_cache)
        bottom_pattern = detect_pattern(bottom_path, pattern_cache)
        bottom_style = style_keyword_score(bottom.name, occasion)
        bottom_features[j] = (bottom_color, bottom_pattern, bottom_style)

    outer_features: dict[int, tuple[np.ndarray, bool, float]] = {}
    if include_outerwear:
        for k in outer_idx:
            outer = upper_items[k]
            if outer.name == query_item_name:
                continue
            if not gender_matches_target(outer.gender, resolved_gender):
                continue
            outer_path = get_image_path(outer.name, outer.class_name)
            outer_color = get_dominant_color(outer_path, color_cache)
            outer_pattern = detect_pattern(outer_path, pattern_cache)
            outer_style = style_keyword_score(outer.name, occasion)
            outer_features[k] = (outer_color, outer_pattern, outer_style)

    # Stage A: shortlist strong inner-bottom pairs first.
    base_pairs: list[tuple[int, int, float]] = []
    for i, (inner_color, inner_pattern, inner_style) in inner_features.items():
        inner = upper_items[i]
        for j, (bottom_color, bottom_pattern, bottom_style) in bottom_features.items():
            bottom = lower_items[j]

            if occasion.lower() == "party" and not party_item_allowed(bottom):
                continue

            base_score = 0.55 * float(top_sim[i]) + 0.45 * float(bottom_sim[j])
            base_score += category_score(inner.category, bottom.category, profile)
            base_score += inner_style + bottom_style
            base_score += color_harmony_score(inner_color, bottom_color)
            base_score += pattern_score(inner_pattern, bottom_pattern)

            base_pairs.append((i, j, base_score))

    if not base_pairs:
        return []

    base_pairs.sort(key=lambda x: x[2], reverse=True)
    base_pairs = base_pairs[:pair_limit]

    # Stage B: add outerwear on top of shortlisted pairs.
    candidates: list[FullOutfit] = []

    for i, j, pair_score in base_pairs:
        inner = upper_items[i]
        bottom = lower_items[j]
        inner_color, inner_pattern, _inner_style = inner_features[i]
        bottom_color, bottom_pattern, _bottom_style = bottom_features[j]

        for k, (outer_color, outer_pattern, outer_style) in outer_features.items():
            outer = upper_items[k]
            if outer.name == inner.name:
                continue
            if occ == "party" and not party_outerwear_allowed(outer):
                continue

            score = pair_score
            score += 0.20 * float(top_sim[k])

            # Encourage blazer/jacket layering for party/office/formal.
            if occ in {"party", "office", "formal"}:
                score += 0.10
            if has_style_token(outer.name, {"BLAZER", "JACKET", "JACKETS"}):
                score += 0.08

            score += outer_style
            score += 0.7 * color_harmony_score(outer_color, bottom_color)
            score += 0.5 * color_harmony_score(inner_color, outer_color)
            score += fashion_color_score(inner_color, outer_color, bottom_color, occasion)
            score += 0.5 * pattern_score(outer_pattern, bottom_pattern)
            score += bottom_context_score(inner, outer, bottom, occasion)
            score += party_presence_bonus(inner, outer, bottom) if occ == "party" else 0.0

            candidates.append(
                FullOutfit(
                    inner_top=inner,
                    outerwear=outer,
                    bottom=bottom,
                    score=score,
                )
            )

    candidates.sort(key=lambda x: x.score, reverse=True)

    selected: list[FullOutfit] = []
    used_inner: set[str] = set()
    used_outer: set[str] = set()
    used_bottom: set[str] = set()
    used_palettes: set[str] = set()

    for cand in candidates:
        outer_name = cand.outerwear.name
        if cand.inner_top.name in used_inner:
            continue
        if outer_name in used_outer:
            continue
        if cand.bottom.name in used_bottom:
            continue

        # Avoid returning three near-identical color palettes.
        inner_path = get_image_path(cand.inner_top.name, cand.inner_top.class_name)
        outer_path = get_image_path(cand.outerwear.name, cand.outerwear.class_name)
        bottom_path = get_image_path(cand.bottom.name, cand.bottom.class_name)
        inner_color = get_dominant_color(inner_path, color_cache)
        outer_color = get_dominant_color(outer_path, color_cache)
        bottom_color = get_dominant_color(bottom_path, color_cache)
        palette_sig = color_palette_signature(inner_color, outer_color, bottom_color)
        if palette_sig in used_palettes:
            continue

        selected.append(cand)
        used_inner.add(cand.inner_top.name)
        used_outer.add(outer_name)
        used_bottom.add(cand.bottom.name)
        used_palettes.add(palette_sig)

        if len(selected) >= top_k:
            break

    # Fallback to fill missing slots if strict palette diversity is too restrictive.
    if len(selected) < top_k:
        for cand in candidates:
            outer_name = cand.outerwear.name
            if cand.inner_top.name in used_inner:
                continue
            if outer_name in used_outer:
                continue
            if cand.bottom.name in used_bottom:
                continue

            selected.append(cand)
            used_inner.add(cand.inner_top.name)
            used_outer.add(outer_name)
            used_bottom.add(cand.bottom.name)

            if len(selected) >= top_k:
                break

    return selected


def visualize_full_outfits(query_name: str, outfits: list[FullOutfit], occasion: str) -> None:
    print(f"\nQuery: {query_name}")
    print(f"Occasion: {occasion}")
    print(f"Returned full outfits: {len(outfits)}")

    if not outfits:
        print("No full outfit could be generated.")
        return

    plt.figure(figsize=(12, 4 * len(outfits)))

    for idx, outfit in enumerate(outfits, start=1):
        inner_path = get_image_path(outfit.inner_top.name, outfit.inner_top.class_name)
        bottom_path = get_image_path(outfit.bottom.name, outfit.bottom.class_name)

        plt.subplot(len(outfits), 3, (idx - 1) * 3 + 1)
        plt.imshow(Image.open(inner_path))
        plt.title(f"Outfit {idx} Inner Top")
        plt.axis("off")

        plt.subplot(len(outfits), 3, (idx - 1) * 3 + 2)
        outer_path = get_image_path(outfit.outerwear.name, outfit.outerwear.class_name)
        plt.imshow(Image.open(outer_path))
        plt.title("Outer Top (Blazer/Jacket)")
        plt.axis("off")

        plt.subplot(len(outfits), 3, (idx - 1) * 3 + 3)
        plt.imshow(Image.open(bottom_path))
        plt.title(f"Bottom | {outfit.score:.3f}")
        plt.axis("off")

    plt.tight_layout()
    plt.show()


def visualize_recommendations(query_name: str, recommendations: list[tuple[Item, Item, float]], occasion: str) -> None:
    query_item_class = "upper" if "_upper_" in query_name else None

    # Find query path robustly by checking both classes.
    query_upper_path = get_image_path(query_name, "upper")
    query_lower_path = get_image_path(query_name, "lower")
    if os.path.exists(query_upper_path):
        query_path = query_upper_path
    else:
        query_path = query_lower_path

    print(f"\nQuery: {query_name}")
    print(f"Occasion: {occasion}")
    print(f"Returned outfits: {len(recommendations)}")

    if not recommendations:
        print("No recommendation could be generated.")
        return

    plt.figure(figsize=(8, 4 * len(recommendations)))

    for idx, (top_item, bottom_item, score) in enumerate(recommendations, start=1):
        top_path = get_image_path(top_item.name, top_item.class_name)
        bottom_path = get_image_path(bottom_item.name, bottom_item.class_name)

        plt.subplot(len(recommendations), 2, (idx - 1) * 2 + 1)
        plt.imshow(Image.open(top_path))
        plt.title(f"Outfit {idx} Top")
        plt.axis("off")

        plt.subplot(len(recommendations), 2, (idx - 1) * 2 + 2)
        plt.imshow(Image.open(bottom_path))
        plt.title(f"Bottom | Score {score:.3f}")
        plt.axis("off")

    plt.tight_layout()
    plt.show()


def visualize_topwear_for_bottom(query_bottom: Item, recommendations: list[tuple[Item, float]], occasion: str) -> None:
    print(f"\nQuery Bottom: {query_bottom.name}")
    print(f"Occasion: {occasion}")
    print(f"Returned tops: {len(recommendations)}")

    if not recommendations:
        print("No topwear recommendation could be generated.")
        return

    cols = len(recommendations) + 1
    plt.figure(figsize=(3.8 * cols, 4.5))

    query_path = get_image_path(query_bottom.name, query_bottom.class_name)
    plt.subplot(1, cols, 1)
    plt.imshow(Image.open(query_path))
    plt.title(f"Query Bottom\n{query_bottom.category}")
    plt.axis("off")

    for idx, (top_item, score) in enumerate(recommendations, start=1):
        top_path = get_image_path(top_item.name, top_item.class_name)
        plt.subplot(1, cols, idx + 1)
        plt.imshow(Image.open(top_path))
        plt.title(f"Top {idx}\n{top_item.category} | {score:.3f}")
        plt.axis("off")

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    uppers, lowers = load_items()
    all_names = [it.name for it in uppers + lowers]

    if not all_names:
        raise RuntimeError("No items found in embeddings file.")

    # Spyder demo config:
    # set keyword to something like "jeans", "skirt", "pants", "shorts".
    sample_bottom_keyword = "pants"
    sample_occasion = "casual"
    sample_top_k = 3
    sample_target_gender = "AUTO"  # "AUTO", "MEN", or "WOMEN"
    sample_include_outerwear = False  # False => only tops/shirts, no outerwear

    lower_candidates = [
        it
        for it in lowers
        if it.gender in {"MEN", "WOMEN", "UNISEX"}
        and (it.category in BOTTOM_SEMANTIC_CATEGORIES or it.class_name == "lower")
    ]

    if sample_target_gender in {"MEN", "WOMEN"}:
        lower_candidates = [
            it
            for it in lower_candidates
            if gender_matches_target(it.gender, sample_target_gender)
            and not conflicts_with_target_gender(it.name, sample_target_gender)
        ]

    keyword_hits = [
        it for it in lower_candidates if sample_bottom_keyword.lower() in it.name.lower()
    ]
    query_item = random.choice(keyword_hits or lower_candidates or lowers)

    target_gender = None if sample_target_gender == "AUTO" else sample_target_gender

    top3 = recommend_topwear_for_bottom(
        query_item_name=query_item.name,
        occasion=sample_occasion,
        top_k=sample_top_k,
        target_gender=target_gender,
        include_outerwear=sample_include_outerwear,
    )

    print(f"Total items: {len(all_names)}")
    print(f"Upper count: {len(uppers)}")
    print(f"Lower count: {len(lowers)}")

    print(f"Bottom query item: {query_item.name} ({query_item.category})")
    for i, (top_item, score) in enumerate(top3, start=1):
        print(
            f"{i}. TOP={top_item.name} ({top_item.category}) | "
            f"SCORE={score:.4f}"
        )

    visualize_topwear_for_bottom(query_item, top3, sample_occasion)
