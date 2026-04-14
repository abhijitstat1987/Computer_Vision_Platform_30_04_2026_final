"""
Model inference endpoint.
POST /api/inference   - run a model on an uploaded image or base64 image
"""
import os
import base64
import tempfile
from flask import Blueprint, request, current_app
from app.utils.response import success, error

inference_bp = Blueprint("inference", __name__)

# Model cache: path -> YOLO instance
_model_cache: dict = {}


def _load_model(model_path: str):
    if model_path not in _model_cache:
        from ultralytics import YOLO
        _model_cache[model_path] = YOLO(model_path)
    return _model_cache[model_path]


def _run_inference(model_path: str, image_path: str, confidence: float = 0.25) -> list:
    model   = _load_model(model_path)
    results = model.predict(image_path, conf=confidence, verbose=False)
    boxes   = []
    for r in results:
        if r.boxes is None:
            continue
        iw = r.orig_shape[1]
        ih = r.orig_shape[0]
        for box in r.boxes:
            cls_idx  = int(box.cls[0])
            label    = model.names.get(cls_idx, f"class_{cls_idx}")
            conf_val = float(box.conf[0])
            xyxy     = box.xyxy[0].tolist()
            boxes.append({
                "label":      label,
                "confidence": round(conf_val, 4),
                "x1": int(xyxy[0]), "y1": int(xyxy[1]),
                "x2": int(xyxy[2]), "y2": int(xyxy[3]),
            })
    return boxes


@inference_bp.post("/")
def infer():
    """
    Accepts:
      - multipart/form-data with 'image' file + 'model_path' field
      - JSON with 'image_base64' + 'model_path'
    """
    confidence = float(request.form.get("confidence",
                       (request.get_json() or {}).get("confidence", 0.25)))

    # Determine model path
    model_path = request.form.get("model_path") or (request.get_json() or {}).get("model_path", "yolov8n.pt")

    tmp_path = None
    try:
        if "image" in request.files:
            img_file = request.files["image"]
            suffix   = "." + img_file.filename.rsplit(".", 1)[-1].lower() if "." in img_file.filename else ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                img_file.save(tmp.name)
                tmp_path = tmp.name

        elif request.is_json:
            data = request.get_json()
            b64  = data.get("image_base64", "")
            if not b64:
                return error("Provide 'image' file or 'image_base64'", status_code=400)
            img_bytes = base64.b64decode(b64)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                tmp.write(img_bytes)
                tmp_path = tmp.name
        else:
            return error("Provide 'image' file (multipart) or JSON with 'image_base64'", status_code=400)

        boxes = _run_inference(model_path, tmp_path, confidence)
        return success({"boxes": boxes, "count": len(boxes)})

    except Exception as ex:
        return error(str(ex), status_code=500)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
