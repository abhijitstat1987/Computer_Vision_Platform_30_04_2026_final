import json
import os
import zipfile
import tempfile
from flask import Blueprint, request, current_app, send_file
from app.extensions import db
from app.models import LabelDataset
from app.utils.response import success, error
from app.utils.pagination import paginate
from marshmallow import Schema, fields, EXCLUDE

label_datasets_bp = Blueprint("label_datasets", __name__)


class LabelDatasetSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name         = fields.Str(required=True)
    total_images = fields.Int(load_default=0)
    labeled      = fields.Int(load_default=0)
    auto_labeled = fields.Int(load_default=0)
    verified     = fields.Int(load_default=0)
    classes_json = fields.Str(load_default="[]")

_schema = LabelDatasetSchema()


@label_datasets_bp.get("/")
def list_datasets():
    query = LabelDataset.query.order_by(LabelDataset.created_at.desc())
    items, pagination = paginate(query)
    return success([d.to_dict() for d in items], pagination=pagination)


@label_datasets_bp.post("/")
def create_dataset():
    body = request.get_json() or {}
    if "classes" in body and isinstance(body["classes"], list):
        body["classes_json"] = json.dumps(body["classes"])
        del body["classes"]
    data = _schema.load(body)
    ds = LabelDataset(**data)
    db.session.add(ds)
    db.session.commit()
    return success(ds.to_dict(), message="Dataset created", status_code=201)


@label_datasets_bp.get("/<int:ds_id>")
def get_dataset(ds_id):
    ds = db.get_or_404(LabelDataset, ds_id)
    return success(ds.to_dict())


@label_datasets_bp.put("/<int:ds_id>")
def update_dataset(ds_id):
    ds = db.get_or_404(LabelDataset, ds_id)
    body = request.get_json() or {}
    if "classes" in body and isinstance(body["classes"], list):
        body["classes_json"] = json.dumps(body["classes"])
        del body["classes"]
    data = _schema.load(body, partial=True)
    for k, v in data.items():
        setattr(ds, k, v)
    db.session.commit()
    return success(ds.to_dict(), message="Dataset updated")


@label_datasets_bp.delete("/<int:ds_id>")
def delete_dataset(ds_id):
    ds = db.get_or_404(LabelDataset, ds_id)
    db.session.delete(ds)
    db.session.commit()
    return success(None, message="Dataset deleted", status_code=204)


# ── Export ────────────────────────────────────────────────────────────────────

@label_datasets_bp.get("/<int:ds_id>/export")
def export_dataset(ds_id):
    """Export dataset in YOLO format as a zip file."""
    import yaml
    from app.models import LabelImage, LabelAnnotation
    import shutil

    ds = db.get_or_404(LabelDataset, ds_id)
    try:
        classes = json.loads(ds.classes_json or "[]")
    except Exception:
        classes = []

    class_names  = [c["name"] for c in classes]
    class_id_map = {c["id"]: i for i, c in enumerate(classes)}

    images_folder = os.path.join(current_app.config["LABEL_IMAGES_FOLDER"], str(ds_id))

    labeled_images = LabelImage.query.filter_by(dataset_id=ds_id).filter(
        LabelImage.status.in_(["labeled", "auto_labeled", "verified"])
    ).all()

    # Build export in a temp dir then zip
    with tempfile.TemporaryDirectory() as tmp_dir:
        img_dir = os.path.join(tmp_dir, "images", "train")
        lbl_dir = os.path.join(tmp_dir, "labels", "train")
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        for img in labeled_images:
            src = os.path.join(images_folder, img.filename)
            if not os.path.exists(src):
                continue
            shutil.copy2(src, os.path.join(img_dir, img.filename))

            anns = LabelAnnotation.query.filter_by(image_id=img.id).all()
            lbl_path = os.path.join(lbl_dir, os.path.splitext(img.filename)[0] + ".txt")
            with open(lbl_path, "w") as lf:
                for ann in anns:
                    cls_idx = class_id_map.get(ann.class_id, 0)
                    lf.write(f"{cls_idx} {ann.x_center:.6f} {ann.y_center:.6f} "
                             f"{ann.ann_width:.6f} {ann.ann_height:.6f}\n")

        # dataset.yaml
        yaml_content = {
            "path":  ".",
            "train": "images/train",
            "val":   "images/train",
            "nc":    len(class_names),
            "names": class_names if class_names else ["object"],
        }
        with open(os.path.join(tmp_dir, "dataset.yaml"), "w") as yf:
            yaml.dump(yaml_content, yf, default_flow_style=False)

        # Zip it all
        zip_path = os.path.join(tempfile.gettempdir(),
                                f"dataset_{ds_id}_{ds.name.replace(' ','_')}.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(tmp_dir):
                for fname in files:
                    full = os.path.join(root, fname)
                    arcname = os.path.relpath(full, tmp_dir)
                    zf.write(full, arcname)

    return send_file(zip_path, as_attachment=True,
                     download_name=f"{ds.name}_yolo.zip",
                     mimetype="application/zip")


# ── Auto-label ────────────────────────────────────────────────────────────────

@label_datasets_bp.post("/<int:ds_id>/auto-label")
def start_auto_label(ds_id):
    ds   = db.get_or_404(LabelDataset, ds_id)
    body = request.get_json() or {}

    model_path  = body.get("model_path", "yolov8n.pt")
    confidence  = float(body.get("confidence_threshold", 0.25))
    image_ids   = body.get("image_ids")  # None = all images

    from app.services.auto_labeler import start_auto_label as _start
    token = _start(
        app          = current_app._get_current_object(),
        dataset_id   = ds_id,
        model_path   = model_path,
        confidence   = confidence,
        image_ids    = image_ids,
    )
    return success({"jobToken": token, "datasetId": ds_id},
                   message="Auto-labeling started", status_code=202)


@label_datasets_bp.get("/<int:ds_id>/auto-label/status")
def auto_label_status(ds_id):
    token = request.args.get("job_token")
    if not token:
        return error("job_token query param required", status_code=400)
    from app.services.auto_labeler import get_job_status
    status = get_job_status(token)
    if status is None:
        return error("Job not found", status_code=404)
    return success(status)
