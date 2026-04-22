from datetime import datetime, timezone
from app.extensions import db
from app.utils.response import to_ist


class ModelConfig(db.Model):
    __tablename__ = "model_configs"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(120), nullable=False)
    version     = db.Column(db.String(40), nullable=False, default="1.0.0")
    size        = db.Column(db.String(40), nullable=False, default="")
    model_type  = db.Column(db.String(60), nullable=False, default="")
    accuracy    = db.Column(db.String(20), nullable=False, default="")
    framework   = db.Column(db.String(60), nullable=False, default="")
    description = db.Column(db.Text, nullable=True)
    model_path  = db.Column(db.String(512), nullable=True)   # path to saved model weights
    status      = db.Column(
                    db.Enum("active", "deprecated", "testing", name="model_cfg_status"),
                    nullable=False, default="testing"
                  )
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    @staticmethod
    def _days_ago(dt: datetime) -> str:
        if not dt:
            return ""
        delta = datetime.utcnow() - dt
        days  = delta.days
        if days == 0:
            return "Today"
        if days == 1:
            return "1 day ago"
        return f"{days} days ago"

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "version":     self.version,
            "size":        self.size,
            "type":        self.model_type,
            "accuracy":    self.accuracy,
            "framework":   self.framework,
            "description": self.description or "",
            "model_path":  self.model_path or "",
            "status":      self.status,
            "updated":     self._days_ago(self.updated_at),
            "created_at":  to_ist(self.created_at),
        }
