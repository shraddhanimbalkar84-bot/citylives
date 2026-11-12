import json
from typing import List, Dict, Any, Tuple

def calculate_severity_score(
    boxes: List[Dict[str, Any]],
    image_width: int = 1000,
    image_height: int = 1000,
    manual_override: str = None
) -> Tuple[str, float, str]:
    """
    Computes a documented, rule-based severity score for detected road damage.
    
    Formula:
    - Base damage by count: 15 points per detected pothole (capped at 45)
    - Relative surface area ratio: up to 40 points based on max pothole area
    - Density/total area ratio: up to 15 points based on cumulative damaged area
    
    Tiers:
    - Low:      0 - 34
    - Medium:   35 - 59
    - High:     60 - 79
    - Critical: 80 - 100
    
    All estimates clearly document that image-based calculations are preliminary.
    """
    if manual_override and manual_override in ("Low", "Medium", "High", "Critical"):
        tier_scores = {"Low": 25.0, "Medium": 50.0, "High": 75.0, "Critical": 90.0}
        breakdown = {
            "pothole_count": len(boxes),
            "max_box_area_pct": 0.0,
            "total_damage_pct": 0.0,
            "calculated_score": tier_scores[manual_override],
            "severity_tier": manual_override,
            "human_override": True,
            "formula_note": "Score overridden by authorized reviewer.",
            "disclaimer": "Preliminary automated estimate adjusted via human assessment."
        }
        return manual_override, tier_scores[manual_override], json.dumps(breakdown)

    if not boxes:
        breakdown = {
            "pothole_count": 0,
            "max_box_area_pct": 0.0,
            "total_damage_pct": 0.0,
            "calculated_score": 15.0,
            "severity_tier": "Low",
            "human_override": False,
            "formula_note": "No distinct potholes detected; minor surface distress baseline.",
            "disclaimer": "Preliminary automated estimate. In-person municipal inspection is required for final verification."
        }
        return "Low", 15.0, json.dumps(breakdown)

    total_image_area = max(1, image_width * image_height)
    max_area_ratio = 0.0
    cumulative_area = 0.0
    confidences = []

    for box in boxes:
        # Normalized or pixel coordinates
        x1, y1 = float(box.get("x1", 0)), float(box.get("y1", 0))
        x2, y2 = float(box.get("x2", 0)), float(box.get("y2", 0))
        conf = float(box.get("confidence", 0.8))
        confidences.append(conf)

        # Handle both normalized [0-1] and pixel coordinates
        w = abs(x2 - x1)
        h = abs(y2 - y1)
        if x2 <= 1.0 and y2 <= 1.0 and image_width > 1 and image_height > 1:
            box_area = (w * image_width) * (h * image_height)
        else:
            box_area = w * h

        area_ratio = box_area / total_image_area
        max_area_ratio = max(max_area_ratio, area_ratio)
        cumulative_area += box_area

    cumulative_ratio = min(1.0, cumulative_area / total_image_area)
    count = len(boxes)

    # 1. Count component: max 40 points
    count_score = min(40.0, count * 15.0)

    # 2. Maximum single pothole size component: max 40 points
    # A pothole taking > 15% of the frame is severe (40 pts)
    size_score = min(40.0, (max_area_ratio / 0.15) * 40.0)

    # 3. Cumulative area component: max 20 points
    cumulative_score = min(20.0, (cumulative_ratio / 0.25) * 20.0)

    total_score = round(min(100.0, count_score + size_score + cumulative_score), 1)

    # Map to tier
    if total_score >= 80.0:
        tier = "Critical"
    elif total_score >= 60.0:
        tier = "High"
    elif total_score >= 35.0:
        tier = "Medium"
    else:
        tier = "Low"

    breakdown = {
        "pothole_count": count,
        "max_box_area_pct": round(max_area_ratio * 100, 2),
        "total_damage_pct": round(cumulative_ratio * 100, 2),
        "avg_confidence": round(sum(confidences) / len(confidences), 3) if confidences else 0.0,
        "count_component": round(count_score, 1),
        "size_component": round(size_score, 1),
        "cumulative_component": round(cumulative_score, 1),
        "calculated_score": total_score,
        "severity_tier": tier,
        "human_override": False,
        "formula_note": "Documented Rule: Count (max 40) + Single Pothole Size (max 40) + Cumulative Area (max 20).",
        "disclaimer": "Preliminary automated estimate based on visual analysis. Requires on-site verification by road maintenance personnel."
    }

    return tier, total_score, json.dumps(breakdown)
