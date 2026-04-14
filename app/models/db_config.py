from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class DbConfig(db.Model):
    __tablename__ = "db_configs"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name       = db.Column(db.String(120), nullable=False)
    host       = db.Column(db.String(255), nullable=False, default="")
    port       = db.Column(db.Integer, nullable=False, default=5432)
    db_type    = db.Column(db.String(60), nullable=False, default="postgresql")
    username   = db.Column(db.String(120), nullable=False, default="")
    db_name    = db.Column(db.String(120), nullable=False, default="")
    status     = db.Column(
                   db.Enum("connected", "disconnected", "error", name="db_status"),
                   nullable=False, default="disconnected"
                 )
    db_usage   = db.Column(db.String(20), nullable=False, default="0%")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "host":       self.host,
            "port":       self.port,
            "type":       self.db_type,
            "username":   self.username,
            "database":   self.db_name,
            "status":     self.status,
            "usage":      self.db_usage,
            "created_at": to_ist(self.created_at),
        }
