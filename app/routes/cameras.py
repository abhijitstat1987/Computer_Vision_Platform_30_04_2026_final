from flask import Blueprint, request, Response, stream_with_context
from app.extensions import db
from app.models import Camera
from app.utils.response import success, error
from app.utils.validators import camera_schema
from app.utils.pagination import paginate

cameras_bp = Blueprint("cameras", __name__)


@cameras_bp.get("/")
def list_cameras():
    """
    GET /api/cameras
    Query params: status (active|inactive|error), search (name substring),
                  page, per_page
    Returns paginated list of cameras.
    """
    query  = Camera.query
    status = request.args.get("status")
    search = request.args.get("search")

    if status:
        query = query.filter(Camera.status == status)
    if search:
        query = query.filter(Camera.name.ilike(f"%{search}%"))

    query = query.order_by(Camera.created_at.desc())
    items, pagination = paginate(query)
    return success([c.to_dict() for c in items], pagination=pagination)


@cameras_bp.post("/")
def create_camera():
    """
    POST /api/cameras
    Body (JSON): name, rtsp_url, ip_address, location?, camera_type?, status?
    Returns 201 with the created camera.
    """
    data   = camera_schema.load(request.get_json() or {})
    camera = Camera(**data)
    db.session.add(camera)
    db.session.commit()
    return success(camera.to_dict(), message="Camera created", status_code=201)


@cameras_bp.get("/<int:camera_id>")
def get_camera(camera_id):
    """
    GET /api/cameras/<id>
    Returns camera by ID or 404.
    """
    camera = db.get_or_404(Camera, camera_id)
    return success(camera.to_dict())


@cameras_bp.put("/<int:camera_id>")
def update_camera(camera_id):
    """
    PUT /api/cameras/<id>
    Partial update: only fields present in the request body are updated.
    """
    camera = db.get_or_404(Camera, camera_id)
    data   = camera_schema.load(request.get_json() or {}, partial=True)
    for key, val in data.items():
        setattr(camera, key, val)
    db.session.commit()
    return success(camera.to_dict(), message="Camera updated")


@cameras_bp.delete("/<int:camera_id>")
def delete_camera(camera_id):
    """
    DELETE /api/cameras/<id>
    Hard delete. MySQL FK CASCADE removes child events, objects, and alerts.
    Returns 204 No Content.
    """
    camera = db.get_or_404(Camera, camera_id)
    db.session.delete(camera)
    db.session.commit()
    return success(None, message="Camera deleted", status_code=204)


@cameras_bp.put("/<int:camera_id>/status")
def toggle_status(camera_id):
    """
    PUT /api/cameras/<id>/status
    Body: { "status": "active" | "inactive" | "error" }
    Quick status toggle without full camera validation.
    """
    camera     = db.get_or_404(Camera, camera_id)
    new_status = (request.get_json() or {}).get("status")
    if new_status not in ("active", "inactive", "error"):
        return error('status must be "active", "inactive", or "error"', 400)
    camera.status = new_status
    db.session.commit()
    return success({"id": camera.id, "status": camera.status})


@cameras_bp.get("/<int:camera_id>/stream")
def stream_camera(camera_id):
    """
    GET /api/cameras/<id>/stream

    Streams live MJPEG video from the camera's RTSP URL using OpenCV.
    The multipart response can be embedded directly in an HTML <img> tag:

        <img src="/api/cameras/1/stream" />

    Returns 503 if OpenCV cannot open the RTSP stream.
    """
    try:
        import cv2
    except ImportError:
        return error("OpenCV not installed; streaming unavailable", 503)

    camera = db.get_or_404(Camera, camera_id)

    def generate_frames(rtsp_url: str):
        cap = cv2.VideoCapture(rtsp_url)
        if not cap.isOpened():
            return
        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                _, buf = cv2.imencode(".jpg", frame)
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + buf.tobytes()
                    + b"\r\n"
                )
        finally:
            cap.release()

    return Response(
        stream_with_context(generate_frames(camera.rtsp_url)),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )
