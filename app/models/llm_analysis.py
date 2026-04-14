from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LlmAnalysis(db.Model):
    __tablename__ = "llm_analyses"

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    image_id       = db.Column(db.Integer, db.ForeignKey("label_images.id", ondelete="SET NULL"), nullable=True)
    dataset_id     = db.Column(db.Integer, db.ForeignKey("label_datasets.id", ondelete="SET NULL"), nullable=True)
    model_provider = db.Column(db.String(60), nullable=False)
    model_name     = db.Column(db.String(120), nullable=False)
    prompt         = db.Column(db.Text, nullable=False)
    result_text    = db.Column(db.Text, nullable=True)
    image_filename = db.Column(db.String(255), nullable=True)  # for ad-hoc (no image_id)
    created_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":            self.id,
            "imageId":       self.image_id,
            "datasetId":     self.dataset_id,
            "modelProvider": self.model_provider,
            "modelName":     self.model_name,
            "prompt":        self.prompt,
            "resultText":    self.result_text,
            "imageFilename": self.image_filename,
            "createdAt":     to_ist(self.created_at),
        }
