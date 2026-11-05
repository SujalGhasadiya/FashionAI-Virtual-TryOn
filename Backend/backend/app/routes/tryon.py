from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pymongo.database import Database

from app.controllers.tryon_controller import create_tryon, get_tryon_history
from app.core.deps import get_current_fully_registered_user
from app.database.connection import get_db
from app.schemas import TryOnJobOut


router = APIRouter(prefix="/tryon", tags=["tryon"])


@router.get("")
def tryon_route_help() -> dict:
    return {
        "message": "Use POST /tryon for try-on generation.",
        "required_form_fields": ["top_item_id"],
        "optional_form_fields": ["override_photo"],
        "history_endpoint": "GET /tryon/history",
    }


@router.post("", response_model=TryOnJobOut, status_code=status.HTTP_201_CREATED)
async def create_tryon_route(
    top_item_id: str | None = Form(default=None),
    temp_garment_filename: str | None = Form(default=None),
    garment_category: str | None = Form(default=None),
    override_photo: UploadFile | None = File(default=None),
    garment_photo_type: str = Form(default="flat-lay"),
    vton_num_timesteps: int | None = Form(default=None),
    vton_guidance_scale: float | None = Form(default=None),
    vton_segmentation_free: bool | None = Form(default=None),
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return create_tryon(
        top_item_id, 
        override_photo, 
        garment_photo_type, 
        current_user, 
        db,
        temp_garment_filename=temp_garment_filename,
        garment_category=garment_category,
        vton_num_timesteps=vton_num_timesteps,
        vton_guidance_scale=vton_guidance_scale,
        vton_segmentation_free=vton_segmentation_free
    )


@router.get("/history", response_model=list[TryOnJobOut])
def get_tryon_history_route(
    include_unsaved: bool = False,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return get_tryon_history(current_user, db, include_unsaved=include_unsaved)


@router.post("/{job_id}/cancel")
def cancel_tryon_route(
    job_id: str,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    from app.controllers.tryon_controller import cancel_tryon
    return cancel_tryon(job_id, current_user, db)


@router.post("/{job_id}/save", response_model=TryOnJobOut)
def save_tryon_job_route(
    job_id: str,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    from app.controllers.tryon_controller import save_tryon_job
    return save_tryon_job(job_id, current_user, db)

__all__ = ["router"]
