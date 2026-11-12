import math
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Report
from app.config import settings

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two coordinates in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 1)

def find_nearby_duplicate_reports(
    db: Session,
    latitude: float,
    longitude: float,
    radius_meters: float = None,
    time_window_days: int = None,
    exclude_report_id: int = None
) -> List[Dict[str, Any]]:
    """
    Finds active unresolved reports within radius_meters and time_window_days.
    """
    radius = radius_meters if radius_meters is not None else settings.DUPLICATE_RADIUS_METERS
    days = time_window_days if time_window_days is not None else settings.DUPLICATE_TIME_WINDOW_DAYS
    
    cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    # Query active reports from recent window
    # Rough bounding box filter to limit candidates before precise haversine
    # 1 deg latitude ~ 111 km -> 100 meters is ~ 0.001 degrees
    lat_delta = (radius / 111000.0) * 1.5
    lon_delta = (radius / (111000.0 * max(0.1, math.cos(math.radians(latitude))))) * 1.5

    query = db.query(Report).filter(
        Report.created_at >= cutoff_date,
        Report.status.notin_(["Resolved", "Rejected"]),
        Report.latitude >= latitude - lat_delta,
        Report.latitude <= latitude + lat_delta,
        Report.longitude >= longitude - lon_delta,
        Report.longitude <= longitude + lon_delta
    )

    if exclude_report_id:
        query = query.filter(Report.id != exclude_report_id)

    candidates = query.all()
    duplicates = []

    for report in candidates:
        dist = haversine_distance_meters(latitude, longitude, report.latitude, report.longitude)
        if dist <= radius:
            duplicates.append({
                "id": report.id,
                "tracking_number": report.tracking_number,
                "title": report.title,
                "distance_meters": dist,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "address": report.address,
                "severity": report.severity,
                "status": report.status,
                "image_url": report.image_url,
                "created_at": report.created_at
            })

    # Sort nearest first
    duplicates.sort(key=lambda x: x["distance_meters"])
    return duplicates
