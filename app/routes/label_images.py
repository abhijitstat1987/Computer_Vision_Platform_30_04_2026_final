"""
Image upload and management within a label dataset.
Served at:  /api/label-datasets/<ds_id>/images
Static:     /uploads/images/<ds_id>/<filename>
"""
import os
import uuid
from flask import Blueprint, request, current_app, send_from_directory
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import LabelDataset, LabelImage
from app.utils.response import success, error
from app.utils.pagination import paginate

label_images_bp  = Blueprint("label_images",  __name__)
label_img_static = Blueprint("label_img_static", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _images_dir(ds_id: int) -> str:
    folder = os.path.join(current_app.config["LABEL_IMAGES_FOLDER"], str(ds_id))
    os.makedirs(folder, exist_ok=True)
    return folder


# ── Static file serving ───────────────────────────────────────────────────────

@label_img_static.get("/images/<int:ds_id>/<path:filename>")
def serve_image(ds_id, filename):
    folder = os.path.join(current_app.config["LABEL_IMAGES_FOLDER"], str(ds_id))
    return send_from_directory(folder, filename)


# ── CRUD ─────────────────────────────────────────────────────────────────────

@label_images_bp.get("/<int:ds_id>/images/")
def list_images(ds_id):
    db.get_or_404(LabelDataset, ds_id)
    query = LabelImage.query.filter_by(dataset_id=ds_id).order_by(LabelImage.created_at.asc())
    items, pagination = paginate(query)
    return success([img.to_dict() for img in items], pagination=pagination)


@label_images_bp.post("/<int:ds_id>/images/")
def upload_images(ds_id):
    """Accept multipart/form-data with one or more files under key 'files'."""
    ds = db.get_or_404(LabelDataset, ds_id)
    files = request.files.getlist("files")
    if not files:
        return error("No files provided", status_code=400)

    created = []
    folder = _images_dir(ds_id)

    for f in files:
        if not f or not f.filename:
            continue
        if not _allowed(f.filename):
            continue

        ext          = f.filename.rsplit(".", 1)[1].lower()
        stored_name  = f"{uuid.uuid4().hex}.{ext}"
        save_path    = os.path.join(folder, stored_name)
        f.save(save_path)

        # Read dimensions via Pillow
        width, height = 0, 0
        try:
            from PIL import Image as PILImage
            with PILImage.open(save_path) as pil:
                width, height = pil.size
        except Exception:
            pass

        img = LabelImage(
            dataset_id    = ds_id,
            filename      = stored_name,
            original_name = secure_filename(f.filename),
            width         = width,
            height        = height,
            status        = "unlabeled",
        )
        db.session.add(img)
        ds.total_images = (ds.total_images or 0) + 1
        created.append(img)

    db.session.commit()
    return success([img.to_dict() for img in created],
                   message=f"{len(created)} image(s) uploaded", status_code=201)


@label_images_bp.get("/<int:ds_id>/images/<int:img_id>")
def get_image(ds_id, img_id):
    img = LabelImage.query.filter_by(id=img_id, dataset_id=ds_id).first_or_404()
    return success(img.to_dict())


@label_images_bp.delete("/<int:ds_id>/images/<int:img_id>")
def delete_image(ds_id, img_id):
    ds  = db.get_or_404(LabelDataset, ds_id)
    img = LabelImage.query.filter_by(id=img_id, dataset_id=ds_id).first_or_404()

    # Remove file from disk
    file_path = os.path.join(_images_dir(ds_id), img.filename)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass

    db.session.delete(img)
    ds.total_images = max(0, (ds.total_images or 1) - 1)
    db.session.commit()
    return success(None, message="Image deleted", status_code=204)
