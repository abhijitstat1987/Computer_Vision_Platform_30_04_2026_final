"""
AI Chatbot API with live platform context injection.

GET  /api/chat/sessions                    - list sessions
POST /api/chat/sessions                    - create session
GET  /api/chat/sessions/<id>/messages      - get all messages
POST /api/chat/sessions/<id>/message       - send message, get AI response
DELETE /api/chat/sessions/<id>             - delete session
GET  /api/chat/context                     - get platform summary (for system prompt preview)
"""
from __future__ import annotations

import logging
from datetime import datetime, date, timedelta
from flask import Blueprint, request
from app.extensions import db
from app.models import ChatSession, ChatMessage
from app.utils.response import success, error
from app.utils.llm_client import chat_completion

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)


# ── Helper: build live platform context ───────────────────────────────────────

def _build_platform_context() -> dict:
    """Query live DB data for chatbot system prompt."""
    from app.models import (
        Camera, DetectionEvent, Alert,
        LabelDataset, LabelImage, TrainingJob, LlmJob,
    )

    today = datetime.combine(date.today(), datetime.min.time())

    try:
        cam_total  = Camera.query.count()
        cam_active = Camera.query.filter_by(status="active").count()
    except Exception:
        cam_total = cam_active = 0

    try:
        detections_today = DetectionEvent.query.filter(
            DetectionEvent.detected_at >= today
        ).count()
        detections_week = DetectionEvent.query.filter(
            DetectionEvent.detected_at >= today - timedelta(days=7)
        ).count()
    except Exception:
        detections_today = detections_week = 0

    try:
        alerts_unresolved  = Alert.query.filter_by(status="unresolved").count()
        alerts_total       = Alert.query.count()
    except Exception:
        alerts_unresolved = alerts_total = 0

    try:
        dataset_count = LabelDataset.query.count()
        image_count   = LabelImage.query.count()
    except Exception:
        dataset_count = image_count = 0

    try:
        cv_jobs_running   = TrainingJob.query.filter_by(status="running").count()
        cv_jobs_completed = TrainingJob.query.filter_by(status="completed").count()
    except Exception:
        cv_jobs_running = cv_jobs_completed = 0

    try:
        llm_jobs_running = LlmJob.query.filter_by(status="running").count()
    except Exception:
        llm_jobs_running = 0

    return {
        "cameras_total":      cam_total,
        "cameras_active":     cam_active,
        "detections_today":   detections_today,
        "detections_week":    detections_week,
        "alerts_unresolved":  alerts_unresolved,
        "alerts_total":       alerts_total,
        "datasets":           dataset_count,
        "images_total":       image_count,
        "cv_jobs_running":    cv_jobs_running,
        "cv_jobs_completed":  cv_jobs_completed,
        "llm_jobs_running":   llm_jobs_running,
    }


def _build_system_prompt(ctx: dict) -> str:
    return f"""You are an intelligent AI assistant for an Industrial Computer Vision Platform.
You help operators monitor cameras, analyze detections, manage datasets, and understand platform status.

Current platform status (live data):
- Cameras: {ctx['cameras_total']} total, {ctx['cameras_active']} active
- Detections today: {ctx['detections_today']:,}  |  Past 7 days: {ctx['detections_week']:,}
- Alerts: {ctx['alerts_unresolved']} unresolved (of {ctx['alerts_total']} total)
- Datasets: {ctx['datasets']} with {ctx['images_total']:,} total images
- CV Training jobs: {ctx['cv_jobs_running']} running, {ctx['cv_jobs_completed']} completed
- LLM Fine-tuning jobs: {ctx['llm_jobs_running']} running

Answer questions about the platform clearly and concisely. When you don't know specific details, \
say so rather than guessing. For numbers, use the live data provided above. \
Today's date is {date.today().strftime('%A, %B %d, %Y')}."""


# ── Routes ─────────────────────────────────────────────────────────────────────

