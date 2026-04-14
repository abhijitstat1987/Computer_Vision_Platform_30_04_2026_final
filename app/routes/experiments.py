from flask import Blueprint, request
from app.extensions import db
from app.models import Experiment
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

experiments_bp = Blueprint("experiments", __name__)


class ExperimentSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name          = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    dataset       = fields.Str(load_default="")
    status        = fields.Str(load_default="pending",
                               validate=validate.OneOf(
                                   ["training", "completed", "pending", "paused"]))
    epoch_current = fields.Int(load_default=0)
    epoch_total   = fields.Int(load_default=100)
    accuracy      = fields.Str(load_default="-")
    loss          = fields.Str(load_default="-")

_schema = ExperimentSchema()


@experiments_bp.get("/")
def list_experiments():
    query = Experiment.query
    status = request.args.get("status")
    if status:
        query = query.filter(Experiment.status == status)
    query = query.order_by(Experiment.created_at.desc())
    items, pagination = paginate(query)
    return success([e.to_dict() for e in items], pagination=pagination)


@experiments_bp.post("/")
def create_experiment():
    data = _schema.load(request.get_json() or {})
    exp = Experiment(**data)
    db.session.add(exp)
    db.session.commit()
    return success(exp.to_dict(), message="Experiment created", status_code=201)


@experiments_bp.get("/<int:exp_id>")
def get_experiment(exp_id):
    exp = db.get_or_404(Experiment, exp_id)
    return success(exp.to_dict())


@experiments_bp.put("/<int:exp_id>")
def update_experiment(exp_id):
    exp = db.get_or_404(Experiment, exp_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(exp, k, v)
    db.session.commit()
    return success(exp.to_dict(), message="Experiment updated")


@experiments_bp.delete("/<int:exp_id>")
def delete_experiment(exp_id):
    exp = db.get_or_404(Experiment, exp_id)
    db.session.delete(exp)
    db.session.commit()
    return success(None, message="Experiment deleted", status_code=204)


@experiments_bp.put("/<int:exp_id>/status")
def set_status(exp_id):
    exp = db.get_or_404(Experiment, exp_id)
    body = request.get_json() or {}
    new_status = body.get("status")
    if new_status not in ("training", "completed", "pending", "paused"):
        return error("Invalid status", 400)
    exp.status = new_status
    if "epoch_current" in body:
        exp.epoch_current = body["epoch_current"]
    if "accuracy" in body:
        exp.accuracy = body["accuracy"]
    if "loss" in body:
        exp.loss = body["loss"]
    db.session.commit()
    return success(exp.to_dict())
