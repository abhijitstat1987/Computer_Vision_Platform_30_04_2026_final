from app.extensions import db


class DetectedObject(db.Model):
    __tablename__ = "detected_objects"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_id   = db.Column(
                   db.Integer,
                   db.ForeignKey("detection_events.id", ondelete="CASCADE"),
                   nullable=False,
                   index=True,
                 )
    label      = db.Column(db.String(120), nullable=False)
    confidence = db.Column(db.Numeric(5, 4), nullable=False)
    x1         = db.Column(db.SmallInteger, nullable=False)
    y1         = db.Column(db.SmallInteger, nullable=False)
    x2         = db.Column(db.SmallInteger, nullable=False)
    y2         = db.Column(db.SmallInteger, nullable=False)

    def to_dict(self):
        return {
            "id":         self.id,
            "event_id":   self.event_id,
            "label":      self.label,
            "confidence": float(self.confidence),
            "bbox": {
                "x1": self.x1,
                "y1": self.y1,
                "x2": self.x2,
                "y2": self.y2,
            },
        }
