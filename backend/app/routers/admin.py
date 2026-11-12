import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Report, ReportStatusHistory, User
from app.schemas import StatusUpdate, ReportOut
from app.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.patch("/reports/{report_id}/status", response_model=ReportOut)
def update_report_status(
    report_id: int,
    update_data: StatusUpdate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the lifecycle status of a report and records an audit log entry.
    Allowed statuses: Submitted, Under Review, Assigned, In Progress, Resolved, Rejected.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    valid_statuses = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"]
    if update_data.new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{update_data.new_status}'. Allowed: {', '.join(valid_statuses)}"
        )

    previous_status = report.status
    report.status = update_data.new_status

    if update_data.priority:
        report.priority = update_data.priority
    if update_data.assigned_department:
        report.assigned_department = update_data.assigned_department
    if update_data.assigned_crew:
        report.assigned_crew = update_data.assigned_crew

    admin_identifier = current_user.email if current_user else "Admin (Demo Mode)"

    # Audit history record
    history_entry = ReportStatusHistory(
        report_id=report.id,
        from_status=previous_status,
        to_status=update_data.new_status,
        changed_by_user=admin_identifier,
        admin_notes=update_data.admin_notes or f"Status changed from {previous_status} to {update_data.new_status}"
    )
    db.add(history_entry)
    db.commit()
    db.refresh(report)

    return report


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """
    Removes a report and associated audit log.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    db.delete(report)
    db.commit()
    return None


@router.get("/export/csv")
def export_reports_csv(db: Session = Depends(get_db)):
    """
    Exports all reports to a CSV file for municipal data sharing and spreadsheets.
    """
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Tracking ID", "Title", "Status", "Severity", "Severity Score",
        "Latitude", "Longitude", "Address", "Priority", "Assigned Department",
        "Assigned Crew", "AI Detected", "Pothole Count", "Reporter", "Created At"
    ])

    for r in reports:
        writer.writerow([
            r.tracking_number,
            r.title,
            r.status,
            r.severity,
            r.severity_score,
            r.latitude,
            r.longitude,
            r.address,
            r.priority,
            r.assigned_department or "Unassigned",
            r.assigned_crew or "Unassigned",
            r.ai_detected,
            r.ai_count,
            r.citizen_name,
            r.created_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=civiceye_reports.csv"}
    )
