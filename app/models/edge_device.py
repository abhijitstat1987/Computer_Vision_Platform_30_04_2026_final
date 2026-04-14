from datetime import datetime
from app.extensions import db


class EdgeDevice(db.Model):
    __tablename__ = "edge_devices"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name       = db.Column(db.String(120), nullable=False)
    location   = db.Column(db.String(255), nullable=True)
    status     = db.Column(
                   db.Enum("online", "offline", name="edge_status"),
                   nullable=False, default="offline",
                 )
    cpu        = db.Column(db.String(10), nullable=False, default="0%")
    memory     = db.Column(db.String(10), nullable=False, default="0%")
    storage    = db.Column(db.String(10), nullable=False, default="0%")
    models     = db.Column(db.Integer, nullable=False, default=0)
    ip_address = db.Column(db.String(45), nullable=True)
    platform   = db.Column(db.String(120), nullable=True)
    gpu_model  = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":        self.id,
            "name":      self.name,
            "location":  self.location,
            "status":    self.status,
            "cpu":       self.cpu,
            "memory":    self.memory,
            "storage":   self.storage,
            "models":    self.models,
            "ipAddress": self.ip_address,
            "platform":  self.platform,
            "gpuModel":  self.gpu_model,
        }
