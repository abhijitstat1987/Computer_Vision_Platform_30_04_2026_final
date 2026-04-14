"""
TensorFlow / Keras image classification training service.
Supports: ResNet50, EfficientNetB0, MobileNetV2 transfer learning.

Training runs in a **separate Python venv** (C:\\tf_env) via subprocess
to avoid TensorFlow ↔ PyTorch / venv conflicts.

Images are cropped using bounding box annotations to create per-class training sets.
Output: SavedModel at training_runs/jobs/<job_id>/saved_model.keras
"""
import os
import json
import shutil
import subprocess
import threading
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Path to the TensorFlow-specific Python interpreter
TF_PYTHON = r"C:\tf_env\Scripts\python.exe"
# Path to the standalone worker script
TF_WORKER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "tf_worker.py")

_cancel_flags: dict[int, threading.Event] = {}
_subprocesses: dict[int, subprocess.Popen] = {}


def _export_classification_dataset(dataset, job_output_dir: str, app) -> tuple[str, list[str]]:
    """
    Crop annotated regions from images and organize into per-class folders:
    <output_dir>/
      train/
        <class_name>/
          <image_id>_<ann_id>.jpg
    Returns (train_dir, class_names)
    """
    import json
    from PIL import Image as PILImage
    from app.models import LabelImage, LabelAnnotation

    try:
        classes = json.loads(dataset.classes_json or "[]")
    except Exception:
        classes = []
    class_id_map  = {c["id"]: c["name"] for c in classes}
    class_names   = [c["name"] for c in classes]

    images_folder = os.path.join(app.config["LABEL_IMAGES_FOLDER"], str(dataset.id))
    train_dir     = os.path.join(job_output_dir, "train_data")

    labeled_images = LabelImage.query.filter_by(dataset_id=dataset.id).filter(
        LabelImage.status.in_(["labeled", "auto_labeled", "verified"])
    ).all()

    if not labeled_images:
        raise ValueError("Dataset has no labeled images.")

    exported = 0
    for img in labeled_images:
        src = os.path.join(images_folder, img.filename)
        if not os.path.exists(src):
            continue
        try:
            pil_img = PILImage.open(src).convert("RGB")
        except Exception:
            continue

        iw, ih = pil_img.size or (img.width, img.height)

        anns = LabelAnnotation.query.filter_by(image_id=img.id).all()
        for ann in anns:
            cls_name = class_id_map.get(ann.class_id, ann.class_name or "unknown")
            # De-normalize bounding box
            x_c  = ann.x_center  * iw
            y_c  = ann.y_center  * ih
            bw   = ann.ann_width  * iw
            bh   = ann.ann_height * ih
            x1   = max(0, int(x_c - bw / 2))
            y1   = max(0, int(y_c - bh / 2))
            x2   = min(iw, int(x_c + bw / 2))
            y2   = min(ih, int(y_c + bh / 2))

            if x2 <= x1 or y2 <= y1 or (x2-x1) < 10 or (y2-y1) < 10:
                continue

            crop    = pil_img.crop((x1, y1, x2, y2)).resize((224, 224))
            cls_dir = os.path.join(train_dir, cls_name)
            os.makedirs(cls_dir, exist_ok=True)
            save_path = os.path.join(cls_dir, f"{img.id}_{ann.id}.jpg")
            crop.save(save_path, "JPEG", quality=90)
            exported += 1

    if exported == 0:
        # If no crops, use full images organised by majority class
        for img in labeled_images:
            src = os.path.join(images_folder, img.filename)
            if not os.path.exists(src):
                continue
            anns = LabelAnnotation.query.filter_by(image_id=img.id).all()
            if not anns:
                continue
            cls_name = class_id_map.get(anns[0].class_id, "unknown")
            cls_dir  = os.path.join(train_dir, cls_name)
            os.makedirs(cls_dir, exist_ok=True)
            shutil.copy2(src, os.path.join(cls_dir, img.filename))
            exported += 1

    if exported == 0:
        raise ValueError("Could not export any training samples from this dataset.")

    return train_dir, class_names


