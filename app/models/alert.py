from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class Alert(db.Model):
    __tablename__ = "alerts"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id  = db.Column(
                   db.Integer,
                   db.ForeignKey("cameras.id", ondelete="CASCADE"),
                   nullable=False,
                   index=True,
                 )
    event_id   = db.Column(
                   db.Integer,
                   db.ForeignKey("detection_events.id", ondelete="SET NULL"),
                   nullable=True,
                 )
    alert_type = db.Column(db.String(80), nullable=False, default="detection")
    message    = db.Column(db.Text, nullable=False)
    status     = db.Column(
                   db.Enum("unresolved", "acknowledged", "resolved", name="alert_status"),
                   nullable=False,
                   default="unresolved",
                 )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "camera_id":  self.camera_id,
            "event_id":   self.event_id,
            "alert_type": self.alert_type,
            "message":    self.message,
            "status":     self.status,
            "created_at": to_ist(self.created_at),
        }
