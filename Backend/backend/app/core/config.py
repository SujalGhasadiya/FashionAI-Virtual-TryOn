import os
from pathlib import Path

from dotenv import load_dotenv


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _as_bool(value: str | None, default: bool) -> bool:
    value = _clean(value)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)


def _resolve_existing_path(candidates: list[Path]) -> Path | None:
    for path in candidates:
        if path.exists():
            return path
    return None


class Settings:
    def __init__(self) -> None:
        self.app_dir = Path(__file__).resolve().parents[1]
        self.backend_root = self.app_dir.parent
        self.project_root = self.backend_root.parent
        self.media_root = self.app_dir / "media"
        self.user_media_root = self.media_root / "users"
        self.wardrobe_media_root = self.media_root / "wardrobe"
        self.tryon_media_root = self.media_root / "tryon"
        vton_repo_env = _clean(os.getenv("VTON_REPO_DIR"))
        vton_repo_candidates = [
            Path(vton_repo_env) if vton_repo_env else None,
            self.project_root / "TryOn" / "fashn-vton-1.5",
            self.backend_root / "TryOn" / "fashn-vton-1.5",
        ]
        self.vton_repo_dir = _resolve_existing_path([p for p in vton_repo_candidates if p is not None]) or (
            self.project_root / "TryOn" / "fashn-vton-1.5"
        )
        self.vton_src_dir = self.vton_repo_dir / "src"
        vton_weights_env = _clean(os.getenv("VTON_WEIGHTS_DIR"))
        vton_weights_candidates = [
            Path(vton_weights_env) if vton_weights_env else None,
            self.vton_repo_dir / "weights",
            self.backend_root / "TryOn" / "fashn-vton-1.5" / "weights",
            self.project_root / "TryOn" / "fashn-vton-1.5" / "weights",
        ]
        self.vton_weights_dir = _resolve_existing_path([p for p in vton_weights_candidates if p is not None]) or (
            Path(vton_weights_env) if vton_weights_env else self.vton_repo_dir / "weights"
        )

        self.default_tryon_price = int(os.getenv("DEFAULT_TRYON_PRICE", "5"))
        self.default_recommendation_price = int(os.getenv("DEFAULT_RECOMMENDATION_PRICE", "3"))
        self.default_registration_bonus = int(os.getenv("DEFAULT_REGISTRATION_BONUS", "50"))
        self.admin_creation_secret = _clean(os.getenv("ADMIN_CREATION_SECRET")) or ""
        self.razorpay_key_id = _clean(os.getenv("RAZORPAY_KEY_ID")) or ""
        self.razorpay_key_secret = _clean(os.getenv("RAZORPAY_KEY_SECRET")) or ""
        self.razorpay_currency = _clean(os.getenv("RAZORPAY_CURRENCY")) or "INR"
        self.razorpay_checkout_name = _clean(os.getenv("RAZORPAY_CHECKOUT_NAME")) or "FashionAI"
        self.razorpay_checkout_description = (
            _clean(os.getenv("RAZORPAY_CHECKOUT_DESCRIPTION"))
            or "Secure subscription payment for FashionAI plans"
        )

        self.tryon_mock_mode = _as_bool(os.getenv("TRYON_MOCK_MODE"), default=False)
        self.vton_device = _clean(os.getenv("VTON_DEVICE")) or "cuda"
        self.vton_category = _clean(os.getenv("VTON_CATEGORY")) or "tops"
        self.vton_garment_photo_type = _clean(os.getenv("VTON_GARMENT_PHOTO_TYPE")) or "flat-lay"
        self.vton_num_timesteps = int(os.getenv("VTON_NUM_TIMESTEPS", "30"))
        self.vton_guidance_scale = float(os.getenv("VTON_GUIDANCE_SCALE", "2.0"))
        self.vton_seed = int(os.getenv("VTON_SEED", "42"))
        self.vton_segmentation_free = _as_bool(os.getenv("VTON_SEGMENTATION_FREE"), default=False)

        fashionai_root_env = _clean(os.getenv("FASHIONAI_ROOT"))
        fashionai_candidates = [
            Path(fashionai_root_env) if fashionai_root_env else None,
            self.project_root / "FashionAI",
            self.backend_root / "FashionAI",
        ]
        self.fashionai_root = _resolve_existing_path([p for p in fashionai_candidates if p is not None]) or (
            Path(fashionai_root_env) if fashionai_root_env else self.project_root / "FashionAI"
        )

        clothing_model_env = _clean(os.getenv("CLOTHING_MODEL_PATH"))
        clothing_model_candidates = [
            Path(clothing_model_env) if clothing_model_env else None,
            self.fashionai_root / "models" / "clothing_model.pth",
        ]
        self.clothing_model_path = _resolve_existing_path([p for p in clothing_model_candidates if p is not None]) or (
            Path(clothing_model_env) if clothing_model_env else self.fashionai_root / "models" / "clothing_model.pth"
        )

        user_embeddings_root_env = _clean(os.getenv("USER_WARDROBE_EMBEDDINGS_ROOT"))
        user_embeddings_root_candidates = [
            Path(user_embeddings_root_env) if user_embeddings_root_env else None,
            self.fashionai_root / "datasets" / "user_wardrobes",
        ]
        self.user_wardrobe_embeddings_root = _resolve_existing_path(
            [p for p in user_embeddings_root_candidates if p is not None]
        ) or (
            Path(user_embeddings_root_env)
            if user_embeddings_root_env
            else self.fashionai_root / "datasets" / "user_wardrobes"
        )

        # SMTP Configuration for Email
        self.smtp_host = _clean(os.getenv("SMTP_HOST")) or "localhost"
        self.smtp_port = int(os.getenv("SMTP_PORT", "2525"))
        self.smtp_username = _clean(os.getenv("SMTP_USERNAME")) or ""
        self.smtp_password = _clean(os.getenv("SMTP_PASSWORD")) or ""
        self.smtp_from_email = _clean(os.getenv("SMTP_FROM_EMAIL")) or "noreply@fashionai.com"
        self.smtp_from_name = _clean(os.getenv("SMTP_FROM_NAME")) or "FashionAI"
        self.smtp_use_tls = _as_bool(os.getenv("SMTP_USE_TLS"), default=True)

        # OTP Configuration
        self.otp_length = int(os.getenv("OTP_LENGTH", "6"))
        self.otp_expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
        self.otp_resend_cooldown_seconds = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
        self.otp_max_verify_attempts = int(os.getenv("OTP_MAX_VERIFY_ATTEMPTS", "5"))

        # Cloudinary Configuration
        self.cloudinary_cloud_name = _clean(os.getenv("CLOUDINARY_CLOUD_NAME")) or ""
        self.cloudinary_api_key = _clean(os.getenv("CLOUDINARY_API_KEY")) or ""
        self.cloudinary_api_secret = _clean(os.getenv("CLOUDINARY_API_SECRET")) or ""


settings = Settings()


__all__ = ["Settings", "settings"]
