import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen", nullable=False)  # "citizen" or "admin"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    reports = relationship("Report", back_populates="reporter")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. CE-2026-1042
    
    # Reporter (optional for anonymous/demo submissions)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen_name = Column(String(255), default="Anonymous Citizen")
    citizen_contact = Column(String(255), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Image references
    image_filename = Column(String(255), nullable=False)
    image_url = Column(String(500), nullable=False)
    
    # Coordinates & Address
    latitude = Column(Float, index=True, nullable=False)
    longitude = Column(Float, index=True, nullable=False)
    address = Column(String(500), nullable=False)
    
    # Severity & Assessment
    severity = Column(String(50), default="Medium", nullable=False)  # "Low", "Medium", "High", "Critical"
    severity_score = Column(Float, default=50.0)  # 0.0 to 100.0
    severity_breakdown = Column(Text, nullable=True)  # JSON explanation of scoring factors
    
    # Complaint lifecycle
    status = Column(String(50), default="Submitted", nullable=False)  # Submitted, Under Review, Assigned, In Progress, Resolved, Rejected
    priority = Column(String(50), default="Normal")  # Normal, Urgent, Emergency
    assigned_department = Column(String(255), nullable=True)  # e.g. "Public Works - Rapid Response Unit 4"
    assigned_crew = Column(String(255), nullable=True)
    
    # AI detection results
    ai_detected = Column(Boolean, default=False)
    ai_count = Column(Integer, default=0)
    ai_confidence = Column(Float, default=0.0)
    ai_boxes_json = Column(Text, default="[]")  # JSON serialized list of detections
    detector_type = Column(String(100), default="demo_simulation")  # "yolov8_model", "cv_heuristic", "demo_simulation"
    is_demo_mode = Column(Boolean, default=True)  # Honest disclosure
    
    # Engagement
    upvotes_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    reporter = relationship("User", back_populates="reports")
    status_history = relationship("ReportStatusHistory", back_populates="report", cascade="all, delete-orphan", order_by="desc(ReportStatusHistory.created_at)")
    upvotes = relationship("ReportUpvote", back_populates="report", cascade="all, delete-orphan")


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    from_status = Column(String(50), nullable=False)
    to_status = Column(String(50), nullable=False)
    changed_by_user = Column(String(255), default="System")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="status_history")


class ReportUpvote(Base):
    __tablename__ = "report_upvotes"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    voter_identifier = Column(String(255), nullable=False)  # User ID or IP/client hash
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="upvotes")
