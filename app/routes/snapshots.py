from flask import Blueprint, send_from_directory, current_app

snapshots_bp = Blueprint("snapshots", __name__)


@snapshots_bp.get("/snapshots/<path:filename>")
def serve_snapshot(filename):
    """
    GET /uploads/snapshots/<filename>

    Serves raw snapshot image files from UPLOAD_FOLDER.
    send_from_directory prevents directory traversal attacks.
    Typically referenced directly by frontend <img> tags or
    via the /api/detections/<id>/snapshot convenience endpoint.
    """
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
