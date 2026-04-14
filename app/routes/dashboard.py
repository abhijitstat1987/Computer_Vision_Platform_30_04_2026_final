from datetime import date
from flask import Blueprint
from app.extensions import db
from app.models import Camera, DetectionEvent, Alert
from app.utils.response import success

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/dashboard")
def get_dashboard():
    """
    GET /api/dashboard

    Returns aggregate statistics for the dashboard overview:
      - total_cameras
      - active_cameras
      - total_detections_today
      - unresolved_alerts
      - recent_events (last 10, with camera_name included)
    """
    today = date.today()

    total_cameras    = Camera.query.count()
    active_cameras   = Camera.query.filter_by(status="active").count()
    detections_today = DetectionEvent.query.filter(
        db.func.date(DetectionEvent.detected_at) == today
    ).count()
    unresolved_count = Alert.query.filter_by(status="unresolved").count()

    recent_events = (
        DetectionEvent.query
        .order_by(DetectionEvent.detected_at.desc())
        .limit(10)
        .all()
    )

    return success({
        "total_cameras":          total_cameras,
        "active_cameras":         active_cameras,
        "total_detections_today": detections_today,
        "unresolved_alerts":      unresolved_count,
        "recent_events": [
            {**e.to_dict(), "camera_name": e.camera.name}
            for e in recent_events
        ],
    })