@chat_bp.get("/context")
def get_context():
    """Return live platform data that will be injected into system prompt."""
    ctx = _build_platform_context()
    return success({
        "context":       ctx,
        "systemPrompt":  _build_system_prompt(ctx),
    })


@chat_bp.get("/sessions")
def list_sessions():
    sessions = (
        ChatSession.query
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
        .all()
    )
    return success([s.to_dict() for s in sessions])


@chat_bp.post("/sessions")
def create_session():
    body  = request.get_json(silent=True) or {}
    title = body.get("title", "New Chat").strip() or "New Chat"
    session = ChatSession(title=title)
    db.session.add(session)
    db.session.commit()
    return success(session.to_dict(), message="Session created", status_code=201)


@chat_bp.get("/sessions/<int:session_id>/messages")
def get_messages(session_id):
    session = db.get_or_404(ChatSession, session_id)
    messages = (
        ChatMessage.query
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return success({
        "session":  session.to_dict(),
        "messages": [m.to_dict() for m in messages],
    })


@chat_bp.post("/sessions/<int:session_id>/message")
def send_message(session_id):
    """
    Send a user message and receive an AI response.

    Request JSON:
      content   (str, required)  — user message text
      provider  (str, optional)  — "openai" | "anthropic" | "ollama" (default "ollama")
      model     (str, optional)  — model name
      api_key   (str, optional)  — provider key (never stored)
      base_url  (str, optional)  — Ollama URL override
    """
    session = db.get_or_404(ChatSession, session_id)
    body = request.get_json(silent=True) or {}

    content  = (body.get("content") or "").strip()
    if not content:
        return error("content is required", 400)

    provider = body.get("provider", "ollama").strip().lower()
    model    = body.get("model", "").strip()
    api_key  = body.get("api_key") or None
    base_url = body.get("base_url") or None

    # Sensible model defaults per provider
    if not model:
        defaults = {"openai": "gpt-4o-mini", "anthropic": "claude-3-haiku-20240307",
                    "ollama": "llama3"}
        model = defaults.get(provider, "llama3")

    # ── Save user message ────────────────────────────────────────────────
    user_msg = ChatMessage(session_id=session_id, role="user", content=content)
    db.session.add(user_msg)
    db.session.flush()  # get ID without commit

    # ── Build message history for LLM ────────────────────────────────────
    ctx = _build_platform_context()
    system_prompt = _build_system_prompt(ctx)

    history = (
        ChatMessage.query
        .filter_by(session_id=session_id)
        .filter(ChatMessage.role.in_(["user", "assistant"]))
        .order_by(ChatMessage.created_at.asc())
        .limit(20)  # last 20 messages for context window
        .all()
    )

    messages = [{"role": "system", "content": system_prompt}]
    for m in history:
        messages.append({"role": m.role, "content": m.content})

    # Ensure current user message is last
    if not history or history[-1].content != content:
        messages.append({"role": "user", "content": content})

    # ── Call LLM ─────────────────────────────────────────────────────────
    try:
        reply = chat_completion(
            provider=provider,
            model=model,
            messages=messages,
            api_key=api_key,
            base_url=base_url,
        )
    except Exception as exc:
        logger.error("Chat completion error: %s", exc)
        db.session.rollback()
        return error(str(exc), 502)

    # ── Save assistant message ────────────────────────────────────────────
    assistant_msg = ChatMessage(
        session_id=session_id, role="assistant", content=reply
    )
    db.session.add(assistant_msg)

    # Update session title from first user message
    if session.title == "New Chat" and len(history) == 0:
        session.title = content[:80]
    session.updated_at = datetime.utcnow()

    db.session.commit()

    return success({
        "userMessage":      user_msg.to_dict(),
        "assistantMessage": assistant_msg.to_dict(),
        "contextUsed":      ctx,
    })


@chat_bp.delete("/sessions/<int:session_id>")
def delete_session(session_id):
    session = db.get_or_404(ChatSession, session_id)
    db.session.delete(session)
    db.session.commit()
    return success(None, message="Session deleted")
