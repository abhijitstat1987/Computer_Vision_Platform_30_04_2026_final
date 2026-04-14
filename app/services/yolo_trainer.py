"""
Background YOLO training service.
Runs training in a daemon thread, writes progress to the DB each epoch.
"""
import os
import sys
import json
import shutil
import threading
import logging
from datetime import datetime

# ── numpy MUST be imported before torch.distributed to avoid "Numpy is not available" ──
try:
    import numpy as _np  # noqa: F401 — side-effect: registers numpy before torch.distributed
except ImportError:
    pass

logger = logging.getLogger(__name__)

# Maps job_id -> threading.Event for cancellation
_cancel_flags: dict[int, threading.Event] = {}


def _build_dataset_yaml(dataset, output_dir: str) -> str:
    """Export a LabelDataset to YOLO folder structure with train/val/test split and write dataset.yaml."""
    import yaml
    import random
    from flask import current_app
    from app.models import LabelImage, LabelAnnotation

    # Build class list from dataset classes_json
    try:
        classes = json.loads(dataset.classes_json or "[]")
    except Exception:
        classes = []
    class_names = [c["name"] for c in classes]
    class_id_map = {c["id"]: i for i, c in enumerate(classes)}

    images_folder = os.path.join(current_app.config["LABEL_IMAGES_FOLDER"],
                                  str(dataset.id))

    labeled_images = LabelImage.query.filter_by(
        dataset_id=dataset.id
    ).filter(LabelImage.status.in_(["labeled", "auto_labeled", "verified"])).all()

    if not labeled_images:
        raise ValueError(f"Dataset '{dataset.name}' has no labeled images. Label at least 1 image before training.")

    # Only include images that actually exist on disk
    available = [img for img in labeled_images
                 if os.path.exists(os.path.join(images_folder, img.filename))]
    if not available:
        raise ValueError(f"Dataset '{dataset.name}': no image files found on disk.")

    # Deterministic shuffle using dataset id as seed so splits are reproducible
    rng = random.Random(dataset.id)
    shuffled = available[:]
    rng.shuffle(shuffled)

    n = len(shuffled)
    if n >= 10:
        n_val  = max(1, int(n * 0.20))
        n_test = max(1, int(n * 0.10))
    elif n >= 3:
        n_val  = 1
        n_test = 1
    else:
        # Too few images — use all for train, mirror into val (YOLO requires val)
        n_val  = 0
        n_test = 0

    n_train = n - n_val - n_test
    splits = {
        "train": shuffled[:n_train],
        "val":   shuffled[n_train:n_train + n_val] if n_val  else shuffled,
        "test":  shuffled[n_train + n_val:]         if n_test else [],
    }

    logger.info("Dataset '%s' split: %d train / %d val / %d test (total %d)",
                dataset.name, len(splits["train"]), len(splits["val"]),
                len(splits["test"]), n)

    def _copy_split(images_list, split_name):
        img_dir = os.path.join(output_dir, "images", split_name)
        lbl_dir = os.path.join(output_dir, "labels", split_name)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)
        for img in images_list:
            src = os.path.join(images_folder, img.filename)
            shutil.copy2(src, os.path.join(img_dir, img.filename))
            annotations = LabelAnnotation.query.filter_by(image_id=img.id).all()
            label_path = os.path.join(lbl_dir,
                                       os.path.splitext(img.filename)[0] + ".txt")
            with open(label_path, "w") as f:
                for ann in annotations:
                    cls_idx = class_id_map.get(ann.class_id, 0)
                    f.write(f"{cls_idx} {ann.x_center:.6f} {ann.y_center:.6f} "
                            f"{ann.ann_width:.6f} {ann.ann_height:.6f}\n")

    _copy_split(splits["train"], "train")
    _copy_split(splits["val"],   "val")
    if splits["test"]:
        _copy_split(splits["test"], "test")

    yaml_content = {
        "path":  output_dir,
        "train": "images/train",
        "val":   "images/val",
        "nc":    len(class_names),
        "names": class_names if class_names else ["object"],
    }
    if splits["test"]:
        yaml_content["test"] = "images/test"

    yaml_path = os.path.join(output_dir, "dataset.yaml")
    with open(yaml_path, "w") as f:
        yaml.dump(yaml_content, f, default_flow_style=False)

    return yaml_path


