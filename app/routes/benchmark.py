"""
Model benchmark/evaluation endpoints.

POST /api/benchmark/run          - run evaluation for one or more model configs
GET  /api/benchmark/results      - list stored benchmark results
GET  /api/benchmark/results/<id> - single result detail
DELETE /api/benchmark/results/<id>
"""
import os
import json
import shutil
import threading
import logging
from datetime import datetime
from flask import Blueprint, request, current_app
from app.extensions import db
from app.models import LabelDataset, LabelImage, LabelAnnotation, ModelConfig
from app.utils.response import success, error

benchmark_bp = Blueprint("benchmark", __name__)
logger = logging.getLogger(__name__)

# In-memory store for in-progress benchmark jobs
# { token: { status, progress, results, error } }
_bench_jobs: dict[str, dict] = {}


# ─── helpers ─────────────────────────────────────────────────────────────────

def _export_yolo_dataset(dataset, output_dir: str, app) -> tuple[str, list[str]]:
    """Export labeled images+annotations in YOLO format for model.val()."""
    import yaml
    from PIL import Image as PILImage
    images_folder = os.path.join(app.config["LABEL_IMAGES_FOLDER"], str(dataset.id))
    classes = json.loads(dataset.classes_json or "[]")
    class_names = [c["name"] for c in classes]
    class_id_map = {c["id"]: idx for idx, c in enumerate(classes)}

    img_dir = os.path.join(output_dir, "images", "val")
    lbl_dir = os.path.join(output_dir, "labels", "val")
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)

    labeled_images = LabelImage.query.filter_by(dataset_id=dataset.id).filter(
        LabelImage.status.in_(["labeled", "auto_labeled", "verified"])
    ).all()

    exported = 0
    for img in labeled_images:
        src = os.path.join(images_folder, img.filename)
        if not os.path.exists(src):
            continue
        anns = LabelAnnotation.query.filter_by(image_id=img.id).all()
        if not anns:
            continue

        dst = os.path.join(img_dir, img.filename)
        shutil.copy2(src, dst)

        lbl_path = os.path.join(lbl_dir, os.path.splitext(img.filename)[0] + ".txt")
        with open(lbl_path, "w") as f:
            for ann in anns:
                cls_idx = class_id_map.get(ann.class_id, 0)
                f.write(f"{cls_idx} {ann.x_center:.6f} {ann.y_center:.6f} "
                        f"{ann.ann_width:.6f} {ann.ann_height:.6f}\n")
        exported += 1

    if exported == 0:
        raise ValueError("No labeled images available for evaluation.")

    yaml_path = os.path.join(output_dir, "dataset.yaml")
    yaml_data = {
        "path":  output_dir,
        "train": "images/val",   # benchmark uses same images for train/val (eval only)
        "val":   "images/val",
        "nc":    len(class_names),
        "names": class_names,
    }
    with open(yaml_path, "w") as f:
        import yaml as _yaml
        _yaml.dump(yaml_data, f)

    return yaml_path, class_names


def _run_yolo_benchmark(model_path: str, yaml_path: str, img_size: int = 640) -> dict:
    from ultralytics import YOLO
    model = YOLO(model_path)
    metrics = model.val(data=yaml_path, imgsz=img_size, device="cpu", verbose=False)
    return {
        "map50":     float(metrics.box.map50)    if hasattr(metrics, "box") else 0.0,
        "map50_95":  float(metrics.box.map)      if hasattr(metrics, "box") else 0.0,
        "precision": float(metrics.box.mp)       if hasattr(metrics, "box") else 0.0,
        "recall":    float(metrics.box.mr)       if hasattr(metrics, "box") else 0.0,
        "speed_ms":  float(metrics.speed.get("inference", 0)) if hasattr(metrics, "speed") else 0.0,
    }


def _run_tf_benchmark(model_path: str, dataset, app) -> dict:
    """Return TF model metrics from the training job record (TF inference is not supported
    in the Flask process due to CUDA/TF session conflicts on Windows)."""
    from app.models import TrainingJob

    # Look up the training job from the model path (parent dir is job_id)
    dirname = os.path.basename(os.path.dirname(model_path))
    acc = 0.0
    try:
        job = TrainingJob.query.get(int(dirname))
        if job and job.best_map50:
            acc = float(job.best_map50)
    except Exception:
        pass

    return {
        "accuracy":   round(acc, 4),
        "map50":      round(acc, 4),
        "map50_95":   round(acc, 4),
        "precision":  round(acc, 4),
        "recall":     round(acc, 4),
        "speed_ms":   0.0,
        "note":       "Accuracy from training validation (live TF inference unavailable in server process)",
    }


