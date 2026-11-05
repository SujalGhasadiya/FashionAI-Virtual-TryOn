import logging
import multiprocessing
import os
import signal
from typing import Dict

from fastapi import HTTPException, UploadFile
from pymongo.database import Database

from app.database.repositories.wardrobe_repository import get_wardrobe_item_for_user
from app.services.storage_service import (
    absolute_to_media_url,
    create_override_photo_path,
    create_tryon_output_path,
    media_url_to_absolute,
    save_upload_file,
)
from app.services.tryon_service import run_tryon
from app.services.cloudinary_service import upload_to_cloudinary
import requests
from pathlib import Path
from app.services.subscription_service import (
    ensure_tryon_limit, 
    get_remaining_tryons_today, 
    should_save_tryon_output, 
    get_subscription_plan
)
from app.utils.helpers import serialize_document, serialize_many, utcnow, ensure_local_file
from bson.objectid import ObjectId
from typing import Dict

# Global dictionary to track active background processes
active_processes: Dict[str, multiprocessing.Process] = {}

logger = logging.getLogger("uvicorn.error")

class ProgressUpdater:
    def __init__(self, db_uri, db_name, job_id):
        self.db_uri = db_uri
        self.db_name = db_name
        self.job_id = job_id

    def __call__(self, step: int, total_steps: int):
        from pymongo import MongoClient
        from bson.objectid import ObjectId
        import logging
        logger = logging.getLogger("uvicorn.error")
        
        # Cap at 95% to leave room for post-processing and saving
        progress = min(95, int((step / total_steps) * 95))
        try:
            client = MongoClient(self.db_uri)
            db = client[self.db_name]
            db.tryon_jobs.update_one(
                {"_id": ObjectId(self.job_id)},
                {"$set": {"progress": progress}}
            )
            print(f"DEBUG: Successfully updated DB progress for job {self.job_id}: {progress}%", flush=True)
            client.close()
        except Exception as pe:
            print(f"DEBUG: Failed to update progress for job {self.job_id}: {pe}", flush=True)

def background_tryon_task(
    job_id: str,
    input_photo_path: str,
    garment_path: str,
    output_path: str,
    garment_photo_type: str,
    category: str,
    vton_num_timesteps: int | None,
    vton_guidance_scale: float | None,
    vton_segmentation_free: bool | None,
    db_uri: str,
    db_name: str
):
    """Function to run in a separate process"""
    from pymongo import MongoClient
    from bson.objectid import ObjectId
    client = MongoClient(db_uri)
    db = client[db_name]
    
    try:
        from app.services.tryon_service import run_tryon
        from app.services.storage_service import absolute_to_media_url
        
        updater = ProgressUpdater(db_uri, db_name, job_id)
        print(f"DEBUG: Starting run_tryon with callback: {updater}")

        # 1. Ensure inputs are local for the AI engine
        local_input_photo = ensure_local_file(input_photo_path)
        local_garment = ensure_local_file(garment_path)

        run_tryon(
            local_input_photo, 
            local_garment, 
            output_path, 
            garment_photo_type=garment_photo_type, 
            category=category,
            num_timesteps=vton_num_timesteps,
            guidance_scale=vton_guidance_scale,
            segmentation_free=vton_segmentation_free,
            callback=updater
        )
        
        # 2. Upload the local result to Cloudinary
        output_url = upload_to_cloudinary(output_path, folder=f"tryon_results/{job_id}")
        
        # 3. Cleanup local files
        try:
            if local_input_photo != input_photo_path and os.path.exists(local_input_photo):
                os.remove(local_input_photo)
            if local_garment != garment_path and os.path.exists(local_garment):
                os.remove(local_garment)
            if os.path.exists(output_path):
                os.remove(output_path)
        except:
            pass

        db.tryon_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "output_url": output_url,
                    "status": "completed",
                    "progress": 100,
                    "completed_at": utcnow(),
                }
            },
        )
    except Exception as e:
        logger.error(f"Try-on background task failed for job {job_id}: {str(e)}")
        db.tryon_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(e),
                }
            },
        )
    finally:
        client.close()
        
        # Cleanup temporary garment if used
        try:
            import os
            from pathlib import Path
            from app.core.config import settings
            garment_p = Path(garment_path)
            temp_dir = settings.media_root / "temp"
            if garment_p.is_relative_to(temp_dir) and garment_p.exists():
                os.remove(garment_p)
                logger.info(f"Cleaned up temporary garment file: {garment_path}")
        except Exception as cleanup_err:
            logger.error(f"Failed to cleanup temp garment {garment_path}: {cleanup_err}")


