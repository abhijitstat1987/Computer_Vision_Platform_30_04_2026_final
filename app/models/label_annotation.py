from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LabelAnnotation(db.Model):
    __tablename__ = "label_annotations"

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    image_id       = db.Column(db.Integer, db.ForeignKey("label_images.id", ondelete="CASCADE"), nullable=False)
    class_id       = db.Column(db.String(80),  nullable=False)
    class_name     = db.Column(db.String(120), nullable=False)
    # YOLO normalized coords  (0.0 – 1.0)
    x_center       = db.Column(db.Float, nullable=False)
    y_center       = db.Column(db.Float, nullable=False)
    ann_width      = db.Column(db.Float, nullable=False)
    ann_height     = db.Column(db.Float, nullable=False)
    confidence     = db.Column(db.Float, nullable=True)      # None = manual; float = auto
    is_auto_labeled = db.Column(db.Boolean, nullable=False, default=False)
    created_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":           self.id,
            "imageId":      self.image_id,
            "classId":      self.class_id,
            "className":    self.class_name,
            "xCenter":      self.x_center,
            "yCenter":      self.y_center,
            "width":        self.ann_width,
            "height":       self.ann_height,
            "confidence":   self.confidence,
            "isAutoLabeled": self.is_auto_labeled,
            "created_at":   to_ist(self.created_at),
        }

    def to_canvas_dict(self, img_width: int, img_height: int):
        """De-normalize YOLO coords back to pixel bounding box for the canvas."""
        w = self.ann_width  * img_width
        h = self.ann_height * img_height
        x1 = (self.x_center * img_width)  - w / 2
        y1 = (self.y_center * img_height) - h / 2
        return {
            "id":           str(self.id),
            "type":         "box",
            "classId":      self.class_id,
            "className":    self.class_name,
            "confidence":   self.confidence,
            "isAutoLabeled": self.is_auto_labeled,
            "coordinates":  {"x": x1, "y": y1, "width": w, "height": h},
        }
