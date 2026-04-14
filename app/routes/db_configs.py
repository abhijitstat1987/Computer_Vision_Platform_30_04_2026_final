from flask import Blueprint, request
from app.extensions import db
from app.models import DbConfig
from app.utils.response import success
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

db_configs_bp = Blueprint("db_configs", __name__)


class DbConfigSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name     = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    host     = fields.Str(load_default="")
    port     = fields.Int(load_default=5432)
    db_type  = fields.Str(load_default="postgresql")
    username = fields.Str(load_default="")
    db_name  = fields.Str(load_default="")
    status   = fields.Str(load_default="disconnected",
                          validate=validate.OneOf(["connected", "disconnected", "error"]))
    db_usage = fields.Str(load_default="0%")

_schema = DbConfigSchema()


@db_configs_bp.get("/")
def list_db_configs():
    query = DbConfig.query.order_by(DbConfig.created_at.desc())
    items, pagination = paginate(query)
    return success([d.to_dict() for d in items], pagination=pagination)


@db_configs_bp.post("/")
def create_db_config():
    data = _schema.load(request.get_json() or {})
    cfg = DbConfig(**data)
    db.session.add(cfg)
    db.session.commit()
    return success(cfg.to_dict(), message="Database config created", status_code=201)


@db_configs_bp.get("/<int:cfg_id>")
def get_db_config(cfg_id):
    cfg = db.get_or_404(DbConfig, cfg_id)
    return success(cfg.to_dict())


@db_configs_bp.put("/<int:cfg_id>")
def update_db_config(cfg_id):
    cfg = db.get_or_404(DbConfig, cfg_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(cfg, k, v)
    db.session.commit()
    return success(cfg.to_dict(), message="Database config updated")


@db_configs_bp.delete("/<int:cfg_id>")
def delete_db_config(cfg_id):
    cfg = db.get_or_404(DbConfig, cfg_id)
    db.session.delete(cfg)
    db.session.commit()
    return success(None, message="Database config deleted", status_code=204)
