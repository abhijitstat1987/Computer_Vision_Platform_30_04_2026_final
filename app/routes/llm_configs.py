from flask import Blueprint, request
from app.extensions import db
from app.models import LlmConfig
from app.utils.response import success
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

llm_configs_bp = Blueprint("llm_configs", __name__)


class LlmConfigSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name        = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    provider    = fields.Str(load_default="")
    size        = fields.Str(load_default="")
    llm_type    = fields.Str(load_default="")
    context_len = fields.Str(load_default="")
    endpoint    = fields.Str(load_default="")
    description = fields.Str(load_default="")
    status      = fields.Str(load_default="available",
                             validate=validate.OneOf(["deployed", "configured", "available"]))

_schema = LlmConfigSchema()


@llm_configs_bp.get("/")
def list_llm_configs():
    query = LlmConfig.query.order_by(LlmConfig.created_at.desc())
    items, pagination = paginate(query)
    return success([l.to_dict() for l in items], pagination=pagination)


@llm_configs_bp.post("/")
def create_llm_config():
    data = _schema.load(request.get_json() or {})
    cfg = LlmConfig(**data)
    db.session.add(cfg)
    db.session.commit()
    return success(cfg.to_dict(), message="LLM config created", status_code=201)


@llm_configs_bp.get("/<int:cfg_id>")
def get_llm_config(cfg_id):
    cfg = db.get_or_404(LlmConfig, cfg_id)
    return success(cfg.to_dict())


@llm_configs_bp.put("/<int:cfg_id>")
def update_llm_config(cfg_id):
    cfg = db.get_or_404(LlmConfig, cfg_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(cfg, k, v)
    db.session.commit()
    return success(cfg.to_dict(), message="LLM config updated")


@llm_configs_bp.delete("/<int:cfg_id>")
def delete_llm_config(cfg_id):
    cfg = db.get_or_404(LlmConfig, cfg_id)
    db.session.delete(cfg)
    db.session.commit()
    return success(None, message="LLM config deleted", status_code=204)
