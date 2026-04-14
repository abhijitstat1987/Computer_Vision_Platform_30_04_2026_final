from datetime import datetime
from app.extensions import db


class ModelDeployment(db.Model):
    __tablename__ = "model_deployments"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model      = db.Column(db.String(120), nullable=False)
    stations   = db.Column(db.Text, nullable=False, default="")  # comma-separated
    status     = db.Column(
                   db.Enum("running", "stopped", name="deployment_status"),
                   nullable=False, default="stopped",
                 )
    fps        = db.Column(db.Integer, nullable=False, default=0)
    latency    = db.Column(db.String(20), nullable=False, default="0ms")
    uptime     = db.Column(db.String(20), nullable=False, default="0%")
    detections = db.Column(db.String(20), nullable=False, default="0")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "model":      self.model,
            "stations":   [s.strip() for s in self.stations.split(",") if s.strip()],
            "status":     self.status,
            "fps":        self.fps,
            "latency":    self.latency,
            "uptime":     self.uptime,
            "detections": self.detections,
        }
