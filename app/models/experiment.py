from datetime import datetime
from app.extensions import db


class Experiment(db.Model):
    __tablename__ = "experiments"

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name           = db.Column(db.String(120), nullable=False)
    dataset        = db.Column(db.String(120), nullable=False, default="")
    status         = db.Column(
                       db.Enum("training", "completed", "pending", "paused",
                               name="exp_status"),
                       nullable=False, default="pending",
                     )
    epoch_current  = db.Column(db.Integer, nullable=False, default=0)
    epoch_total    = db.Column(db.Integer, nullable=False, default=100)
    accuracy       = db.Column(db.String(20), nullable=False, default="-")
    loss           = db.Column(db.String(20), nullable=False, default="-")
    created_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                               onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":       self.id,
            "name":     self.name,
            "dataset":  self.dataset,
            "status":   self.status,
            "epoch":    f"{self.epoch_current}/{self.epoch_total}",
            "accuracy": self.accuracy,
            "loss":     self.loss,
        }
