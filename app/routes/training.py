"""
Training job management.
POST /api/training/jobs          - start a new training job
GET  /api/training/jobs          - list all jobs
GET  /api/training/jobs/<id>     - job detail + progress
GET  /api/training/jobs/<id>/logs - stream log file
DELETE /api/training/jobs/<id>   - cancel a running job
"""
import os
from flask import Blueprint, request, current_app, Response, stream_with_context
from app.extensions import db
from app.models import TrainingJob, LabelDataset
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, validate, EXCLUDE

training_bp = Blueprint("training", __name__)


_YOLO_TYPES = ["yolov8n","yolov8s","yolov8m","yolov8l","yolov8x"]
_TF_TYPES   = ["tf_resnet50","tf_efficientnetb0","tf_mobilenetv2"]
_ALL_TYPES  = _YOLO_TYPES + _TF_TYPES


class TrainingJobSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    dataset_id    = fields.Int(required=True)
    model_type    = fields.Str(load_default="yolov8n",
                               validate=validate.OneOf(_ALL_TYPES))
    epochs        = fields.Int(load_default=50)
    batch_size    = fields.Int(load_default=16)
    img_size      = fields.Int(load_default=640)
    device        = fields.Str(load_default="cpu")   # "cpu" | "0" | "cuda"
    experiment_id = fields.Int(load_default=None, allow_none=True)


_schema = TrainingJobSchema()


@training_bp.get("/gpu-info")
def gpu_info():
    """Return available compute devices."""
    info = {"cuda_available": False, "gpu_count": 0, "gpus": [], "recommended": "cpu"}
    try:
        import torch
        info["cuda_available"] = torch.cuda.is_available()
        info["gpu_count"]      = torch.cuda.device_count()
        info["gpus"]           = [
            {"index": i, "name": torch.cuda.get_device_name(i)}
            for i in range(torch.cuda.device_count())
        ]
        if info["cuda_available"]:
            info["recommended"] = "0"
    except ImportError:
        pass
    try:
        import tensorflow as tf
        tf_gpus = tf.config.list_physical_devices("GPU")
        if tf_gpus and not info["cuda_available"]:
            info["cuda_available"] = True
            info["gpu_count"]      = len(tf_gpus)
            info["gpus"]           = [{"index": i, "name": g.name} for i, g in enumerate(tf_gpus)]
            info["recommended"]    = "0"
    except ImportError:
        pass
    return success(info)


@training_bp.get("/jobs")
def list_jobs():
    status_filter = request.args.get("status")
    query = TrainingJob.query.order_by(TrainingJob.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)
    items, pagination = paginate(query)
    return success([j.to_dict() for j in items], pagination=pagination)


@training_bp.post("/jobs")
def create_job():
    data = _schema.load(request.get_json() or {})

    # Validate dataset exists
    ds = db.session.get(LabelDataset, data["dataset_id"])
    if not ds:
        return error("Dataset not found", status_code=404)

    job = TrainingJob(
        dataset_id    = data["dataset_id"],
        model_type    = data["model_type"],
        epochs        = data["epochs"],
        batch_size    = data["batch_size"],
        img_size      = data["img_size"],
        device        = data.get("device", "cpu"),
        experiment_id = data.get("experiment_id"),
        status        = "queued",
    )
    db.session.add(job)
    db.session.commit()

    # Launch background thread — route to correct trainer by model type
    app_obj = current_app._get_current_object()
    if data["model_type"].startswith("tf_"):
        from app.services.tf_trainer import start_tf_training_job
        start_tf_training_job(app_obj, job.id)
    else:
        from app.services.yolo_trainer import start_training_job
        start_training_job(app_obj, job.id)

    return success(job.to_dict(), message="Training job started", status_code=201)


@training_bp.get("/jobs/<int:job_id>")
def get_job(job_id):
    job = db.get_or_404(TrainingJob, job_id)
    return success(job.to_dict())


