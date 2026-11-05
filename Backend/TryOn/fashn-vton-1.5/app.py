from pathlib import Path
from typing import Literal
from uuid import uuid4

from PIL import Image

from fashn_vton import TryOnPipeline


Category = Literal["tops", "bottoms", "one-pieces"]
GarmentPhotoType = Literal["model", "flat-lay"]

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BASE_DIR / "weights"
STATIC_ROOT = BASE_DIR.parent / "static"
OUTPUT_DIR = STATIC_ROOT / "results"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load once at startup for faster repeated inference.
pipeline = TryOnPipeline(weights_dir=str(WEIGHTS_DIR), device="cuda")


def run_tryon(
    person_path: str,
    cloth_path: str,
    category: Category = "tops",
    garment_photo_type: GarmentPhotoType = "flat-lay",
    neck_safe_mode: bool = True,
) -> str:
    person = Image.open(person_path).convert("RGB")
    cloth = Image.open(cloth_path).convert("RGB")

    guidance_scale = 2.0 if neck_safe_mode else 1.5
    segmentation_free = not neck_safe_mode

    result = pipeline(
        person_image=person,
        garment_image=cloth,
        category=category,
        garment_photo_type=garment_photo_type,
        num_timesteps=30,
        guidance_scale=guidance_scale,
        segmentation_free=segmentation_free,
    )

    if not result.images:
        raise RuntimeError("Try-on pipeline returned no images.")

    output_name = f"output_{uuid4().hex}.png"
    output_path = OUTPUT_DIR / output_name
    result.images[0].save(output_path)

    # Return a web path that Flask can serve from /static.
    return f"results/{output_name}"


if __name__ == "__main__":
    output = run_tryon("person.jpg", "cloth.jpg")
    print("Saved:", output)
