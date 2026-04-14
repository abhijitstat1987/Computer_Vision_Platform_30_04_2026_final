from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class DetectionEvent(db.Model):
    __tablename__ = "detection_events"

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id     = db.Column(
                      db.Integer,
                      db.ForeignKey("cameras.id", ondelete="CASCADE"),
                      nullable=False,
                      index=True,
                    )
    detected_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    event_type    = db.Column(db.String(80), nullable=False, default="object_detection")
    snapshot_path = db.Column(db.String(512), nullable=True)
    created_at    = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    objects = db.relationship(
        "DetectedObject",
        backref="event",
        lazy="select",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    alerts = db.relationship(
        "Alert",
        backref="event",
        lazy="dynamic",
        foreign_keys="Alert.event_id",
    )

    def to_dict(self, include_objects: bool = False):
        data = {
            "id":            self.id,
            "camera_id":     self.camera_id,
            "detected_at":   to_ist(self.detected_at),
            "event_type":    self.event_type,
            "snapshot_path": self.snapshot_path,
            "created_at":    to_ist(self.created_at),
        }
        if include_objects:
            data["objects"] = [o.to_dict() for o in self.objects]
        return data
