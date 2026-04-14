"""
Label review endpoints — verify, reject, and bulk-status updates.
Mounted at: /api/label-datasets  (same prefix as label_images_bp)
"""
from flask import Blueprint, request
from app.extensions import db
from app.models import LabelImage, LabelAnnotation, LabelDataset
from app.utils.response import success, error

label_review_bp = Blueprint("label_review", __name__)


@label_review_bp.put("/<int:ds_id>/images/<int:img_id>/status")
def update_image_status(ds_id, img_id):
    """
    Update a single image status.
    Body: { "status": "verified" | "unlabeled" | "labeled" | "auto_labeled" }
    """
    img = LabelImage.query.filter_by(id=img_id, dataset_id=ds_id).first_or_404()
    body = request.get_json() or {}
    new_status = body.get("status")

    valid = {"unlabeled", "labeled", "auto_labeled", "verified"}
    if new_status not in valid:
        return error(f"Invalid status. Must be one of: {', '.join(valid)}", status_code=400)

    old_status = img.status
    img.status  = new_status

    # Update dataset-level counters
    ds = db.session.get(LabelDataset, ds_id)
    if ds:
        if old_status == "verified"     and new_status != "verified":
            ds.verified    = max(0, (ds.verified or 0) - 1)
        if new_status == "verified"     and old_status != "verified":
            ds.verified    = (ds.verified or 0) + 1
        if old_status == "labeled"      and new_status == "unlabeled":
            ds.labeled     = max(0, (ds.labeled or 0) - 1)
        if old_status == "auto_labeled" and new_status == "unlabeled":
            ds.auto_labeled = max(0, (ds.auto_labeled or 0) - 1)

    db.session.commit()
    return success(img.to_dict(), message=f"Image status updated to '{new_status}'")


@label_review_bp.post("/<int:ds_id>/images/bulk-status")
def bulk_update_status(ds_id):
    """
    Bulk update status for multiple images.
    Body: { "image_ids": [1,2,3], "status": "verified" }
    """
    body      = request.get_json() or {}
    image_ids = body.get("image_ids", [])
    new_status = body.get("status")

    valid = {"unlabeled", "labeled", "auto_labeled", "verified"}
    if new_status not in valid:
        return error(f"Invalid status. Must be one of: {', '.join(valid)}", status_code=400)
    if not image_ids:
        return error("image_ids must be a non-empty list", status_code=400)

    images = LabelImage.query.filter(
        LabelImage.id.in_(image_ids),
        LabelImage.dataset_id == ds_id
    ).all()

    for img in images:
        img.status = new_status

    db.session.commit()

    # Recompute dataset counters from DB (simpler than delta tracking for bulk)
    ds = db.session.get(LabelDataset, ds_id)
    if ds:
        ds.verified     = LabelImage.query.filter_by(dataset_id=ds_id, status="verified").count()
        ds.labeled      = LabelImage.query.filter_by(dataset_id=ds_id, status="labeled").count()
        ds.auto_labeled = LabelImage.query.filter_by(dataset_id=ds_id, status="auto_labeled").count()
        db.session.commit()

    return success(
        {"updated": len(images)},
        message=f"{len(images)} image(s) updated to '{new_status}'"
    )


@label_review_bp.get("/<int:ds_id>/review-summary")
def review_summary(ds_id):
    """Return per-status counts for a dataset."""
    db.get_or_404(LabelDataset, ds_id)
    counts = {}
    for s in ("unlabeled", "labeled", "auto_labeled", "verified"):
        counts[s] = LabelImage.query.filter_by(dataset_id=ds_id, status=s).count()
    counts["total"] = sum(counts.values())
    return success(counts)
