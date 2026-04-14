from flask import Blueprint, request
from app.extensions import db
from app.models import LogConfig
from app.utils.response import success
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

log_configs_bp = Blueprint("log_configs", __name__)


class LogConfigSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    category  = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    retention = fields.Str(load_default="30 days")
    max_size  = fields.Str(load_default="500 MB")
    rotation  = fields.Str(load_default="Daily")
    log_level = fields.Str(load_default="info",
                           validate=validate.OneOf(["info", "debug", "warning", "error"]))

_schema = LogConfigSchema()


@log_configs_bp.get("/")
def list_log_configs():
    query = LogConfig.query.order_by(LogConfig.created_at.desc())
    items, pagination = paginate(query)
    return success([l.to_dict() for l in items], pagination=pagination)


@log_configs_bp.post("/")
def create_log_config():
    data = _schema.load(request.get_json() or {})
    cfg = LogConfig(**data)
    db.session.add(cfg)
    db.session.commit()
    return success(cfg.to_dict(), message="Log config created", status_code=201)


@log_configs_bp.get("/<int:cfg_id>")
def get_log_config(cfg_id):
    cfg = db.get_or_404(LogConfig, cfg_id)
    return success(cfg.to_dict())


@log_configs_bp.put("/<int:cfg_id>")
def update_log_config(cfg_id):
    cfg = db.get_or_404(LogConfig, cfg_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(cfg, k, v)
    db.session.commit()
    return success(cfg.to_dict(), message="Log config updated")


@log_configs_bp.delete("/<int:cfg_id>")
def delete_log_config(cfg_id):
    cfg = db.get_or_404(LogConfig, cfg_id)
    db.session.delete(cfg)
    db.session.commit()
    return success(None, message="Log config deleted", status_code=204)