@training_bp.get("/jobs/<int:job_id>/logs")
def stream_logs(job_id):
    """Return log file contents. If Accept: text/event-stream, stream live updates."""
    job = db.get_or_404(TrainingJob, job_id)

    if not job.log_file or not os.path.exists(job.log_file):
        return success({"lines": []})

    accept = request.headers.get("Accept", "")
    if "text/event-stream" in accept:
        # SSE streaming
        def generate():
            with open(job.log_file, "r") as f:
                while True:
                    line = f.readline()
                    if line:
                        yield f"data: {line.rstrip()}\n\n"
                    else:
                        # Check if still running
                        j = db.session.get(TrainingJob, job_id)
                        if j and j.status not in ("running", "queued"):
                            yield "data: [DONE]\n\n"
                            break
                        import time
                        time.sleep(1)
        return Response(stream_with_context(generate()),
                        mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    else:
        with open(job.log_file, "r") as f:
            lines = f.readlines()
        return success({"lines": [l.rstrip() for l in lines]})


@training_bp.delete("/jobs/<int:job_id>")
def delete_job(job_id):
    """Cancel if active, then delete the DB record and output files."""
    import shutil
    job = db.get_or_404(TrainingJob, job_id)

    # Cancel if still running
    if job.status in ("queued", "running"):
        if job.model_type.startswith("tf_"):
            from app.services.tf_trainer import cancel_tf_job
            cancel_tf_job(job_id)
        else:
            from app.services.yolo_trainer import cancel_training_job
            cancel_training_job(job_id)

    # Remove output directory from disk
    output_root = os.path.join(current_app.config["TRAINING_OUTPUT_DIR"], "jobs", str(job_id))
    if os.path.isdir(output_root):
        try:
            shutil.rmtree(output_root)
        except Exception as exc:
            logger.warning("Could not remove output dir %s: %s", output_root, exc)

    db.session.delete(job)
    db.session.commit()
    return success(None, message="Training job deleted")


@training_bp.get("/jobs/<int:job_id>/download")
def download_model(job_id):
    """Download the best.pt (or saved_model) produced by a completed job."""
    from flask import send_file
    job = db.get_or_404(TrainingJob, job_id)

    if job.status != "completed":
        return error("Job is not completed", status_code=400)

    model_path = job.output_dir  # set to best.pt path on completion
    if not model_path or not os.path.isfile(model_path):
        return error("Model file not found on disk", status_code=404)

    ext = os.path.splitext(model_path)[1] or ".pt"
    filename = f"model_job{job_id}_{job.model_type}{ext}"
    return send_file(model_path, as_attachment=True, download_name=filename)


@training_bp.post("/jobs/<int:job_id>/validate")
def validate_job(job_id):
    """
    Run validation of the trained model against a dataset.

    Request JSON:
      dataset_id  (int, required)  — dataset to validate against
      split       (str, optional)  — "val" | "train" (default "val")
      conf        (float)          — confidence threshold (default 0.25)
      iou         (float)          — IoU threshold (default 0.6)
    """
    job = db.get_or_404(TrainingJob, job_id)

    if job.status != "completed":
        return error("Job is not completed", status_code=400)

    model_path = job.output_dir
    if not model_path or not os.path.isfile(model_path):
        return error("Model file not found on disk", status_code=404)

    if job.model_type.startswith("tf_"):
        return error("Validation is only supported for YOLO models", status_code=400)

    body       = request.get_json(silent=True) or {}
    dataset_id = body.get("dataset_id")
    conf       = float(body.get("conf", 0.25))
    iou        = float(body.get("iou", 0.6))

    if not dataset_id:
        return error("dataset_id is required", status_code=400)

    from app.models import LabelDataset
    dataset = db.session.get(LabelDataset, int(dataset_id))
    if not dataset:
        return error("Dataset not found", status_code=404)

    # Build a temporary YOLO dataset layout for validation
    import tempfile, shutil
    from app.services.yolo_trainer import _build_dataset_yaml

    tmp_dir = tempfile.mkdtemp(prefix=f"val_job{job_id}_")
    try:
        yaml_path = _build_dataset_yaml(dataset, tmp_dir)

        from ultralytics import YOLO
        model = YOLO(model_path)
        results = model.val(
            data=yaml_path,
            conf=conf,
            iou=iou,
            verbose=False,
            save=False,
        )

        # Extract scalar metrics safely
        def _f(v):
            try:
                return round(float(v), 4)
            except Exception:
                return None

        box = results.box
        metrics = {
            "map50":    _f(box.map50),
            "map50_95": _f(box.map),
            "precision": _f(box.mp),
            "recall":    _f(box.mr),
            "dataset_id":  dataset_id,
            "dataset_name": dataset.name,
            "model_job_id": job_id,
            "conf_threshold": conf,
            "iou_threshold":  iou,
        }

        # Per-class breakdown
        try:
            import json as _json
            classes = _json.loads(dataset.classes_json or "[]")
            class_names = [c["name"] for c in classes]
            per_class = []
            for i, name in enumerate(class_names):
                try:
                    per_class.append({
                        "class": name,
                        "ap50":  _f(box.ap50[i]) if i < len(box.ap50) else None,
                    })
                except Exception:
                    pass
            metrics["per_class"] = per_class
        except Exception:
            pass

        return success(metrics, message="Validation complete")

    except Exception as exc:
        logger.exception("Validation failed for job %d", job_id)
        return error(str(exc), status_code=500)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
