import os
import json
import datetime
from sqlalchemy.orm import Session
from app.models import User, Report, ReportStatusHistory
from app.auth import hash_password
from app.config import settings

def create_sample_placeholder_image(filename: str, title: str, severity: str) -> str:
    """
    Ensures a realistic demo visual exists in uploads/ for seeded reports.
    Uses PIL to create a clean preview with road texture and bounding box visualization.
    """
    from PIL import Image, ImageDraw, ImageFont
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        return f"/uploads/{filename}"

    # Create 640x480 asphalt road textured image
    img = Image.new("RGB", (640, 480), color=(55, 60, 68))
    draw = ImageDraw.Draw(img)

    # Add road lane markings
    draw.line([(320, 0), (320, 120)], fill=(240, 200, 50), width=6)
    draw.line([(320, 200), (320, 320)], fill=(240, 200, 50), width=6)
    draw.line([(320, 400), (320, 480)], fill=(240, 200, 50), width=6)

    # Road surface texture noise
    import random
    rng = random.Random(hash(filename))
    for _ in range(1200):
        x = rng.randint(0, 639)
        y = rng.randint(0, 479)
        shade = rng.randint(40, 75)
        img.putpixel((x, y), (shade, shade, shade))

    # Pothole cavity depiction
    severity_colors = {
        "Critical": (239, 68, 68),
        "High": (249, 115, 22),
        "Medium": (245, 158, 11),
        "Low": (16, 185, 129)
    }
    box_color = severity_colors.get(severity, (245, 158, 11))

    # Draw dark irregular cavity
    draw.ellipse([210, 220, 430, 360], fill=(25, 28, 32), outline=(15, 18, 20), width=3)
    draw.ellipse([240, 250, 400, 330], fill=(12, 14, 18))

    # Draw AI bounding box preview overlay
    draw.rectangle([190, 200, 450, 380], outline=box_color, width=3)
    draw.rectangle([190, 175, 360, 200], fill=box_color)
    draw.text((195, 180), f"POTHOLE 91% ({severity})", fill=(255, 255, 255))

    # Sample data watermark
    draw.rectangle([10, 10, 220, 35], fill=(15, 23, 42))
    draw.text((18, 16), "CivicEye [Sample Data]", fill=(148, 163, 184))

    img.save(filepath, "JPEG")
    return f"/uploads/{filename}"


