"""
Auto-labeling service: runs YOLO inference on dataset images and saves results as annotations.
Runs in a background daemon thread. Progress tracked in-memory (dict).
"""
import os
import uuid
import threading
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Maps job_token -> {progress, processed, total, status, error}
_jobs: dict[str, dict] = {}


def get_job_status(token: str) -> dict | None:
    return _jobs.get(token)


def _auto_label_thread(app, token: str, dataset_id: int, model_path: str,
                        confidence: float, image_ids: list[int] | None):
    from app.extensions import db
    from app.models import LabelImage, LabelAnnotation, LabelDataset
    import json

    with app.app_context():
        try:
            from ultralytics import YOLO
            model = YOLO(model_path)

            images_folder = os.path.join(
                app.config["LABEL_IMAGES_FOLDER"], str(dataset_id)
            )

            # Determine target images
            query = LabelImage.query.filter_by(dataset_id=dataset_id)
            if image_ids:
                query = query.filter(LabelImage.id.in_(image_ids))
            images = query.all()

            _jobs[token]["total"] = len(images)

            # Build class name→id map from dataset
            dataset = db.session.get(LabelDataset, dataset_id)
            try:
                ds_classes = json.loads(dataset.classes_json or "[]")
            except Exception:
                ds_classes = []
            # name -> {id, color}
            name_map = {c["name"].lower(): c for c in ds_classes}

            for i, img in enumerate(images):
                if _jobs[token].get("cancelled"):
                    break

                img_path = os.path.join(images_folder, img.filename)
                if not os.path.exists(img_path):
                    _jobs[token]["processed"] = i + 1
                    _jobs[token]["progress"]  = int((i + 1) / len(images) * 100)
                    continue

                try:
                    results = model.predict(img_path, conf=confidence, verbose=False)
                    # Delete existing auto-labels for this image
                    LabelAnnotation.query.filter_by(
                        image_id=img.id, is_auto_labeled=True
                    ).delete()

                    new_anns = []
                    for r in results:
                        if r.boxes is None:
                            continue
                        for box in r.boxes:
                            cls_idx   = int(box.cls[0])
                            cls_name  = model.names.get(cls_idx, f"class_{cls_idx}")
                            conf_val  = float(box.conf[0])
                            xywhn     = box.xywhn[0].tolist()  # normalized [x_c, y_c, w, h]

                            # Try to match to dataset class by name
                            matched = name_map.get(cls_name.lower())
                            class_id   = matched["id"]   if matched else f"auto_{cls_idx}"
                            class_name = matched["name"] if matched else cls_name

                            new_anns.append(LabelAnnotation(
                                image_id       = img.id,
                                class_id       = class_id,
                                class_name     = class_name,
                                x_center       = xywhn[0],
                                y_center       = xywhn[1],
                                ann_width      = xywhn[2],
                                ann_height     = xywhn[3],
                                confidence     = conf_val,
                                is_auto_labeled = True,
                            ))

                    db.session.bulk_save_objects(new_anns)
                    img.status = "auto_labeled"
                    db.session.commit()

                except Exception as ex:
                    logger.warning("Auto-label failed for image %d: %s", img.id, ex)
                    db.session.rollback()

                _jobs[token]["processed"] = i + 1
                _jobs[token]["progress"]  = int((i + 1) / len(images) * 100)

            # Update dataset counters
            try:
                auto_count = LabelImage.query.filter_by(
                    dataset_id=dataset_id, status="auto_labeled"
                ).count()
                dataset.auto_labeled = auto_count
                db.session.commit()
            except Exception:
                db.session.rollback()

            _jobs[token]["status"] = "completed"

        except Exception as ex:
            logger.exception("Auto-labeling job %s failed", token)
            _jobs[token]["status"] = "failed"
            _jobs[token]["error"]  = str(ex)
        finally:
            db.session.remove()


def start_auto_label(app, dataset_id: int, model_path: str,
                     confidence: float = 0.25,
                     image_ids: list[int] | None = None) -> str:
    token = str(uuid.uuid4())
    _jobs[token] = {
        "status":    "running",
        "progress":  0,
        "processed": 0,
        "total":     0,
        "cancelled": False,
        "error":     None,
    }
    t = threading.Thread(
        target=_auto_label_thread,
        args=(app, token, dataset_id, model_path, confidence, image_ids),
        daemon=True,
    )
    t.start()
    return token


def cancel_auto_label(token: str):
    if token in _jobs:
        _jobs[token]["cancelled"] = True
