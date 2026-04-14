from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LogConfig(db.Model):
    __tablename__ = "log_configs"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category    = db.Column(db.String(120), nullable=False)
    retention   = db.Column(db.String(40), nullable=False, default="30 days")
    max_size    = db.Column(db.String(40), nullable=False, default="500 MB")
    rotation    = db.Column(db.String(40), nullable=False, default="Daily")
    log_level   = db.Column(
                    db.Enum("info", "debug", "warning", "error", name="log_level_enum"),
                    nullable=False, default="info"
                  )
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":        self.id,
            "category":  self.category,
            "retention": self.retention,
            "maxSize":   self.max_size,
            "rotation":  self.rotation,
            "level":     self.log_level,
            "created_at": to_ist(self.created_at),
        }
