from flask import Blueprint, request
from app.extensions import db
from app.models import ModelConfig
from app.utils.response import success
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

model_configs_bp = Blueprint("model_configs", __name__)


class ModelConfigSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name        = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    version     = fields.Str(load_default="1.0.0")
    size        = fields.Str(load_default="")
    model_type  = fields.Str(load_default="")
    accuracy    = fields.Str(load_default="")
    framework   = fields.Str(load_default="")
    description = fields.Str(load_default="")
    status      = fields.Str(load_default="testing",
                             validate=validate.OneOf(["active", "deprecated", "testing"]))

_schema = ModelConfigSchema()


@model_configs_bp.get("/")
def list_model_configs():
    query = ModelConfig.query.order_by(ModelConfig.created_at.desc())
    items, pagination = paginate(query)
    return success([m.to_dict() for m in items], pagination=pagination)


@model_configs_bp.post("/")
def create_model_config():
    data = _schema.load(request.get_json() or {})
    m = ModelConfig(**data)
    db.session.add(m)
    db.session.commit()
    return success(m.to_dict(), message="Model created", status_code=201)


@model_configs_bp.get("/<int:model_id>")
def get_model_config(model_id):
    m = db.get_or_404(ModelConfig, model_id)
    return success(m.to_dict())


@model_configs_bp.put("/<int:model_id>")
def update_model_config(model_id):
    m = db.get_or_404(ModelConfig, model_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(m, k, v)
    db.session.commit()
    return success(m.to_dict(), message="Model updated")


@model_configs_bp.delete("/<int:model_id>")
def delete_model_config(model_id):
    m = db.get_or_404(ModelConfig, model_id)
    db.session.delete(m)
    db.session.commit()
    return success(None, message="Model deleted", status_code=204)
