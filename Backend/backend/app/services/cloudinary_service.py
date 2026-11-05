import cloudinary
import cloudinary.uploader
from app.core.config import settings
import logging

logger = logging.getLogger("uvicorn.error")

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)

def upload_to_cloudinary(file_path: str, folder: str = "virtual_tryon") -> str:
    """
    Uploads a file to Cloudinary and returns the secure URL.
    file_path can be a local path or a file-like object.
    """
    try:
        response = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="auto"
        )
        return response.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise Exception(f"Failed to upload image to cloud: {str(e)}")

def delete_from_cloudinary(public_id: str):
    """
    Deletes an image from Cloudinary using its public_id.
    Note: Public ID is usually the filename without extension if folder is not specified,
    or 'folder/filename' if folder is specified.
    """
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        # We don't raise here to keep soft-delete behavior clean
