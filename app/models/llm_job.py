from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class LlmJob(db.Model):
    __tablename__ = "llm_jobs"

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    base_model    = db.Column(db.String(255), nullable=False)
    technique     = db.Column(
                        db.Enum("lora", "qlora", "full", name="llm_job_technique_enum"),
                        nullable=False, default="lora"
                    )
    dataset_path  = db.Column(db.String(512), nullable=True)
    epochs        = db.Column(db.Integer, nullable=False, default=3)
    batch_size    = db.Column(db.Integer, nullable=False, default=4)
    lora_r        = db.Column(db.Integer, nullable=False, default=16)
    lora_alpha    = db.Column(db.Integer, nullable=False, default=32)
    lora_dropout  = db.Column(db.Float, nullable=False, default=0.05)
    learning_rate = db.Column(db.Float, nullable=False, default=2e-4)
    status        = db.Column(
                        db.Enum("queued", "running", "completed", "failed", "cancelled",
                                name="llm_job_status_enum"),
                        nullable=False, default="queued"
                    )
    progress      = db.Column(db.Integer, nullable=False, default=0)   # 0-100
    output_dir    = db.Column(db.String(512), nullable=True)
    log_file      = db.Column(db.String(512), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    train_loss    = db.Column(db.Float, nullable=True)
    created_at    = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    started_at    = db.Column(db.DateTime, nullable=True)
    completed_at  = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id":           self.id,
            "baseModel":    self.base_model,
            "technique":    self.technique,
            "datasetPath":  self.dataset_path,
            "epochs":       self.epochs,
            "batchSize":    self.batch_size,
            "loraR":        self.lora_r,
            "loraAlpha":    self.lora_alpha,
            "loraDropout":  self.lora_dropout,
            "learningRate": self.learning_rate,
            "status":       self.status,
            "progress":     self.progress,
            "outputDir":    self.output_dir,
            "logFile":      self.log_file,
            "errorMessage": self.error_message,
            "trainLoss":    self.train_loss,
            "createdAt":    to_ist(self.created_at),
            "startedAt":    to_ist(self.started_at) if self.started_at else None,
            "completedAt":  to_ist(self.completed_at) if self.completed_at else None,
        }
