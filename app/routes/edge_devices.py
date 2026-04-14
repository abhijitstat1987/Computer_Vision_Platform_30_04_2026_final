from flask import Blueprint, request
from app.extensions import db
from app.models import EdgeDevice
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

edge_devices_bp = Blueprint("edge_devices", __name__)


class EdgeDeviceSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name       = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    location   = fields.Str(load_default="")
    status     = fields.Str(load_default="offline",
                            validate=validate.OneOf(["online", "offline"]))
    cpu        = fields.Str(load_default="0%")
    memory     = fields.Str(load_default="0%")
    storage    = fields.Str(load_default="0%")
    models     = fields.Int(load_default=0)
    ip_address = fields.Str(load_default="")
    platform   = fields.Str(load_default=None)
    gpu_model  = fields.Str(load_default=None)

_schema = EdgeDeviceSchema()


@edge_devices_bp.get("/")
def list_devices():
    query = EdgeDevice.query
    status = request.args.get("status")
    search = request.args.get("search")
    if status:
        query = query.filter(EdgeDevice.status == status)
    if search:
        query = query.filter(EdgeDevice.name.ilike(f"%{search}%"))
    query = query.order_by(EdgeDevice.created_at.desc())
    items, pagination = paginate(query)
    return success([d.to_dict() for d in items], pagination=pagination)


@edge_devices_bp.post("/")
def create_device():
    data = _schema.load(request.get_json() or {})
    device = EdgeDevice(**data)
    db.session.add(device)
    db.session.commit()
    return success(device.to_dict(), message="Edge device created", status_code=201)


@edge_devices_bp.get("/<int:device_id>")
def get_device(device_id):
    device = db.get_or_404(EdgeDevice, device_id)
    return success(device.to_dict())


@edge_devices_bp.put("/<int:device_id>")
def update_device(device_id):
    device = db.get_or_404(EdgeDevice, device_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(device, k, v)
    db.session.commit()
    return success(device.to_dict(), message="Edge device updated")


@edge_devices_bp.delete("/<int:device_id>")
def delete_device(device_id):
    device = db.get_or_404(EdgeDevice, device_id)
    db.session.delete(device)
    db.session.commit()
    return success(None, message="Edge device deleted", status_code=204)


@edge_devices_bp.put("/<int:device_id>/status")
def toggle_status(device_id):
    device = db.get_or_404(EdgeDevice, device_id)
    new_status = (request.get_json() or {}).get("status")
    if new_status not in ("online", "offline"):
        return error('status must be "online" or "offline"', 400)
    device.status = new_status
    db.session.commit()
    return success({"id": device.id, "status": device.status})
