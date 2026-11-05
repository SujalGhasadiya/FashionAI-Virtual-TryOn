import shutil
import sys
import logging
from importlib import import_module
from typing import Callable, Optional
from functools import lru_cache
from pathlib import Path

from PIL import Image

from app.core.config import settings


logger = logging.getLogger("uvicorn.error")


def _ensure_vton_import_path() -> None:
    if settings.vton_src_dir.exists():
        src = str(settings.vton_src_dir)
        if src not in sys.path:
            sys.path.append(src)


@lru_cache(maxsize=1)
def _load_pipeline():
    logger.info(
        "Initializing TryOnPipeline with repo=%s src=%s weights=%s device=%s",
        settings.vton_repo_dir,
        settings.vton_src_dir,
        settings.vton_weights_dir,
        settings.vton_device,
    )
    _ensure_vton_import_path()
    try:
        module = import_module("fashn_vton")
        TryOnPipeline = getattr(module, "TryOnPipeline")
    except ImportError as exc:
        raise RuntimeError(
            "Could not import fashn_vton. Start FastAPI from the Conda environment where "
            "the FASHN VTON dependencies are installed, or run 'pip install -e TryOn/fashn-vton-1.5'."
        ) from exc

    return TryOnPipeline(
        weights_dir=str(settings.vton_weights_dir),
        device=settings.vton_device,
    )


def run_tryon(
    person_image_path: str | Path,
    garment_image_path: str | Path,
    output_path: str | Path,
    garment_photo_type: str | None = None,
    category: str | None = None,
    num_timesteps: int | None = None,
    guidance_scale: float | None = None,
    segmentation_free: bool | None = None,
    callback: Callable | None = None,
) -> None:
    person_image_path = Path(person_image_path)
    garment_image_path = Path(garment_image_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if settings.tryon_mock_mode:
        logger.info("Try-on mock mode enabled, copying input image to output")
        shutil.copy(person_image_path, output_path)
        return

    logger.info(
        "Try-on request: person=%s garment=%s output=%s weights=%s",
        person_image_path,
        garment_image_path,
        output_path,
        settings.vton_weights_dir,
    )

    if not settings.vton_weights_dir.exists():
        logger.error("VTON weights directory missing: %s", settings.vton_weights_dir)
        raise RuntimeError(f"VTON weights directory not found: {settings.vton_weights_dir}")

    pipeline = _load_pipeline()
    person = Image.open(person_image_path).convert("RGB")
    garment = Image.open(garment_image_path).convert("RGB")
    resolved_garment_photo_type = (garment_photo_type or settings.vton_garment_photo_type).strip().lower()
    if resolved_garment_photo_type not in {"model", "flat-lay"}:
        raise RuntimeError("garment_photo_type must be 'model' or 'flat-lay'")

    resolved_category = (category or settings.vton_category).strip().lower()
    if resolved_category not in {"tops", "bottoms", "one-pieces"}:
        raise RuntimeError("category must be 'tops', 'bottoms', or 'one-pieces'")

    result = pipeline(
        person_image=person,
        garment_image=garment,
        category=resolved_category,
        garment_photo_type=resolved_garment_photo_type,
        num_timesteps=num_timesteps if num_timesteps is not None else settings.vton_num_timesteps,
        guidance_scale=guidance_scale if guidance_scale is not None else settings.vton_guidance_scale,
        seed=settings.vton_seed,
        segmentation_free=segmentation_free if segmentation_free is not None else settings.vton_segmentation_free,
        callback=callback,
    )
    if not result.images:
        raise RuntimeError("Try-on pipeline returned no images")

    result.images[0].save(output_path)

__all__ = ["run_tryon"]
