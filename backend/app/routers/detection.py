import os
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.config import settings
from app.schemas import DetectionResult
from app.ai.detector import detect_road_damage

router = APIRouter(prefix="/detect", tags=["AI Detection"])

@router.post("", response_model=DetectionResult)
async def analyze_road_damage(
    image: UploadFile = File(..., description="Road image to analyze"),
    force_demo: Optional[bool] = Form(False, description="Explicitly test demo fallback mode")
):
    """
    Analyzes an uploaded photo for road damage (potholes, cracks, surface depression).
    Returns bounding box coordinates, confidence scores, detection count, and preliminary severity.
    Includes explicit honest disclosure if running in demo/heuristic mode.
    """
    if image.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{image.content_type}'. Please upload JPEG, PNG, or WebP."
        )

    content = await image.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds the maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
    temp_path = os.path.join(settings.UPLOAD_DIR, f"preview_{uuid.uuid4().hex}{temp_ext}")

    try:
        with open(temp_path, "wb") as f:
            f.write(content)

        result = detect_road_damage(temp_path, force_demo=bool(force_demo))
        return result
    finally:
        # Keep preview images or cleanup
        pass
