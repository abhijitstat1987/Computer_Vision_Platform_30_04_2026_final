from datetime import datetime, timedelta
from flask import Blueprint, request
from sqlalchemy import func
from app.extensions import db
from app.models import DetectionEvent, DetectedObject, Camera, Alert
from app.utils.response import success

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/summary")
def summary():
    """
    GET /api/analytics/summary

    Returns:
      total_events, events_by_camera, events_by_type,
      top_labels (top 10), total_alerts, unresolved_alerts
    """
    total_events = DetectionEvent.query.count()

    events_by_camera = (
        db.session.query(
            Camera.id.label("camera_id"),
            Camera.name.label("camera_name"),
            func.count(DetectionEvent.id).label("count"),
        )
        .join(DetectionEvent, Camera.id == DetectionEvent.camera_id)
        .group_by(Camera.id, Camera.name)
        .order_by(func.count(DetectionEvent.id).desc())
        .all()
    )

    events_by_type = (
        db.session.query(
            DetectionEvent.event_type,
            func.count().label("count"),
        )
        .group_by(DetectionEvent.event_type)
        .all()
    )

    top_labels = (
        db.session.query(
            DetectedObject.label,
            func.count().label("count"),
        )
        .group_by(DetectedObject.label)
        .order_by(func.count().desc())
        .limit(10)
        .all()
    )

    return success({
        "total_events":      total_events,
        "events_by_camera":  [dict(r._mapping) for r in events_by_camera],
        "events_by_type":    [dict(r._mapping) for r in events_by_type],
        "top_labels":        [dict(r._mapping) for r in top_labels],
        "total_alerts":      Alert.query.count(),
        "unresolved_alerts": Alert.query.filter_by(status="unresolved").count(),
    })


@analytics_bp.get("/detections-over-time")
def detections_over_time():
    """
    GET /api/analytics/detections-over-time
    Query params:
      granularity : "hour" | "day"  (default: "day")
      days        : int look-back window (default: 7)

    Returns time-series list: [{"period": "2026-04-10", "count": 42}, ...]
    Uses MySQL DATE_FORMAT for grouping.
    """
    granularity = request.args.get("granularity", "day")
    try:
        days = int(request.args.get("days", 7))
    except ValueError:
        days = 7

    since = datetime.utcnow() - timedelta(days=days)
    fmt   = "%Y-%m-%d %H:00" if granularity == "hour" else "%Y-%m-%d"

    rows = (
        db.session.query(
            func.date_format(DetectionEvent.detected_at, fmt).label("period"),
            func.count().label("count"),
        )
        .filter(DetectionEvent.detected_at >= since)
        .group_by("period")
        .order_by("period")
        .all()
    )
    return success([dict(r._mapping) for r in rows])


@analytics_bp.get("/top-objects")
def top_objects():
    """
    GET /api/analytics/top-objects
    Query params: limit (default 10)
    Returns most frequently detected object labels.
    [{"label": "person", "count": 382}, ...]
    """
    try:
        limit = int(request.args.get("limit", 10))
    except ValueError:
        limit = 10

    rows = (
        db.session.query(
            DetectedObject.label,
            func.count().label("count"),
        )
        .group_by(DetectedObject.label)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )
    return success([dict(r._mapping) for r in rows])


@analytics_bp.get("/camera-activity")
def camera_activity():
    """
    GET /api/analytics/camera-activity
    Returns per-camera event counts for the last 30 days.
    [{"camera_id": 1, "camera_name": "Front Door", "count": 58}, ...]
    Useful for bar charts in the analytics panel.
    """
    since = datetime.utcnow() - timedelta(days=30)

    rows = (
        db.session.query(
            Camera.id.label("camera_id"),
            Camera.name.label("camera_name"),
            func.count(DetectionEvent.id).label("count"),
        )
        .outerjoin(
            DetectionEvent,
            (Camera.id == DetectionEvent.camera_id)
            & (DetectionEvent.detected_at >= since),
        )
        .group_by(Camera.id, Camera.name)
        .order_by(func.count(DetectionEvent.id).desc())
        .all()
    )
    return success([dict(r._mapping) for r in rows])
