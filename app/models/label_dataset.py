from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LabelDataset(db.Model):
    __tablename__ = "label_datasets"

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name         = db.Column(db.String(200), nullable=False)
    total_images = db.Column(db.Integer, nullable=False, default=0)
    labeled      = db.Column(db.Integer, nullable=False, default=0)
    auto_labeled = db.Column(db.Integer, nullable=False, default=0)
    verified     = db.Column(db.Integer, nullable=False, default=0)
    classes_json = db.Column(db.Text, nullable=False, default="[]")
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        try:
            classes = json.loads(self.classes_json) if self.classes_json else []
        except Exception:
            classes = []
        return {
            "id":          self.id,
            "name":        self.name,
            "totalImages": self.total_images,
            "labeled":     self.labeled,
            "autoLabeled": self.auto_labeled,
            "verified":    self.verified,
            "classes":     classes,
            "createdDate": self.created_at.strftime("%Y-%m-%d"),
            "createdAt":   to_ist(self.created_at),
            "created_at":  to_ist(self.created_at),
            "updatedAt":   to_ist(self.updated_at),
        }
