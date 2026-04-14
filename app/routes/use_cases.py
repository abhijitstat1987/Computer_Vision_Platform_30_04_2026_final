from flask import Blueprint, request
from app.extensions import db
from app.models import UseCase, Project
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

use_cases_bp = Blueprint("use_cases", __name__)


class UseCaseSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name        = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    description = fields.Str(load_default="")
    type        = fields.Str(load_default="custom",
                             validate=validate.OneOf(
                                 ["safety", "quality", "maintenance", "productivity", "custom"]))
    priority    = fields.Str(load_default="medium",
                             validate=validate.OneOf(["high", "medium", "low"]))
    status      = fields.Str(load_default="development",
                             validate=validate.OneOf(["active", "inactive", "development"]))
    workflows   = fields.Int(load_default=0)

_schema = UseCaseSchema()


@use_cases_bp.get("/projects/<int:project_id>/use-cases")
def list_use_cases(project_id):
    db.get_or_404(Project, project_id)
    query = UseCase.query.filter_by(project_id=project_id)
    status = request.args.get("status")
    if status:
        query = query.filter(UseCase.status == status)
    query = query.order_by(UseCase.created_at.desc())
    items, pagination = paginate(query)
    return success([u.to_dict() for u in items], pagination=pagination)


@use_cases_bp.post("/projects/<int:project_id>/use-cases")
def create_use_case(project_id):
    db.get_or_404(Project, project_id)
    data = _schema.load(request.get_json() or {})
    use_case = UseCase(project_id=project_id, **data)
    db.session.add(use_case)
    db.session.commit()
    return success(use_case.to_dict(), message="Use case created", status_code=201)


@use_cases_bp.get("/projects/<int:project_id>/use-cases/<int:uc_id>")
def get_use_case(project_id, uc_id):
    uc = UseCase.query.filter_by(id=uc_id, project_id=project_id).first_or_404()
    return success(uc.to_dict())


@use_cases_bp.put("/projects/<int:project_id>/use-cases/<int:uc_id>")
def update_use_case(project_id, uc_id):
    uc = UseCase.query.filter_by(id=uc_id, project_id=project_id).first_or_404()
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(uc, k, v)
    db.session.commit()
    return success(uc.to_dict(), message="Use case updated")


@use_cases_bp.delete("/projects/<int:project_id>/use-cases/<int:uc_id>")
def delete_use_case(project_id, uc_id):
    uc = UseCase.query.filter_by(id=uc_id, project_id=project_id).first_or_404()
    db.session.delete(uc)
    db.session.commit()
    return success(None, message="Use case deleted", status_code=204)