def _training_thread(app, job_id: int):
    """Export dataset inside the Flask app context, then spawn tf_worker.py
    in the TF venv as a subprocess."""
    from app.extensions import db
    from app.models import TrainingJob, LabelDataset, ModelConfig

    cancel_event = _cancel_flags.get(job_id, threading.Event())

    with app.app_context():
        job = db.session.get(TrainingJob, job_id)
        if not job:
            return

        job.status     = "running"
        job.started_at = datetime.utcnow()
        db.session.commit()

        try:
            dataset = db.session.get(LabelDataset, job.dataset_id)
            if not dataset:
                raise ValueError("Dataset not found")

            output_dir = os.path.join(
                app.config["TRAINING_OUTPUT_DIR"], "jobs", str(job_id))
            os.makedirs(output_dir, exist_ok=True)
            log_path = os.path.join(output_dir, "train.log")
            job.log_file   = log_path
            job.output_dir = output_dir
            db.session.commit()

            with open(log_path, "a", encoding="utf-8") as lf:
                lf.write("[TF Trainer] Exporting classification dataset...\n")

            # Export dataset (uses PIL + SQLAlchemy — runs in main venv)
            train_dir, class_names = _export_classification_dataset(
                dataset, output_dir, app)

            with open(log_path, "a", encoding="utf-8") as lf:
                lf.write(f"[TF Trainer] Exported {len(class_names)} classes to {train_dir}\n")
                lf.write(f"[TF Trainer] Spawning TF worker subprocess...\n")

            # Build config JSON for the worker
            cfg = {
                "train_dir":  train_dir,
                "output_dir": output_dir,
                "log_path":   log_path,
                "model_type": job.model_type,
                "epochs":     job.epochs,
                "batch_size": job.batch_size,
                "device":     getattr(job, "device", "cpu") or "cpu",
                "db_uri":     app.config["SQLALCHEMY_DATABASE_URI"],
                "job_id":     job_id,
            }
            cfg_path = os.path.join(output_dir, "worker_config.json")
            with open(cfg_path, "w") as f:
                json.dump(cfg, f)

            # Spawn worker in the TF venv
            env = os.environ.copy()
            env.pop("PYTHONPATH", None)  # avoid conda leak
            env["TF_ENABLE_ONEDNN_OPTS"] = "0"
            env["TF_CPP_MIN_LOG_LEVEL"] = "2"

            proc = subprocess.Popen(
                [TF_PYTHON, TF_WORKER, cfg_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=os.path.dirname(TF_WORKER),
            )
            _subprocesses[job_id] = proc

            # Stream output to log file and wait for completion
            with open(log_path, "a", encoding="utf-8") as lf:
                for line in proc.stdout:
                    text = line.decode("utf-8", errors="replace")
                    lf.write(text)
                    lf.flush()
                    if cancel_event.is_set():
                        proc.terminate()
                        break

            proc.wait(timeout=10)
            _subprocesses.pop(job_id, None)

            if cancel_event.is_set():
                job.status       = "cancelled"
                job.completed_at = datetime.utcnow()
                db.session.commit()
                return

            # Read result from worker
            result_path = os.path.join(output_dir, "result.json")
            if os.path.exists(result_path):
                with open(result_path) as f:
                    result = json.load(f)
            else:
                result = {"status": "failed", "error": "Worker produced no result"}

            if result["status"] == "completed":
                saved_model_path = result.get("saved_model_path", "")
                result_classes   = result.get("class_names", class_names)

                # Auto-register model config
                try:
                    size_mb = os.path.getsize(saved_model_path) // (1024 * 1024) \
                        if os.path.exists(saved_model_path) else 0
                    mc = ModelConfig(
                        name        = f"{dataset.name} ({job.model_type}) - Job#{job_id}",
                        version     = "1.0.0",
                        size        = f"{size_mb} MB",
                        model_type  = job.model_type,
                        accuracy    = f"{job.best_map50*100:.1f}%" if job.best_map50 else "N/A",
                        framework   = "TensorFlow",
                        description = f"TF model on '{dataset.name}'. Classes: {', '.join(result_classes)}",
                        model_path  = saved_model_path,
                        status      = "active",
                    )
                    db.session.add(mc)
                except Exception:
                    pass

                job.status       = "completed"
                job.progress     = 100
                job.output_dir   = saved_model_path
                job.completed_at = datetime.utcnow()
                db.session.commit()
            else:
                job.status        = "failed"
                job.error_message = result.get("error", "TF worker failed")
                job.completed_at  = datetime.utcnow()
                db.session.commit()

        except (KeyboardInterrupt, SystemExit):
            job.status       = "cancelled"
            job.completed_at = datetime.utcnow()
            db.session.commit()
        except Exception as ex:
            logger.exception("TF training job %d failed", job_id)
            job.status        = "failed"
            job.error_message = str(ex)
            job.completed_at  = datetime.utcnow()
            db.session.commit()
        finally:
            db.session.remove()
            _cancel_flags.pop(job_id, None)
            _subprocesses.pop(job_id, None)


def start_tf_training_job(app, job_id: int):
    cancel_event = threading.Event()
    _cancel_flags[job_id] = cancel_event
    t = threading.Thread(target=_training_thread, args=(app, job_id), daemon=True)
    t.start()


def cancel_tf_job(job_id: int):
    event = _cancel_flags.get(job_id)
    if event:
        event.set()
    proc = _subprocesses.get(job_id)
    if proc:
        proc.terminate()
