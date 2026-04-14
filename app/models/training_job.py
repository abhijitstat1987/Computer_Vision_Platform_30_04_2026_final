from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class TrainingJob(db.Model):
    __tablename__ = "training_jobs"

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    experiment_id   = db.Column(db.Integer, nullable=True)
    dataset_id      = db.Column(db.Integer, db.ForeignKey("label_datasets.id", ondelete="RESTRICT"), nullable=False)
    model_type      = db.Column(db.String(40), nullable=False, default="yolov8n")
    epochs          = db.Column(db.Integer, nullable=False, default=50)
    batch_size      = db.Column(db.Integer, nullable=False, default=16)
    img_size        = db.Column(db.Integer, nullable=False, default=640)
    device          = db.Column(db.String(20), nullable=False, default="cpu")  # "cpu" | "0" | "cuda"
    status          = db.Column(
                        db.Enum("queued", "running", "completed", "failed", "cancelled",
                                name="training_job_status_enum"),
                        nullable=False, default="queued"
                    )
    progress        = db.Column(db.Integer, nullable=False, default=0)   # 0-100
    current_epoch   = db.Column(db.Integer, nullable=False, default=0)
    best_map50      = db.Column(db.Float, nullable=True)
    best_map50_95   = db.Column(db.Float, nullable=True)
    train_loss      = db.Column(db.Float, nullable=True)
    output_dir      = db.Column(db.String(512), nullable=True)           # path to best.pt dir
    log_file        = db.Column(db.String(512), nullable=True)
    error_message   = db.Column(db.Text, nullable=True)
    started_at      = db.Column(db.DateTime, nullable=True)
    completed_at    = db.Column(db.DateTime, nullable=True)
    created_at      = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":            self.id,
            "experimentId":  self.experiment_id,
            "datasetId":     self.dataset_id,
            "modelType":     self.model_type,
            "epochs":        self.epochs,
            "batchSize":     self.batch_size,
            "imgSize":       self.img_size,
            "device":        self.device,
            "status":        self.status,
            "progress":      self.progress,
            "currentEpoch":  self.current_epoch,
            "bestMap50":     self.best_map50,
            "bestMap5095":   self.best_map50_95,
            "trainLoss":     self.train_loss,
            "outputDir":     self.output_dir,
            "errorMessage":  self.error_message,
            "startedAt":     to_ist(self.started_at) if self.started_at else None,
            "completedAt":   to_ist(self.completed_at) if self.completed_at else None,
            "created_at":    to_ist(self.created_at),
        }
