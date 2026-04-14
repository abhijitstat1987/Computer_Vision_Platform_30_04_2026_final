from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class Project(db.Model):
    __tablename__ = "projects"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    biz_company = db.Column(db.String(120), nullable=True)
    biz_unit    = db.Column(db.String(120), nullable=True)
    biz_product = db.Column(db.String(120), nullable=True)
    geo_country = db.Column(db.String(120), nullable=True)
    geo_state   = db.Column(db.String(120), nullable=True)
    geo_city    = db.Column(db.String(120), nullable=True)
    geo_site    = db.Column(db.String(120), nullable=True)
    status      = db.Column(
                    db.Enum("active", "inactive", "planning", name="project_status"),
                    nullable=False, default="planning",
                  )
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    use_cases = db.relationship("UseCase", backref="project",
                                lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "description": self.description,
            "businessHierarchy": {
                "Company":            self.biz_company or "",
                "Manufacturing Unit": self.biz_unit or "",
                "Product Line":       self.biz_product or "",
            },
            "geographyHierarchy": {
                "Country":       self.geo_country or "",
                "State/Province": self.geo_state or "",
                "City":          self.geo_city or "",
                "Location/Site": self.geo_site or "",
            },
            "status":      self.status,
            "createdDate": self.created_at.strftime("%Y-%m-%d"),
            "createdAt":   to_ist(self.created_at),
            "updatedAt":   to_ist(self.updated_at),
            "useCases":    self.use_cases.count(),
        }