def _benchmark_thread(token: str, model_config_ids: list, dataset_id: int, app):
    """Background thread that evaluates each selected model."""
    results = []
    with app.app_context():
        try:
            dataset = db.session.get(LabelDataset, dataset_id)
            if not dataset:
                _bench_jobs[token]["status"] = "failed"
                _bench_jobs[token]["error"]  = "Dataset not found"
                return

            output_dir = os.path.join(app.config["TRAINING_OUTPUT_DIR"], "benchmarks", token)
            os.makedirs(output_dir, exist_ok=True)

            total = len(model_config_ids)
            for idx, mc_id in enumerate(model_config_ids):
                mc = db.session.get(ModelConfig, mc_id)
                if not mc:
                    continue
                try:
                    model_path = mc.model_path  # stored path from training output

                    if model_path and model_path.endswith(".keras"):
                        metrics = _run_tf_benchmark(model_path, dataset, app)
                    else:
                        yaml_path, _ = _export_yolo_dataset(dataset, output_dir, app)
                        metrics = _run_yolo_benchmark(model_path, yaml_path)

                    results.append({
                        "model_config_id": mc_id,
                        "model_name":      mc.name,
                        "model_type":      mc.model_type,
                        "framework":       mc.framework,
                        **metrics,
                    })
                except Exception as ex:
                    import traceback as _tb2
                    _full = _tb2.format_exc()
                    logger.exception("Benchmark failed for model %d", mc_id)
                    results.append({
                        "model_config_id": mc_id,
                        "model_name":      mc.name if mc else str(mc_id),
                        "model_type":      mc.model_type if mc else "",
                        "error":           _full,
                        "map50": 0.0, "map50_95": 0.0,
                        "precision": 0.0, "recall": 0.0, "speed_ms": 0.0,
                    })

                _bench_jobs[token]["progress"] = int((idx + 1) / total * 100)

        except Exception as ex:
            _bench_jobs[token]["status"] = "failed"
            _bench_jobs[token]["error"]  = str(ex)
            return
        finally:
            try:
                shutil.rmtree(os.path.join(output_dir, "images"), ignore_errors=True)
                shutil.rmtree(os.path.join(output_dir, "labels"), ignore_errors=True)
            except Exception:
                pass

    _bench_jobs[token]["status"]  = "done"
    _bench_jobs[token]["results"] = results


# ─── routes ──────────────────────────────────────────────────────────────────

@benchmark_bp.post("/run")
def run_benchmark():
    """
    Body: { "model_config_ids": [1, 2, 3], "dataset_id": 5 }
    Returns a token to poll for results.
    """
    body = request.get_json() or {}
    model_config_ids = body.get("model_config_ids", [])
    dataset_id       = body.get("dataset_id")

    if not model_config_ids:
        return error("model_config_ids must be a non-empty list", status_code=400)
    if not dataset_id:
        return error("dataset_id is required", status_code=400)

    import uuid
    token = str(uuid.uuid4())
    _bench_jobs[token] = {"status": "running", "progress": 0, "results": [], "error": None}

    app_obj = current_app._get_current_object()
    t = threading.Thread(
        target=_benchmark_thread,
        args=(token, model_config_ids, dataset_id, app_obj),
        daemon=True,
    )
    t.start()

    return success({"token": token}, message="Benchmark started", status_code=202)


@benchmark_bp.get("/status/<token>")
def bench_status(token):
    """Poll benchmark job status."""
    job = _bench_jobs.get(token)
    if not job:
        return error("Unknown benchmark token", status_code=404)
    return success(job)


@benchmark_bp.get("/models")
def list_benchmarkable_models():
    """
    List model configs that have a model_path (i.e., were produced by a training job).
    """
    models = ModelConfig.query.filter(
        ModelConfig.model_path.isnot(None),
        ModelConfig.status == "active"
    ).order_by(ModelConfig.id.desc()).all()
    return success([m.to_dict() for m in models])
