import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "citizen"

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

# --- Detection Box Schemas ---
class BoundingBox(BaseModel):
    x1: float = Field(..., description="Normalized or pixel x1 top-left")
    y1: float = Field(..., description="Normalized or pixel y1 top-left")
    x2: float = Field(..., description="Normalized or pixel x2 bottom-right")
    y2: float = Field(..., description="Normalized or pixel y2 bottom-right")
    confidence: float
    label: str = "pothole"

class DetectionResult(BaseModel):
    detected: bool
    count: int
    confidence: float
    boxes: List[BoundingBox]
    detector_type: str  # "yolov8_model" | "cv_heuristic" | "demo_simulation"
    is_demo_mode: bool
    notice: str
    preliminary_severity: str
    preliminary_score: float
    surface_damage_ratio: float

# --- Status History Schemas ---
class StatusHistoryOut(BaseModel):
    id: int
    from_status: str
    to_status: str
    changed_by_user: str
    admin_notes: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Report Schemas ---
class ReportBase(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    citizen_name: Optional[str] = "Anonymous Citizen"
    citizen_contact: Optional[str] = None

class ReportCreate(ReportBase):
    severity: Optional[str] = None  # If not provided, computed by severity service
    is_demo_mode: Optional[bool] = False

class ReportOut(ReportBase):
    id: int
    tracking_number: str
    user_id: Optional[int] = None
    image_filename: str
    image_url: str
    severity: str
    severity_score: float
    severity_breakdown: Optional[str] = None
    status: str
    priority: str
    assigned_department: Optional[str] = None
    assigned_crew: Optional[str] = None
    ai_detected: bool
    ai_count: int
    ai_confidence: float
    ai_boxes_json: str
    detector_type: str
    is_demo_mode: bool
    upvotes_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    status_history: List[StatusHistoryOut] = []

    class Config:
        from_attributes = True

# --- Duplicate Check Schemas ---
class DuplicateMatch(BaseModel):
    id: int
    tracking_number: str
    title: str
    distance_meters: float
    latitude: float
    longitude: float
    address: str
    severity: str
    status: str
    image_url: str
    created_at: datetime.datetime

class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    matches: List[DuplicateMatch]
    message: str

# --- Admin Status Update Schemas ---
class StatusUpdate(BaseModel):
    new_status: str
    admin_notes: Optional[str] = None
    priority: Optional[str] = None
    assigned_department: Optional[str] = None
    assigned_crew: Optional[str] = None

# --- Analytics Schemas ---
class SeverityCount(BaseModel):
    severity: str
    count: int

class StatusCount(BaseModel):
    status: str
    count: int

class TrendPoint(BaseModel):
    date: str
    count: int

class DashboardAnalytics(BaseModel):
    total_reports: int
    pending_reports: int
    in_progress_reports: int
    resolved_reports: int
    rejected_reports: int
    critical_reports: int
    resolution_rate: float
    avg_resolution_days: float
    severity_distribution: List[SeverityCount]
    status_distribution: List[StatusCount]
    weekly_trend: List[TrendPoint]
    recent_activity: List[ReportOut]
