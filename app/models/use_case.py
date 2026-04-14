from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class UseCase(db.Model):
    __tablename__ = "use_cases"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id  = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    name        = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type        = db.Column(
                    db.Enum("safety", "quality", "maintenance", "productivity", "custom",
                            name="use_case_type"),
                    nullable=False, default="custom",
                  )
    priority    = db.Column(
                    db.Enum("high", "medium", "low", name="use_case_priority"),
                    nullable=False, default="medium",
                  )
    status      = db.Column(
                    db.Enum("active", "inactive", "development", name="use_case_status"),
                    nullable=False, default="development",
                  )
    workflows   = db.Column(db.Integer, nullable=False, default=0)
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":          self.id,
            "projectId":   self.project_id,
            "name":        self.name,
            "description": self.description,
            "type":        self.type,
            "priority":    self.priority,
            "status":      self.status,
            "workflows":   self.workflows,
            "createdDate": self.created_at.strftime("%Y-%m-%d"),
            "createdAt":   to_ist(self.created_at),
            "updatedAt":   to_ist(self.updated_at),
        }
