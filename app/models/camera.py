from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class Camera(db.Model):
    __tablename__ = "cameras"

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name           = db.Column(db.String(120), nullable=False)
    rtsp_url       = db.Column(db.String(512), nullable=False, default="")
    ip_address     = db.Column(db.String(45),  nullable=False, default="")
    location       = db.Column(db.String(255), nullable=True)
    camera_type    = db.Column(db.String(60),  nullable=False, default="generic")
    status         = db.Column(
                       db.Enum("active", "inactive", "error", name="camera_status"),
                       nullable=False, default="inactive",
                     )
    fps            = db.Column(db.Integer, nullable=False, default=30)
    resolution     = db.Column(db.String(20), nullable=False, default="1920x1080")
    hardware_model = db.Column(db.String(120), nullable=True)
    created_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                               onupdate=datetime.utcnow)

    # Relationships
    events = db.relationship("DetectionEvent", backref="camera", lazy="dynamic",
                             cascade="all, delete-orphan", passive_deletes=True)
    alerts = db.relationship("Alert", backref="camera", lazy="dynamic",
                             cascade="all, delete-orphan", passive_deletes=True)

    def to_dict(self):
        return {
            "id":           self.id,
            "name":         self.name,
            "rtspUrl":      self.rtsp_url,
            "ip":           self.ip_address,
            "location":     self.location,
            "camera_type":  self.camera_type,
            "status":       self.status,
            "fps":          self.fps,
            "resolution":   self.resolution,
            "model":        self.hardware_model,
            "created_at":   to_ist(self.created_at),
            "updated_at":   to_ist(self.updated_at),
        }
