from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from pymongo.database import Database

from app.controllers.wardrobe_controller import (
    delete_wardrobe_item,
    list_wardrobe_items,
    sync_wardrobe_embeddings,
    update_wardrobe_item_status,
    upload_wardrobe_item,
    upload_wardrobe_item_from_temp,
)
from app.core.deps import get_current_fully_registered_user
from app.database.connection import get_db
from app.schemas import WardrobeEmbeddingSyncOut, WardrobeItemOut, WardrobeItemStatusUpdateRequest
from pydantic import BaseModel
import os
import shutil
from fastapi import HTTPException
from app.core.config import settings
from app.services.scraper_service import scrape_image
from app.services.storage_service import create_wardrobe_item_path
from app.utils.helpers import utcnow
import re

# Strict regex for Amazon and Flipkart domains
SUPPORTED_URL_PATTERN = re.compile(
    r'^https://(?:www\.)?(?:amazon\.(?:com|in|co\.uk|de|fr|it|es|ca|com\.mx|com\.au|com\.br|sg|ae|jp)|flipkart\.com)(?:/.*)?$',
    re.IGNORECASE
)

class ExtractUrlRequest(BaseModel):
    url: str

class SaveTempToWardrobeRequest(BaseModel):
    filename: str
    type: str


router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


@router.post("/items", response_model=WardrobeItemOut, status_code=status.HTTP_201_CREATED)
async def upload_wardrobe_item_route(
    type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return upload_wardrobe_item(type, file, current_user, db)


@router.get("/items", response_model=list[WardrobeItemOut])
def list_wardrobe_items_route(
    include_inactive: bool = True,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return list_wardrobe_items(current_user, db, include_inactive=include_inactive)


@router.patch("/items/{item_id}/status", response_model=WardrobeItemOut)
def update_wardrobe_item_status_route(
    item_id: str,
    payload: WardrobeItemStatusUpdateRequest,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return update_wardrobe_item_status(item_id, payload.active_status, current_user, db)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wardrobe_item_route(
    item_id: str,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    delete_wardrobe_item(item_id, current_user, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/embeddings/sync", response_model=WardrobeEmbeddingSyncOut)
def sync_wardrobe_embeddings_route(
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return sync_wardrobe_embeddings(current_user, db)

@router.post("/extract-url")
async def extract_url_route(
    payload: ExtractUrlRequest,
    current_user: dict = Depends(get_current_fully_registered_user),
):
    if not SUPPORTED_URL_PATTERN.match(payload.url):
        raise HTTPException(
            status_code=400, 
            detail="Only valid HTTPS product links from Amazon and Flipkart are allowed."
        )

    try:
        result = await scrape_image(payload.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    if not result.get("image_url") or not result.get("filename"):
        raise HTTPException(status_code=404, detail="Could not extract an image from the provided URL.")
        
    temp_url = f"/media/temp/{result['filename']}"
    return {
        "success": True,
        "image_url": result["image_url"],
        "temp_url": temp_url,
        "filename": result["filename"]
    }

@router.post("/items/from-temp", response_model=WardrobeItemOut, status_code=status.HTTP_201_CREATED)
def save_temp_to_wardrobe_route(
    payload: SaveTempToWardrobeRequest,
    current_user: dict = Depends(get_current_fully_registered_user),
    db: Database = Depends(get_db),
):
    return upload_wardrobe_item_from_temp(payload.type, payload.filename, current_user, db)

__all__ = ["router"]
