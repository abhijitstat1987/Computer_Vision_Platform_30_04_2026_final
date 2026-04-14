from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LlmConfig(db.Model):
    __tablename__ = "llm_configs"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(120), nullable=False)
    provider    = db.Column(db.String(120), nullable=False, default="")
    size        = db.Column(db.String(40), nullable=False, default="")
    llm_type    = db.Column(db.String(60), nullable=False, default="")
    context_len = db.Column(db.String(20), nullable=False, default="")
    endpoint    = db.Column(db.String(255), nullable=False, default="")
    description = db.Column(db.Text, nullable=True)
    status      = db.Column(
                    db.Enum("deployed", "configured", "available", name="llm_status"),
                    nullable=False, default="available"
                  )
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "provider":    self.provider,
            "size":        self.size,
            "type":        self.llm_type,
            "context":     self.context_len,
            "endpoint":    self.endpoint,
            "description": self.description or "",
            "status":      self.status,
            "created_at":  to_ist(self.created_at),
        }
