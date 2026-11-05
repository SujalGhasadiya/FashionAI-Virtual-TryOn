import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.connection import get_db, init_indexes
from app.routes import admin, auth, payments, recommendations, tryon, users, wardrobe
from app.services.subscription_service import load_subscription_plans_from_collection
from app.services.storage_service import ensure_media_directories


logger = logging.getLogger("uvicorn.error")


app = FastAPI(title="FashionAI Backend API", version="1.0.0")

import time
import asyncio
import os
from pathlib import Path
from fastapi import Request

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def global_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        f"{request.client.host if request.client else 'unknown'} - "
        f"\"{request.method} {request.url.path}\" {response.status_code} "
        f"completed in {process_time:.3f}s"
    )
    return response

app.mount("/media", StaticFiles(directory=str(settings.media_root)), name="media")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(users.router)
app.include_router(wardrobe.router)
app.include_router(tryon.router)
app.include_router(recommendations.router)


async def temp_folder_cleanup_task():
    while True:
        try:
            temp_dir = settings.media_root / "temp"
            if temp_dir.exists():
                now = time.time()
                count = 0
                for f in temp_dir.iterdir():
                    if f.is_file():
                        file_age = now - f.stat().st_mtime
                        # 24 hours = 86400 seconds
                        if file_age > 86400:
                            os.remove(f)
                            count += 1
                if count > 0:
                    logger.info(f"Background cleanup: deleted {count} temporary files older than 24 hours.")
        except Exception as e:
            logger.error(f"Error in temp folder cleanup task: {e}")
        # Sleep for 1 hour before checking again
        await asyncio.sleep(3600)

@app.on_event("startup")
def startup_event():
    asyncio.create_task(temp_folder_cleanup_task())
    tryon_routes = [
        {
            "path": getattr(route, "path", ""),
            "methods": sorted(list(getattr(route, "methods", []) or [])),
            "endpoint": getattr(getattr(route, "endpoint", None), "__name__", str(getattr(route, "endpoint", ""))),
        }
        for route in app.routes
        if hasattr(route, "path") and route.path.startswith("/tryon")
    ]
    logger.info(
        "Startup config: project_root=%s vton_repo_dir=%s vton_src_dir=%s vton_weights_dir=%s clothing_model=%s user_embeddings_root=%s",
        settings.project_root,
        settings.vton_repo_dir,
        settings.vton_src_dir,
        settings.vton_weights_dir,
        settings.clothing_model_path,
        settings.user_wardrobe_embeddings_root,
    )
    logger.info("Registered tryon routes: %s", tryon_routes)
    ensure_media_directories()
    try:
        init_indexes()
        # Clean up any jobs that were left in 'processing' state due to server crash/restart
        db = get_db()
        result = db.tryon_jobs.update_many(
            {"status": "processing"},
            {"$set": {"status": "cancelled", "error_message": "Server restarted, job cancelled."}}
        )
        if result.modified_count > 0:
            logger.warning(f"Cleaned up {result.modified_count} stuck processing jobs on startup.")
            
        load_subscription_plans_from_collection(db)
    except Exception as exc:
        logger.error(
            "MongoDB startup connection failed (%s). Ensure MongoDB is running and MONGODB_URL in .env is correct.",
            exc,
        )


@app.get("/")
def root():
    return {
        "message": "FashionAI Virtual Try-On Backend",
        "database": "mongodb",
        "features": ["auth", "admin", "profile", "wardrobe", "tryon", "recommendations", "subscriptions"],
    }
    