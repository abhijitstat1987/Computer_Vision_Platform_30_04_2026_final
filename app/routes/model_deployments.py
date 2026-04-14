from flask import Blueprint, request
from app.extensions import db
from app.models import ModelDeployment
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

model_deployments_bp = Blueprint("model_deployments", __name__)


class DeploymentSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    model      = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    stations   = fields.List(fields.Str(), load_default=[])
    status     = fields.Str(load_default="stopped",
                            validate=validate.OneOf(["running", "stopped"]))
    fps        = fields.Int(load_default=0)
    latency    = fields.Str(load_default="0ms")
    uptime     = fields.Str(load_default="0%")
    detections = fields.Str(load_default="0")

_schema = DeploymentSchema()


def _stations_to_str(stations_list):
    return ",".join(stations_list) if stations_list else ""


@model_deployments_bp.get("/")
def list_deployments():
    query = ModelDeployment.query
    status = request.args.get("status")
    if status:
        query = query.filter(ModelDeployment.status == status)
    query = query.order_by(ModelDeployment.created_at.desc())
    items, pagination = paginate(query)
    return success([d.to_dict() for d in items], pagination=pagination)


@model_deployments_bp.post("/")
def create_deployment():
    data = _schema.load(request.get_json() or {})
    stations = data.pop("stations", [])
    dep = ModelDeployment(stations=_stations_to_str(stations), **data)
    db.session.add(dep)
    db.session.commit()
    return success(dep.to_dict(), message="Deployment created", status_code=201)


@model_deployments_bp.get("/<int:dep_id>")
def get_deployment(dep_id):
    dep = db.get_or_404(ModelDeployment, dep_id)
    return success(dep.to_dict())


@model_deployments_bp.put("/<int:dep_id>")
def update_deployment(dep_id):
    dep = db.get_or_404(ModelDeployment, dep_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    if "stations" in data:
        dep.stations = _stations_to_str(data.pop("stations"))
    for k, v in data.items():
        setattr(dep, k, v)
    db.session.commit()
    return success(dep.to_dict(), message="Deployment updated")


@model_deployments_bp.delete("/<int:dep_id>")
def delete_deployment(dep_id):
    dep = db.get_or_404(ModelDeployment, dep_id)
    db.session.delete(dep)
    db.session.commit()
    return success(None, message="Deployment deleted", status_code=204)


@model_deployments_bp.put("/<int:dep_id>/status")
def set_status(dep_id):
    dep = db.get_or_404(ModelDeployment, dep_id)
    body = request.get_json() or {}
    new_status = body.get("status")
    if new_status not in ("running", "stopped"):
        return error('status must be "running" or "stopped"', 400)
    dep.status = new_status
    dep.fps = body.get("fps", 30 if new_status == "running" else 0)
    db.session.commit()
    return success(dep.to_dict())
