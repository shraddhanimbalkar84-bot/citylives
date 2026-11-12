import os
import uuid
import json
import random
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import Report, ReportStatusHistory, ReportUpvote, User
from app.schemas import ReportOut, DuplicateCheckResponse, DuplicateMatch
from app.config import settings
from app.ai.detector import detect_road_damage
from app.services.severity import calculate_severity_score
from app.services.duplicate import find_nearby_duplicate_reports
from app.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(
    latitude: float = Query(..., description="Latitude of candidate report"),
    longitude: float = Query(..., description="Longitude of candidate report"),
    radius_meters: Optional[float] = Query(None, description="Radius in meters to search"),
    days: Optional[int] = Query(None, description="Time window in days"),
    db: Session = Depends(get_db)
):
    """
    Checks for existing unresolved road damage reports near the coordinates.
    """
    matches = find_nearby_duplicate_reports(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        time_window_days=days
    )
    has_dups = len(matches) > 0
    message = (
        f"Warning: {len(matches)} existing road damage report(s) found within {radius_meters or settings.DUPLICATE_RADIUS_METERS}m."
        if has_dups
        else "No duplicate reports detected within threshold."
    )
    return {
        "has_duplicates": has_dups,
        "matches": matches,
        "message": message
    }


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def submit_report(
    title: str = Form(..., description="Summary title of the road damage"),
    latitude: float = Form(..., description="GPS Latitude"),
    longitude: float = Form(..., description="GPS Longitude"),
    address: str = Form(..., description="Physical street address or landmark"),
    description: Optional[str] = Form(None),
    citizen_name: Optional[str] = Form("Anonymous Citizen"),
    citizen_contact: Optional[str] = Form(None),
    severity_override: Optional[str] = Form(None),
    is_demo_mode: Optional[bool] = Form(False),
    image: UploadFile = File(..., description="Photo of road damage"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a new civic report:
    1. Validates file size and MIME type.
    2. Stores image safely with unique filename.
    3. Executes AI detection with honest fallback labeling.
    4. Computes rule-based severity score.
    5. Persists report with initial status 'Submitted'.
    """
    # 1. MIME type validation
    if image.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{image.content_type}'. Please upload JPEG, PNG, or WebP images."
        )

    # 2. File size limit validation
    content = await image.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )

    # 3. Safe saving with UUID
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # 4. AI Pothole Detection (with honest demo fallback)
    detection = detect_road_damage(file_path, force_demo=bool(is_demo_mode))
    
    # 5. Severity scoring
    if severity_override and severity_override in ("Low", "Medium", "High", "Critical"):
        severity_tier, severity_score, breakdown_json = calculate_severity_score(
            detection["boxes"], manual_override=severity_override
        )
    else:
        severity_tier = detection["preliminary_severity"]
        severity_score = detection["preliminary_score"]
        breakdown_json = detection["severity_breakdown"]

    # 6. Generate sequential tracking number
    year = datetime.datetime.utcnow().year
    rand_suffix = random.randint(1000, 9999)
    tracking_number = f"CE-{year}-{rand_suffix}"
    while db.query(Report).filter(Report.tracking_number == tracking_number).first():
        rand_suffix = random.randint(1000, 9999)
        tracking_number = f"CE-{year}-{rand_suffix}"

    report = Report(
        tracking_number=tracking_number,
        user_id=current_user.id if current_user else None,
        citizen_name=citizen_name or (current_user.full_name if current_user else "Anonymous Citizen"),
        citizen_contact=citizen_contact or (current_user.email if current_user else None),
        title=title,
        description=description,
        image_filename=unique_filename,
        image_url=f"/uploads/{unique_filename}",
        latitude=latitude,
        longitude=longitude,
        address=address,
        severity=severity_tier,
        severity_score=severity_score,
        severity_breakdown=breakdown_json,
        status="Submitted",
        priority="Urgent" if severity_tier == "Critical" else "Normal",
        ai_detected=detection["detected"],
        ai_count=detection["count"],
        ai_confidence=detection["confidence"],
        ai_boxes_json=json.dumps(detection["boxes"]),
        detector_type=detection["detector_type"],
        is_demo_mode=detection["is_demo_mode"],
        upvotes_count=1
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    # Create initial status history entry
    hist = ReportStatusHistory(
        report_id=report.id,
        from_status="Created",
        to_status="Submitted",
        changed_by_user="Citizen Reporter",
        admin_notes="Initial report submitted via web portal."
    )
    db.add(hist)
    db.commit()
    db.refresh(report)

    return report


@router.get("", response_model=List[ReportOut])
def list_reports(
    status: Optional[str] = Query(None, description="Filter by status (e.g. Submitted, In Progress, Resolved)"),
    severity: Optional[str] = Query(None, description="Filter by severity (e.g. Low, Medium, High, Critical)"),
    search: Optional[str] = Query(None, description="Search in title, description, tracking number, or address"),
    days: Optional[int] = Query(None, description="Filter reports created in the last N days"),
    user_only: Optional[bool] = Query(False, description="Filter reports submitted by the current user"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List civic reports with filtering, searching, and pagination.
    """
    query = db.query(Report)

    if status and status.lower() != "all":
        query = query.filter(Report.status == status)

    if severity and severity.lower() != "all":
        query = query.filter(Report.severity == severity)

    if days:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
        query = query.filter(Report.created_at >= cutoff)

    if user_only and current_user:
        query = query.filter(Report.user_id == current_user.id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Report.title.ilike(pattern),
                Report.description.ilike(pattern),
                Report.tracking_number.ilike(pattern),
                Report.address.ilike(pattern)
            )
        )

    query = query.order_by(desc(Report.created_at))
    return query.offset(offset).limit(limit).all()


@router.get("/{identifier}", response_model=ReportOut)
def get_report(identifier: str, db: Session = Depends(get_db)):
    """
    Fetch a single report by ID (e.g., '1') or tracking number (e.g., 'CE-2026-1041').
    """
    if identifier.isdigit():
        report = db.query(Report).filter(Report.id == int(identifier)).first()
    else:
        report = db.query(Report).filter(Report.tracking_number == identifier.upper()).first()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return report


@router.post("/{report_id}/upvote")
def upvote_report(
    report_id: int,
    client_id: Optional[str] = Query("anonymous_user"),
    db: Session = Depends(get_db)
):
    """
    Citizen upvote / validation endpoint for confirming damage at an existing location.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # Check for existing upvote
    existing = db.query(ReportUpvote).filter(
        ReportUpvote.report_id == report_id,
        ReportUpvote.voter_identifier == client_id
    ).first()

    if existing:
        return {"message": "You have already upvoted this report.", "upvotes_count": report.upvotes_count}

    new_upvote = ReportUpvote(report_id=report_id, voter_identifier=client_id)
    report.upvotes_count = (report.upvotes_count or 0) + 1
    db.add(new_upvote)
    db.commit()

    return {"message": "Upvote recorded successfully.", "upvotes_count": report.upvotes_count}
