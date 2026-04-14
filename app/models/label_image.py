from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LabelImage(db.Model):
    __tablename__ = "label_images"

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    dataset_id    = db.Column(db.Integer, db.ForeignKey("label_datasets.id", ondelete="CASCADE"), nullable=False)
    filename      = db.Column(db.String(255), nullable=False)        # UUID-based stored name
    original_name = db.Column(db.String(255), nullable=False)        # original upload name
    status        = db.Column(
                        db.Enum("unlabeled", "labeled", "auto_labeled", "verified",
                                name="label_image_status_enum"),
                        nullable=False, default="unlabeled"
                    )
    width         = db.Column(db.Integer, nullable=False, default=0)
    height        = db.Column(db.Integer, nullable=False, default=0)
    created_at    = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    annotations   = db.relationship("LabelAnnotation", backref="image",
                                    cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, dataset_id=None):
        ds_id = dataset_id or self.dataset_id
        return {
            "id":           self.id,
            "datasetId":    self.dataset_id,
            "filename":     self.filename,
            "originalName": self.original_name,
            "url":          f"/uploads/images/{ds_id}/{self.filename}",
            "status":       self.status,
            "width":        self.width,
            "height":       self.height,
            "created_at":   to_ist(self.created_at),
        }
