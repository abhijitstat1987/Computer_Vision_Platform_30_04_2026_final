import os
from datetime import datetime
from flask import Blueprint, request, send_from_directory, current_app
from app.extensions import db
from app.models import DetectionEvent, DetectedObject
from app.utils.response import success, error
from app.utils.validators import event_schema, obj_schema
from app.utils.pagination import paginate

detections_bp = Blueprint("detections", __name__)


@detections_bp.get("/")
def list_detections():
    """
    GET /api/detections
    Query params:
      camera_id   : int
      event_type  : str
      date_from   : YYYY-MM-DD
      date_to     : YYYY-MM-DD
      page, per_page
    Returns paginated list of detection events (without nested objects).
    """
    query      = DetectionEvent.query
    camera_id  = request.args.get("camera_id", type=int)
    event_type = request.args.get("event_type")
    date_from  = request.args.get("date_from")
    date_to    = request.args.get("date_to")

    if camera_id:
        query = query.filter(DetectionEvent.camera_id == camera_id)
    if event_type:
        query = query.filter(DetectionEvent.event_type == event_type)
    if date_from:
        try:
            query = query.filter(
                DetectionEvent.detected_at >= datetime.fromisoformat(date_from)
            )
        except ValueError:
            return error("Invalid date_from format. Use YYYY-MM-DD", 400)
    if date_to:
        try:
            query = query.filter(
                DetectionEvent.detected_at <= datetime.fromisoformat(date_to + "T23:59:59")
            )
        except ValueError:
            return error("Invalid date_to format. Use YYYY-MM-DD", 400)

    query = query.order_by(DetectionEvent.detected_at.desc())
    items, pagination = paginate(query)
    return success([e.to_dict() for e in items], pagination=pagination)


@detections_bp.get("/<int:event_id>")
def get_detection(event_id):
    """
    GET /api/detections/<id>
    Returns the detection event with its full detected_objects list.
    """
    event = db.get_or_404(DetectionEvent, event_id)
    return success(event.to_dict(include_objects=True))


@detections_bp.post("/")
def create_detection():
    """
    POST /api/detections

    Called by the CV inference engine after processing a frame.
    Atomically inserts DetectionEvent + all DetectedObject rows.

    Body (JSON):
    {
      "camera_id": 1,
      "event_type": "object_detection",
      "detected_at": "2026-04-10T14:30:00",   // optional
      "snapshot_path": "cam1_20260410.jpg",    // relative filename
      "objects": [
        {"label": "person", "confidence": 0.97, "x1": 10, "y1": 20, "x2": 80, "y2": 160}
      ]
    }
    """
    payload  = event_schema.load(request.get_json() or {})
    raw_objs = payload.pop("objects", [])

    event = DetectionEvent(
        camera_id     = payload["camera_id"],
        event_type    = payload.get("event_type", "object_detection"),
        detected_at   = payload.get("detected_at") or datetime.utcnow(),
        snapshot_path = payload.get("snapshot_path"),
    )
    db.session.add(event)
    db.session.flush()   # obtain event.id before committing

    for obj_data in raw_objs:
        validated = obj_schema.load(obj_data)
        db.session.add(DetectedObject(event_id=event.id, **validated))

    db.session.commit()
    return success(
        event.to_dict(include_objects=True),
        message="Detection recorded",
        status_code=201,
    )


@detections_bp.get("/<int:event_id>/snapshot")
def get_snapshot(event_id):
    """
    GET /api/detections/<id>/snapshot
    Serves the snapshot image file for this detection event.
    Uses send_from_directory to prevent path traversal attacks.
    Returns 404 if snapshot_path is null or file is missing.
    """
    event = db.get_or_404(DetectionEvent, event_id)
    if not event.snapshot_path:
        return error("No snapshot available for this event", 404)

    uploads_dir = current_app.config["UPLOAD_FOLDER"]
    filename    = os.path.basename(event.snapshot_path)
    return send_from_directory(uploads_dir, filename)