def create_tryon(
    top_item_id: str | None,
    override_photo: UploadFile | None,
    garment_photo_type: str,
    current_user: dict,
    db: Database,
    temp_garment_filename: str | None = None,
    garment_category: str | None = None,
    vton_num_timesteps: int | None = None,
    vton_guidance_scale: float | None = None,
    vton_segmentation_free: bool | None = None,
) -> dict:
    if not top_item_id and not temp_garment_filename:
        raise HTTPException(status_code=400, detail="Must provide either top_item_id or temp_garment_filename")

    if top_item_id:
        item = get_wardrobe_item_for_user(db, top_item_id, str(current_user["_id"]), include_inactive=False)
        if item is None:
            raise HTTPException(status_code=404, detail="Wardrobe item not found")
        if item["type"] not in ("top", "bottom", "one-piece"):
            raise HTTPException(status_code=400, detail="Only top, bottom, and one-piece items can be used for try-on")
        garment_path = item["image_url"]
        if item["type"] == "top": category = "tops"
        elif item["type"] == "bottom": category = "bottoms"
        else: category = "one-pieces"
        top_item_id_val = str(item["_id"])
    else:
        from app.core.config import settings
        import shutil
        temp_path = settings.media_root / "temp" / temp_garment_filename
        if not temp_path.exists():
            raise HTTPException(status_code=404, detail="Temporary image not found")
        garment_path = str(temp_path)
        if garment_category not in ("tops", "bottoms", "one-pieces"):
            raise HTTPException(status_code=400, detail="garment_category must be tops, bottoms, or one-pieces")
        category = garment_category
        top_item_id_val = None

    ensure_tryon_limit(db, current_user)

    user_photo_url = current_user.get("profile_photo_url")
    input_photo_used = "profile"

    if override_photo is not None:
        # Upload override photo to Cloudinary
        user_photo_url = upload_to_cloudinary(override_photo.file, folder=f"overrides/{current_user['_id']}")
        input_photo_used = "override"

    input_photo_path = user_photo_url

    if input_photo_path is None or garment_path is None:
        raise HTTPException(status_code=400, detail="Please upload your photo")

    job = {
        "user_id": str(current_user["_id"]),
        "top_item_id": top_item_id_val,
        "user_photo_path": user_photo_url,

        "input_photo_used": input_photo_used,
        "output_url": None,
        "status": "processing",
        "progress": 0,
        "error_message": None,
        "is_saved": False,
        "created_at": utcnow(),
    }
    result = db.tryon_jobs.insert_one(job)
    job["_id"] = result.inserted_id

    try:
        output_path = create_tryon_output_path(str(current_user["_id"]), str(job["_id"]))

        # Start background process
        # We need the DB URI to reconnect in the child process
        from app.database.connection import MONGODB_URL, MONGODB_DB_NAME
        
        p = multiprocessing.Process(
            target=background_tryon_task,
            args=(
                str(job["_id"]),
                input_photo_path,
                garment_path,
                output_path,
                garment_photo_type,
                category,
                vton_num_timesteps,
                vton_guidance_scale,
                vton_segmentation_free,
                MONGODB_URL,
                MONGODB_DB_NAME
            )
        )
        p.start()
        active_processes[str(job["_id"])] = p

        job_payload = serialize_document(job) or {}
        job_payload["remaining_tryons_today"] = get_remaining_tryons_today(db, str(current_user["_id"]), current_user)
        return job_payload
        return job_payload
    except Exception as exc:
        logger.exception(
            "Try-on failed for user_id=%s job_id=%s top_item_id=%s",
            current_user.get("_id"),
            job.get("_id"),
            item.get("_id"),
        )
        db.tryon_jobs.update_one(
            {"_id": job["_id"]},
            {"$set": {"status": "failed", "error_message": str(exc)}},
        )
        raise HTTPException(status_code=500, detail=f"Try-on failed: {exc}") from exc


def get_tryon_history(current_user: dict, db: Database, include_unsaved: bool = False) -> list[dict]:
    query = {"user_id": str(current_user["_id"])}
    if not include_unsaved:
        query["is_saved"] = True
        
    jobs = list(db.tryon_jobs.find(query).sort("created_at", -1))
    return serialize_many(jobs)

def save_tryon_job(job_id: str, current_user: dict, db: Database) -> dict:
    try:
        job_obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
        
    job = db.tryon_jobs.find_one({"_id": job_obj_id, "user_id": str(current_user["_id"])})
    if not job:
        raise HTTPException(status_code=404, detail="Try-on job not found")
        
    if job.get("is_saved"):
        return serialize_document(job)
        
    if not should_save_tryon_output(db, current_user):
        plan = get_subscription_plan(current_user)
        limit = plan["saved_tryon_monthly_limit"]
        if limit == 0:
            detail = f"Your {plan['name']} plan does not include saving try-ons. Please upgrade to save."
        else:
            detail = f"You have reached your monthly limit of {limit} saved try-ons. Please upgrade to save more."
        raise HTTPException(status_code=403, detail=detail)
        
    db.tryon_jobs.update_one({"_id": job["_id"]}, {"$set": {"is_saved": True}})
    job["is_saved"] = True
    return serialize_document(job)

__all__ = ["create_tryon", "get_tryon_history", "save_tryon_job"]
def cancel_tryon(job_id: str, current_user: dict, db: Database) -> dict:
    job = db.tryon_jobs.find_one({"_id": ObjectId(job_id), "user_id": str(current_user["_id"])})
    if not job:
        raise HTTPException(status_code=404, detail="Try-on job not found")
    
    if job["status"] != "processing":
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in {job['status']} state")

    # Kill process if it exists in this instance
    if job_id in active_processes:
        p = active_processes[job_id]
        if p.is_alive():
            p.terminate()
            p.join()
        del active_processes[job_id]
    
    # Update DB
    db.tryon_jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": "cancelled", "completed_at": utcnow()}}
    )
    
    return {"message": "Job cancelled successfully"}
