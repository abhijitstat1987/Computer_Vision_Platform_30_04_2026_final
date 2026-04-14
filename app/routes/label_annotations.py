"""
Annotation CRUD for a specific image within a dataset.
Served at: /api/label-datasets/<ds_id>/images/<img_id>/annotations
"""
from flask import Blueprint, request
from app.extensions import db
from app.models import LabelImage, LabelAnnotation, LabelDataset
from app.utils.response import success, error
from marshmallow import Schema, fields, EXCLUDE

label_annotations_bp = Blueprint("label_annotations", __name__)


class AnnotationSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    classId       = fields.Str(required=True)
    className     = fields.Str(required=True)
    # Pixel-space bounding box from canvas (de-normalized in route)
    x             = fields.Float(required=True)
    y             = fields.Float(required=True)
    width         = fields.Float(required=True)
    height        = fields.Float(required=True)
    confidence    = fields.Float(load_default=None, allow_none=True)
    isAutoLabeled = fields.Bool(load_default=False)


_ann_schema = AnnotationSchema(many=True)


def _get_image(ds_id: int, img_id: int) -> LabelImage:
    return LabelImage.query.filter_by(id=img_id, dataset_id=ds_id).first_or_404()


@label_annotations_bp.get("/<int:ds_id>/images/<int:img_id>/annotations")
def list_annotations(ds_id, img_id):
    img = _get_image(ds_id, img_id)
    anns = LabelAnnotation.query.filter_by(image_id=img_id).all()
    return success([a.to_canvas_dict(img.width or 640, img.height or 480) for a in anns])


@label_annotations_bp.post("/<int:ds_id>/images/<int:img_id>/annotations")
def save_annotations(ds_id, img_id):
    """Replace all annotations for an image (canvas-based replace-all strategy)."""
    img = _get_image(ds_id, img_id)
    body = request.get_json() or {}
    raw_list = body.get("annotations", [])

    validated = _ann_schema.load(raw_list)

    # Delete existing annotations
    LabelAnnotation.query.filter_by(image_id=img_id).delete()

    new_anns = []
    iw = img.width  or 640
    ih = img.height or 480

    for item in validated:
        # Convert pixel coords to YOLO normalized
        x_center = (item["x"] + item["width"]  / 2) / iw
        y_center = (item["y"] + item["height"] / 2) / ih
        norm_w   = item["width"]  / iw
        norm_h   = item["height"] / ih

        new_anns.append(LabelAnnotation(
            image_id        = img_id,
            class_id        = item["classId"],
            class_name      = item["className"],
            x_center        = max(0.0, min(1.0, x_center)),
            y_center        = max(0.0, min(1.0, y_center)),
            ann_width       = max(0.0, min(1.0, norm_w)),
            ann_height      = max(0.0, min(1.0, norm_h)),
            confidence      = item.get("confidence"),
            is_auto_labeled = item.get("isAutoLabeled", False),
        ))

    db.session.bulk_save_objects(new_anns)

    # Update image status
    was_unlabeled = img.status == "unlabeled"
    if new_anns:
        img.status = "labeled"
    else:
        img.status = "unlabeled"

    # Update dataset labeled counter
    if was_unlabeled and new_anns:
        ds = db.session.get(LabelDataset, ds_id)
        if ds:
            ds.labeled = (ds.labeled or 0) + 1

    db.session.commit()

    # Re-fetch to return with IDs
    saved = LabelAnnotation.query.filter_by(image_id=img_id).all()
    return success([a.to_canvas_dict(iw, ih) for a in saved],
                   message=f"{len(saved)} annotation(s) saved")


@label_annotations_bp.delete("/<int:ds_id>/images/<int:img_id>/annotations/<int:ann_id>")
def delete_annotation(ds_id, img_id, ann_id):
    _get_image(ds_id, img_id)
    ann = LabelAnnotation.query.filter_by(id=ann_id, image_id=img_id).first_or_404()
    db.session.delete(ann)
    db.session.commit()
    return success(None, message="Annotation deleted", status_code=204)
