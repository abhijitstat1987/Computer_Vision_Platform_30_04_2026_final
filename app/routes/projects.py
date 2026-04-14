from flask import Blueprint, request
from app.extensions import db
from app.models import Project
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

projects_bp = Blueprint("projects", __name__)


class ProjectSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name        = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    description = fields.Str(load_default="")
    status      = fields.Str(load_default="planning",
                             validate=validate.OneOf(["active", "inactive", "planning"]))
    biz_company = fields.Str(load_default="")
    biz_unit    = fields.Str(load_default="")
    biz_product = fields.Str(load_default="")
    geo_country = fields.Str(load_default="")
    geo_state   = fields.Str(load_default="")
    geo_city    = fields.Str(load_default="")
    geo_site    = fields.Str(load_default="")

_schema = ProjectSchema()


@projects_bp.get("/")
def list_projects():
    query = Project.query
    status = request.args.get("status")
    search = request.args.get("search")
    if status:
        query = query.filter(Project.status == status)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    query = query.order_by(Project.created_at.desc())
    items, pagination = paginate(query)
    return success([p.to_dict() for p in items], pagination=pagination)


@projects_bp.post("/")
def create_project():
    data = _schema.load(request.get_json() or {})
    project = Project(**data)
    db.session.add(project)
    db.session.commit()
    return success(project.to_dict(), message="Project created", status_code=201)


@projects_bp.get("/<int:project_id>")
def get_project(project_id):
    project = db.get_or_404(Project, project_id)
    return success(project.to_dict())


@projects_bp.put("/<int:project_id>")
def update_project(project_id):
    project = db.get_or_404(Project, project_id)
    data = _schema.load(request.get_json() or {}, partial=True)
    for k, v in data.items():
        setattr(project, k, v)
    db.session.commit()
    return success(project.to_dict(), message="Project updated")


@projects_bp.delete("/<int:project_id>")
def delete_project(project_id):
    project = db.get_or_404(Project, project_id)
    db.session.delete(project)
    db.session.commit()
    return success(None, message="Project deleted", status_code=204)
