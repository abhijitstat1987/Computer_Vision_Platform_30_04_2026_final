"""
LLM Fine-Tuning API.

GET  /api/llm/training/jobs             - list jobs
POST /api/llm/training/jobs             - create & start job
GET  /api/llm/training/jobs/<id>        - get job detail
DELETE /api/llm/training/jobs/<id>      - cancel / delete job
GET  /api/llm/training/jobs/<id>/logs   - tail log file
GET  /api/llm/training/models           - list available base models
POST /api/llm/training/jobs/<id>/cancel - cancel running job
"""
from __future__ import annotations

import os
import logging
from flask import Blueprint, request, current_app
from app.extensions import db
from app.models import LlmJob
from app.utils.response import success, error
from app.utils.pagination import paginate

logger = logging.getLogger(__name__)

llm_training_bp = Blueprint("llm_training", __name__)


@llm_training_bp.get("/models")
def list_models():
    from app.services.llm_trainer import AVAILABLE_MODELS
    return success(AVAILABLE_MODELS)


@llm_training_bp.get("/jobs")
def list_jobs():
    query = LlmJob.query.order_by(LlmJob.created_at.desc())

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    items, pagination = paginate(query)
    return success([j.to_dict() for j in items], pagination=pagination)


@llm_training_bp.post("/jobs")
def create_job():
    body = request.get_json(silent=True) or {}

    base_model = (body.get("baseModel") or body.get("base_model", "")).strip()
    if not base_model:
        return error("baseModel is required", 400)

    technique     = body.get("technique", "lora").strip().lower()
    dataset_path  = (body.get("datasetPath") or body.get("dataset_path", "")).strip() or None
    epochs        = int(body.get("epochs", 3))
    batch_size    = int(body.get("batchSize", body.get("batch_size", 4)))
    lora_r        = int(body.get("loraR", body.get("lora_r", 16)))
    lora_alpha    = int(body.get("loraAlpha", body.get("lora_alpha", 32)))
    lora_dropout  = float(body.get("loraDropout", body.get("lora_dropout", 0.05)))
    learning_rate = float(body.get("learningRate", body.get("learning_rate", 2e-4)))

    if technique not in ("lora", "qlora", "full"):
        return error("technique must be lora, qlora, or full", 400)

    job = LlmJob(
        base_model    = base_model,
        technique     = technique,
        dataset_path  = dataset_path,
        epochs        = epochs,
        batch_size    = batch_size,
        lora_r        = lora_r,
        lora_alpha    = lora_alpha,
        lora_dropout  = lora_dropout,
        learning_rate = learning_rate,
        status        = "queued",
    )
    db.session.add(job)
    db.session.commit()

    # Start background thread
    try:
        from app.services.llm_trainer import start_llm_training_job
        import flask
        start_llm_training_job(flask.current_app._get_current_object(), job.id)
    except Exception as exc:
        logger.error("Failed to start LLM training thread: %s", exc)

    return success(job.to_dict(), message="LLM fine-tuning job started", status_code=201)


@llm_training_bp.get("/jobs/<int:job_id>")
def get_job(job_id):
    job = db.get_or_404(LlmJob, job_id)
    return success(job.to_dict())


@llm_training_bp.post("/jobs/<int:job_id>/cancel")
def cancel_job(job_id):
    job = db.get_or_404(LlmJob, job_id)
    if job.status not in ("queued", "running"):
        return error("Job is not active", 400)

    from app.services.llm_trainer import cancel_llm_job
    cancel_llm_job(job_id)

    if job.status == "queued":
        job.status = "cancelled"
        db.session.commit()

    return success(job.to_dict(), message="Cancellation requested")


@llm_training_bp.delete("/jobs/<int:job_id>")
def delete_job(job_id):
    job = db.get_or_404(LlmJob, job_id)
    if job.status in ("running", "queued"):
        from app.services.llm_trainer import cancel_llm_job
        cancel_llm_job(job_id)

    db.session.delete(job)
    db.session.commit()
    return success(None, message="Job deleted")


@llm_training_bp.get("/jobs/<int:job_id>/logs")
def get_logs(job_id):
    job = db.get_or_404(LlmJob, job_id)
    if not job.log_file or not os.path.exists(job.log_file):
        return success({"lines": [], "message": "No log file yet"})

    tail = int(request.args.get("tail", 200))
    with open(job.log_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    return success({"lines": [l.rstrip("\n") for l in lines[-tail:]]})
