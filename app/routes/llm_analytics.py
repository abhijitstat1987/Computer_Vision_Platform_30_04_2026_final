"""
LLM Image Analytics API.
POST /api/llm/analyze          - analyze image with AI vision model
GET  /api/llm/analyses         - list past analyses (paginated)
GET  /api/llm/analyses/<id>    - single analysis
DELETE /api/llm/analyses/<id>  - delete analysis
"""
from __future__ import annotations

import base64
import os
import logging
from flask import Blueprint, request, current_app
from app.extensions import db
from app.models import LlmAnalysis, LabelImage, LabelDataset
from app.utils.response import success, error
from app.utils.pagination import paginate
from app.utils.llm_client import vision_completion

logger = logging.getLogger(__name__)

llm_analytics_bp = Blueprint("llm_analytics", __name__)


@llm_analytics_bp.post("/analyze")
def analyze_image():
    """
    Analyze an image with an LLM vision model.

    Request JSON:
      provider     (str, required)  — "openai" | "anthropic" | "ollama"
      model        (str, required)  — e.g. "gpt-4o", "claude-3-haiku-20240307", "llava"
      prompt       (str, required)  — analysis instruction
      api_key      (str, optional)  — provider API key (never stored)
      base_url     (str, optional)  — override base URL (for Ollama)

      One of:
        image_id   (int)            — existing label_images.id
        image_b64  (str)            — raw base64 image bytes
        image_mime (str)            — MIME type when using image_b64 (default image/jpeg)
    """
    body = request.get_json(silent=True) or {}

    provider  = body.get("provider", "").strip()
    model     = body.get("model", "").strip()
    prompt    = body.get("prompt", "").strip()
    api_key   = body.get("api_key") or None
    base_url  = body.get("base_url") or None
    image_id  = body.get("image_id")
    dataset_id_raw = body.get("dataset_id")

    if not provider:
        return error("provider is required", 400)
    if not model:
        return error("model is required", 400)
    if not prompt:
        return error("prompt is required", 400)

    image_b64: str | None = body.get("image_b64")
    image_mime: str = body.get("image_mime", "image/jpeg")
    image_filename: str | None = None
    resolved_dataset_id: int | None = None

    # ── Resolve image from DB or accept raw base64 ─────────────────────────
    if image_id:
        img: LabelImage | None = db.session.get(LabelImage, int(image_id))
        if not img:
            return error("Image not found", 404)

        resolved_dataset_id = img.dataset_id
        image_filename = img.filename

        images_folder = os.path.join(
            current_app.config["LABEL_IMAGES_FOLDER"], str(img.dataset_id)
        )
        img_path = os.path.join(images_folder, img.filename)
        if not os.path.exists(img_path):
            return error(f"Image file not found on disk: {img.filename}", 404)

        ext = os.path.splitext(img.filename)[1].lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".png": "image/png", ".webp": "image/webp",
                    ".gif": "image/gif"}
        image_mime = mime_map.get(ext, "image/jpeg")

        with open(img_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode()

    elif image_b64:
        # Strip data URI prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        if dataset_id_raw:
            resolved_dataset_id = int(dataset_id_raw)
    else:
        return error("Provide image_id or image_b64", 400)

    # ── Call LLM vision API ────────────────────────────────────────────────
    try:
        result_text = vision_completion(
            provider=provider,
            model=model,
            prompt=prompt,
            image_b64=image_b64,
            image_mime=image_mime,
            api_key=api_key,
            base_url=base_url,
        )
    except Exception as exc:
        logger.error("LLM vision error: %s", exc)
        return error(str(exc), 502)

    # ── Persist to DB ──────────────────────────────────────────────────────
    analysis = LlmAnalysis(
        image_id       = int(image_id) if image_id else None,
        dataset_id     = resolved_dataset_id,
        model_provider = provider,
        model_name     = model,
        prompt         = prompt,
        result_text    = result_text,
        image_filename = image_filename,
    )
    db.session.add(analysis)
    db.session.commit()

    return success(analysis.to_dict(), message="Analysis complete", status_code=201)


@llm_analytics_bp.get("/analyses")
def list_analyses():
    query = LlmAnalysis.query.order_by(LlmAnalysis.created_at.desc())

    dataset_id = request.args.get("dataset_id")
    if dataset_id:
        query = query.filter_by(dataset_id=int(dataset_id))

    provider = request.args.get("provider")
    if provider:
        query = query.filter_by(model_provider=provider)

    items, pagination = paginate(query)
    return success([a.to_dict() for a in items], pagination=pagination)


@llm_analytics_bp.get("/analyses/<int:analysis_id>")
def get_analysis(analysis_id):
    analysis = db.get_or_404(LlmAnalysis, analysis_id)
    return success(analysis.to_dict())


@llm_analytics_bp.delete("/analyses/<int:analysis_id>")
def delete_analysis(analysis_id):
    analysis = db.get_or_404(LlmAnalysis, analysis_id)
    db.session.delete(analysis)
    db.session.commit()
    return success(None, message="Analysis deleted")