def seed_database(db: Session):
    """
    Seeds the SQLite database with realistic, demonstrative data.
    Clearly marked as Sample Data.
    """
    # 1. Admin & Citizen demo accounts
    admin_user = db.query(User).filter(User.email == "admin@civiceye.gov").first()
    if not admin_user:
        admin_user = User(
            email="admin@civiceye.gov",
            hashed_password=hash_password("admin123"),
            full_name="Municipal Road Ops Admin",
            role="admin",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=45)
        )
        db.add(admin_user)

    citizen_user = db.query(User).filter(User.email == "citizen@example.org").first()
    if not citizen_user:
        citizen_user = User(
            email="citizen@example.org",
            hashed_password=hash_password("citizen123"),
            full_name="Alex Rivera",
            role="citizen",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=30)
        )
        db.add(citizen_user)

    db.commit()

    # Check if reports already exist
    existing_reports_count = db.query(Report).count()
    if existing_reports_count > 0:
        return

    # Seed 8 realistic, diverse reports
    now = datetime.datetime.utcnow()

    sample_reports = [
        {
            "tracking_number": "CE-2026-1041",
            "title": "Severe crater on 4th Ave & Pike St intersection",
            "description": "Deep asphalt collapse in the middle lane right after the crosswalk. Multiple vehicles bottoming out during evening commute.",
            "filename": "sample_pothole_1.jpg",
            "lat": 47.6085,
            "lon": -122.3378,
            "address": "400 Pike St, Seattle, WA 98101",
            "severity": "Critical",
            "score": 88.5,
            "status": "In Progress",
            "priority": "Emergency",
            "department": "Public Works - Rapid Response Crew #2",
            "crew": "Unit 2B (Foreman J. Miller)",
            "ai_detected": True,
            "ai_count": 2,
            "ai_confidence": 0.93,
            "boxes": [
                {"x1": 190, "y1": 200, "x2": 450, "y2": 380, "confidence": 0.94, "label": "pothole"},
                {"x1": 460, "y1": 280, "x2": 540, "y2": 340, "confidence": 0.88, "label": "crack"}
            ],
            "upvotes": 14,
            "days_ago": 3,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Reviewed photo; confirmed high traffic artery hazard."),
                ("Under Review", "Assigned", "admin@civiceye.gov", "Dispatched Rapid Response Crew #2 for immediate asphalt patch."),
                ("Assigned", "In Progress", "admin@civiceye.gov", "Crew on site; lane closed with orange traffic barrels.")
            ]
        },
        {
            "tracking_number": "CE-2026-1042",
            "title": "Cluster of potholes near Pike Place Market entrance",
            "description": "Two deep surface potholes creating hazards for delivery trucks and rideshare vehicles.",
            "filename": "sample_pothole_2.jpg",
            "lat": 47.6092,
            "lon": -122.3412,
            "address": "1500 1st Ave, Seattle, WA 98101",
            "severity": "High",
            "score": 68.0,
            "status": "Assigned",
            "priority": "Urgent",
            "department": "Department of Transportation - District 1",
            "crew": "District Maintenance 1",
            "ai_detected": True,
            "ai_count": 2,
            "ai_confidence": 0.89,
            "boxes": [
                {"x1": 180, "y1": 210, "x2": 390, "y2": 350, "confidence": 0.91, "label": "pothole"}
            ],
            "upvotes": 9,
            "days_ago": 4,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Initial inspection logged."),
                ("Under Review", "Assigned", "admin@civiceye.gov", "Scheduled for Friday resurfacing schedule.")
            ]
        },
        {
            "tracking_number": "CE-2026-1043",
            "title": "Road cavity repaired on Mercer St & 9th Ave",
            "description": "Repaired 10-inch pothole that had damaged several vehicle rims.",
            "filename": "sample_pothole_3.jpg",
            "lat": 47.6248,
            "lon": -122.3392,
            "address": "900 Mercer St, Seattle, WA 98109",
            "severity": "Critical",
            "score": 85.0,
            "status": "Resolved",
            "priority": "Emergency",
            "department": "Public Works - Rapid Response Crew #1",
            "crew": "Crew 1A",
            "ai_detected": True,
            "ai_count": 1,
            "ai_confidence": 0.95,
            "boxes": [
                {"x1": 200, "y1": 220, "x2": 420, "y2": 360, "confidence": 0.95, "label": "pothole"}
            ],
            "upvotes": 22,
            "days_ago": 7,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Flagged as high-speed arterial hazard."),
                ("Under Review", "In Progress", "admin@civiceye.gov", "Emergency hot-mix asphalt crew dispatched."),
                ("In Progress", "Resolved", "admin@civiceye.gov", "Full cold-planing and hot-asphalt compact complete. Tested smooth.")
            ]
        },
        {
            "tracking_number": "CE-2026-1044",
            "title": "Moderate road depression on Pine St & 6th Ave",
            "description": "Asphalt sinking around manhole cover causing vehicle jolting.",
            "filename": "sample_pothole_4.jpg",
            "lat": 47.6125,
            "lon": -122.3345,
            "address": "600 Pine St, Seattle, WA 98101",
            "severity": "Medium",
            "score": 48.0,
            "status": "Under Review",
            "priority": "Normal",
            "department": "Civil Infrastructure Assessment",
            "crew": None,
            "ai_detected": True,
            "ai_count": 1,
            "ai_confidence": 0.84,
            "boxes": [
                {"x1": 230, "y1": 240, "x2": 380, "y2": 330, "confidence": 0.84, "label": "depression"}
            ],
            "upvotes": 4,
            "days_ago": 2,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Pending utility cross-check (Seattle City Light manhole).")
            ]
        },
        {
            "tracking_number": "CE-2026-1045",
            "title": "Dangerous road edge collapse on 2nd Ave S",
            "description": "Large section of right curb asphalt fractured. Cyclists having to swerve into traffic.",
            "filename": "sample_pothole_5.jpg",
            "lat": 47.6001,
            "lon": -122.3315,
            "address": "200 2nd Ave S, Seattle, WA 98104",
            "severity": "Critical",
            "score": 91.0,
            "status": "Submitted",
            "priority": "Emergency",
            "department": None,
            "crew": None,
            "ai_detected": True,
            "ai_count": 2,
            "ai_confidence": 0.92,
            "boxes": [
                {"x1": 150, "y1": 180, "x2": 480, "y2": 390, "confidence": 0.92, "label": "pothole"}
            ],
            "upvotes": 7,
            "days_ago": 1,
            "history": []
        },
        {
            "tracking_number": "CE-2026-1046",
            "title": "Minor hairline cracking on Stewart St",
            "description": "Small surface fissures starting to expand after recent rains. Needs sealing before winter.",
            "filename": "sample_pothole_6.jpg",
            "lat": 47.6160,
            "lon": -122.3360,
            "address": "1200 Stewart St, Seattle, WA 98101",
            "severity": "Low",
            "score": 24.0,
            "status": "Submitted",
            "priority": "Normal",
            "department": None,
            "crew": None,
            "ai_detected": True,
            "ai_count": 1,
            "ai_confidence": 0.79,
            "boxes": [
                {"x1": 280, "y1": 260, "x2": 370, "y2": 320, "confidence": 0.79, "label": "surface_crack"}
            ],
            "upvotes": 2,
            "days_ago": 1,
            "history": []
        },
        {
            "tracking_number": "CE-2026-1047",
            "title": "Deep pothole outside Westlake Station transit stop",
            "description": "Bus wheel impacts creating loud thuds and spraying muddy water toward waiting commuters.",
            "filename": "sample_pothole_7.jpg",
            "lat": 47.6115,
            "lon": -122.3370,
            "address": "4th Ave & Pine St, Seattle, WA 98101",
            "severity": "High",
            "score": 74.0,
            "status": "In Progress",
            "priority": "Urgent",
            "department": "Transit Corridor Maintenance",
            "crew": "Metro Transit Roads #3",
            "ai_detected": True,
            "ai_count": 1,
            "ai_confidence": 0.90,
            "boxes": [
                {"x1": 210, "y1": 210, "x2": 430, "y2": 360, "confidence": 0.90, "label": "pothole"}
            ],
            "upvotes": 18,
            "days_ago": 5,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Corridor priority flagged."),
                ("Under Review", "Assigned", "admin@civiceye.gov", "Assigned to Transit Corridor crew."),
                ("Assigned", "In Progress", "admin@civiceye.gov", "Temporary steel plate placed; permanent repair scheduled.")
            ]
        },
        {
            "tracking_number": "CE-2026-1048",
            "title": "Driveway apron crack on private residential entrance",
            "description": "Reported road damage was assessed to be within private property boundary line.",
            "filename": "sample_pothole_8.jpg",
            "lat": 47.6040,
            "lon": -122.3280,
            "address": "500 Yesler Way, Seattle, WA 98104",
            "severity": "Low",
            "score": 18.0,
            "status": "Rejected",
            "priority": "Normal",
            "department": None,
            "crew": None,
            "ai_detected": False,
            "ai_count": 0,
            "ai_confidence": 0.0,
            "boxes": [],
            "upvotes": 0,
            "days_ago": 6,
            "history": [
                ("Submitted", "Under Review", "admin@civiceye.gov", "Field inspector dispatched."),
                ("Under Review", "Rejected", "admin@civiceye.gov", "Damage is located on private driveway apron outside municipal road jurisdiction.")
            ]
        }
    ]

    for item in sample_reports:
        # Generate demo visual
        img_url = create_sample_placeholder_image(item["filename"], item["title"], item["severity"])
        
        breakdown = {
            "pothole_count": item["ai_count"],
            "max_box_area_pct": 14.5 if item["severity"] in ("Critical", "High") else 5.2,
            "total_damage_pct": 18.0 if item["severity"] in ("Critical", "High") else 6.0,
            "calculated_score": item["score"],
            "severity_tier": item["severity"],
            "human_override": False,
            "disclaimer": "[Sample Data] Preliminary estimate; verified by city inspector."
        }

        created_time = now - datetime.timedelta(days=item["days_ago"], hours=2)

        report = Report(
            tracking_number=item["tracking_number"],
            user_id=citizen_user.id if item["days_ago"] % 2 == 0 else None,
            citizen_name="Alex Rivera" if item["days_ago"] % 2 == 0 else "Seattle Citizen",
            citizen_contact="citizen@example.org" if item["days_ago"] % 2 == 0 else None,
            title=item["title"],
            description=item["description"],
            image_filename=item["filename"],
            image_url=img_url,
            latitude=item["lat"],
            longitude=item["lon"],
            address=item["address"],
            severity=item["severity"],
            severity_score=item["score"],
            severity_breakdown=json.dumps(breakdown),
            status=item["status"],
            priority=item["priority"],
            assigned_department=item["department"],
            assigned_crew=item["crew"],
            ai_detected=item["ai_detected"],
            ai_count=item["ai_count"],
            ai_confidence=item["ai_confidence"],
            ai_boxes_json=json.dumps(item["boxes"]),
            detector_type="cv_heuristic",
            is_demo_mode=True,
            upvotes_count=item["upvotes"],
            created_at=created_time,
            updated_at=created_time + datetime.timedelta(hours=4)
        )
        db.add(report)
        db.flush()

        # Add status history
        curr_time = created_time
        for from_s, to_s, user_e, notes in item["history"]:
            curr_time += datetime.timedelta(hours=6)
            hist = ReportStatusHistory(
                report_id=report.id,
                from_status=from_s,
                to_status=to_s,
                changed_by_user=user_e,
                admin_notes=notes,
                created_at=curr_time
            )
            db.add(hist)

    db.commit()