def _training_thread(app, job_id: int):
    """Runs inside a daemon thread. Uses app context for DB access."""
    # Import numpy first — must precede torch.distributed import to avoid "Numpy is not available"
    import numpy as _np_pre  # noqa: F401
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
            from ultralytics import YOLO
            import traceback as _tb

            dataset = db.session.get(LabelDataset, job.dataset_id)
            if not dataset:
                raise ValueError("Dataset not found")

            # Prepare output dir
            output_dir = os.path.join(
                app.config["TRAINING_OUTPUT_DIR"], "jobs", str(job_id)
            )
            os.makedirs(output_dir, exist_ok=True)

            # Export dataset to YOLO format
            yaml_path = _build_dataset_yaml(dataset, output_dir)

            # Log file
            log_path = os.path.join(output_dir, "train.log")
            job.log_file   = log_path
            job.output_dir = output_dir
            db.session.commit()

            # Load model
            model = YOLO(f"{job.model_type}.pt")

            # Epoch callback — updates DB progress
            def on_epoch_end(trainer):
                if cancel_event.is_set():
                    raise KeyboardInterrupt("Training cancelled by user")

                epoch      = trainer.epoch + 1
                total_eps  = trainer.epochs
                metrics    = trainer.metrics or {}
                map50      = metrics.get("metrics/mAP50(B)",    metrics.get("metrics/mAP50",    None))
                map50_95   = metrics.get("metrics/mAP50-95(B)", metrics.get("metrics/mAP50-95", None))
                box_loss   = metrics.get("train/box_loss", None)
                progress   = int(epoch / total_eps * 100)

                # Write epoch log line
                try:
                    with open(log_path, "a", encoding="utf-8") as lf:
                        m50  = f"{map50:.4f}"   if map50    is not None else "N/A"
                        m95  = f"{map50_95:.4f}" if map50_95 is not None else "N/A"
                        bloss= f"{box_loss:.4f}" if box_loss is not None else "N/A"
                        lf.write(
                            f"[Epoch {epoch}/{total_eps}] "
                            f"mAP50={m50} mAP50-95={m95} box_loss={bloss}\n"
                        )
                except Exception:
                    pass

                # Update job row
                try:
                    db.session.execute(
                        db.text(
                            "UPDATE training_jobs SET progress=:p, current_epoch=:e, "
                            "best_map50=:m50, best_map50_95=:m5095, train_loss=:loss "
                            "WHERE id=:id"
                        ),
                        {
                            "p":     progress,
                            "e":     epoch,
                            "m50":   float(map50)    if map50    is not None else None,
                            "m5095": float(map50_95) if map50_95 is not None else None,
                            "loss":  float(box_loss) if box_loss is not None else None,
                            "id":    job_id,
                        },
                    )
                    db.session.commit()
                except Exception as ex:
                    db.session.rollback()
                    logger.error("DB update error in training callback: %s", ex)

            model.add_callback("on_train_epoch_end", on_epoch_end)

            device = getattr(job, "device", "cpu") or "cpu"

            with open(log_path, "a", encoding="utf-8") as lf:
                lf.write(f"[YOLO] Using device: {device}\n")

            # Run training
            result = model.train(
                data=yaml_path,
                epochs=job.epochs,
                batch=job.batch_size,
                imgsz=job.img_size,
                device=device,
                project=output_dir,
                name="run",
                exist_ok=True,
                verbose=True,
            )

            # Find best.pt
            best_pt = os.path.join(output_dir, "run", "weights", "best.pt")

            # Auto-create a model_config entry
            try:
                mc = ModelConfig(
                    name        = f"{dataset.name} ({job.model_type}) - Job#{job_id}",
                    version     = "1.0.0",
                    size        = f"{os.path.getsize(best_pt) // (1024*1024)} MB" if os.path.exists(best_pt) else "N/A",
                    model_type  = job.model_type,
                    accuracy    = f"{job.best_map50*100:.1f}%" if job.best_map50 else "N/A",
                    framework   = "PyTorch",
                    description = f"Trained on dataset '{dataset.name}'. Best mAP50: {job.best_map50}",
                    model_path  = best_pt,
                    status      = "active",
                )
                db.session.add(mc)
            except Exception:
                pass

            job.status       = "completed"
            job.progress     = 100
            job.completed_at = datetime.utcnow()
            job.output_dir   = best_pt
            db.session.commit()

            with open(log_path, "a", encoding="utf-8") as lf:
                lf.write(f"\n[OK] Training completed. Best model: {best_pt}\n")

        except (KeyboardInterrupt, SystemExit):
            job.status       = "cancelled"
            job.completed_at = datetime.utcnow()
            db.session.commit()
        except Exception as ex:
            import traceback as _tb2
            full_tb = _tb2.format_exc()
            logger.exception("Training job %d failed: %s", job_id, full_tb)
            # Write full traceback to a debug file
            try:
                _dbg = os.path.join(app.config.get("TRAINING_OUTPUT_DIR", "."), f"job_{job_id}_error.txt")
                with open(_dbg, "w") as _f:
                    _f.write(full_tb)
            except Exception:
                pass
            job.status        = "failed"
            job.error_message = str(ex)
            job.completed_at  = datetime.utcnow()
            db.session.commit()
        finally:
            db.session.remove()
            _cancel_flags.pop(job_id, None)


def start_training_job(app, job_id: int):
    """Launch background training thread for job_id."""
    cancel_event = threading.Event()
    _cancel_flags[job_id] = cancel_event
    t = threading.Thread(target=_training_thread, args=(app, job_id), daemon=True)
    t.start()


def cancel_training_job(job_id: int):
    """Signal the training thread to stop after the current epoch."""
    event = _cancel_flags.get(job_id)
    if event:
        event.set()


def reset_stuck_jobs(app):
    """Call at app startup to reset any jobs stuck in 'running' state (server crash recovery)."""
    with app.app_context():
        from app.extensions import db
        from app.models import TrainingJob
        stuck = TrainingJob.query.filter_by(status="running").all()
        for job in stuck:
            job.status        = "failed"
            job.error_message = "Server restarted while job was running"
            job.completed_at  = datetime.utcnow()
        if stuck:
            db.session.commit()
            logger.warning("Reset %d stuck training jobs on startup", len(stuck))
