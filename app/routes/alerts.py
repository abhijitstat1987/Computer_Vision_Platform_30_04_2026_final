from flask import Blueprint, request
from app.extensions import db
from app.models import Alert
from app.utils.response import success
from app.utils.validators import alert_schema
from app.utils.pagination import paginate

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.get("/")
def list_alerts():
    """
    GET /api/alerts
    Query params: status, camera_id, alert_type, page, per_page
    Returns paginated alert list ordered by most recent first.
    """
    query     = Alert.query
    status    = request.args.get("status")
    camera_id = request.args.get("camera_id", type=int)
    atype     = request.args.get("alert_type")

    if status:
        query = query.filter(Alert.status == status)
    if camera_id:
        query = query.filter(Alert.camera_id == camera_id)
    if atype:
        query = query.filter(Alert.alert_type == atype)

    query = query.order_by(Alert.created_at.desc())
    items, pagination = paginate(query)
    return success([a.to_dict() for a in items], pagination=pagination)


@alerts_bp.post("/")
def create_alert():
    """
    POST /api/alerts
    Body: camera_id (required), event_id?, alert_type?, message (required), status?
    Returns 201 with the created alert.
    """
    data  = alert_schema.load(request.get_json() or {})
    alert = Alert(**data)
    db.session.add(alert)
    db.session.commit()
    return success(alert.to_dict(), message="Alert created", status_code=201)


@alerts_bp.put("/<int:alert_id>")
def update_alert(alert_id):
    """
    PUT /api/alerts/<id>
    Partial update. Typical use: acknowledge or resolve an alert.
    Body example: { "status": "acknowledged" }
    """
    alert = db.get_or_404(Alert, alert_id)
    data  = alert_schema.load(request.get_json() or {}, partial=True)
    for key, val in data.items():
        setattr(alert, key, val)
    db.session.commit()
    return success(alert.to_dict(), message="Alert updated")
