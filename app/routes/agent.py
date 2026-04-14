"""
Agentic AI Orchestrator — drives end-to-end project setup with human-in-the-loop.

POST /api/agent/sessions                     – start new agent session
GET  /api/agent/sessions                     – list sessions
GET  /api/agent/sessions/<id>                – full session with steps
POST /api/agent/sessions/<id>/respond        – user responds to agent question
POST /api/agent/sessions/<id>/execute        – execute next pending action
POST /api/agent/sessions/<id>/upload-images  – upload images into agent session
GET  /api/agent/sessions/<id>/snapshots      – get all snapshots for a session
DELETE /api/agent/sessions/<id>              – delete session
"""
from __future__ import annotations

import json
import logging
import os
import time
import traceback
from datetime import datetime
from typing import Optional

from flask import Blueprint, request, current_app
from app.extensions import db
from app.utils.response import success, error, to_ist

logger = logging.getLogger(__name__)

agent_bp = Blueprint("agent", __name__)


# ── Models ─────────────────────────────────────────────────────────────────────

class AgentSession(db.Model):
    __tablename__ = "agent_sessions"

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title          = db.Column(db.String(255), nullable=False, default="New Agent Session")
    status         = db.Column(db.String(40), nullable=False, default="gathering")
    # gathering -> reviewing -> executing -> completed -> error
    project_id     = db.Column(db.Integer, nullable=True)
    use_case_id    = db.Column(db.Integer, nullable=True)
    dataset_id     = db.Column(db.Integer, nullable=True)
    training_job_id = db.Column(db.Integer, nullable=True)
    config_json    = db.Column(db.Text, nullable=False, default="{}")
    current_phase  = db.Column(db.String(60), nullable=False, default="welcome")
    created_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                               onupdate=datetime.utcnow)

    steps = db.relationship("AgentStep", backref="session",
                            cascade="all, delete-orphan",
                            order_by="AgentStep.step_order")

    def get_config(self) -> dict:
        try:
            return json.loads(self.config_json or "{}")
        except Exception:
            return {}

    def set_config(self, cfg: dict):
        self.config_json = json.dumps(cfg)

    def to_dict(self, include_steps=False):
        d = {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "projectId": self.project_id,
            "useCaseId": self.use_case_id,
            "datasetId": self.dataset_id,
            "trainingJobId": self.training_job_id,
            "config": self.get_config(),
            "currentPhase": self.current_phase,
            "createdAt": to_ist(self.created_at),
            "updatedAt": to_ist(self.updated_at),
        }
        if include_steps:
            d["steps"] = [s.to_dict() for s in self.steps]
        return d


class AgentStep(db.Model):
    __tablename__ = "agent_steps"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id  = db.Column(db.Integer, db.ForeignKey("agent_sessions.id", ondelete="CASCADE"),
                            nullable=False)
    step_order  = db.Column(db.Integer, nullable=False, default=0)
    phase       = db.Column(db.String(60), nullable=False)
    role        = db.Column(db.String(20), nullable=False)  # agent | user | system | snapshot
    content     = db.Column(db.Text, nullable=False)
    step_type   = db.Column(db.String(40), nullable=False, default="message")
    # message | question | action | snapshot | result | error | review | link
    metadata_json = db.Column(db.Text, nullable=True, default="{}")
    snapshot_url  = db.Column(db.String(500), nullable=True)
    status      = db.Column(db.String(30), nullable=False, default="completed")
    # pending | completed | error | awaiting_input
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def get_metadata(self) -> dict:
        try:
            return json.loads(self.metadata_json or "{}")
        except Exception:
            return {}

    def to_dict(self):
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "stepOrder": self.step_order,
            "phase": self.phase,
            "role": self.role,
            "content": self.content,
            "stepType": self.step_type,
            "metadata": self.get_metadata(),
            "snapshotUrl": self.snapshot_url,
            "status": self.status,
            "createdAt": to_ist(self.created_at),
        }


# ── Phase definitions ──────────────────────────────────────────────────────────

PHASES = [
    "welcome",
    "project_info",
    "geography",
    "use_case",
    "data_storage",
    "edge_device",
    "camera_setup",
    "llm_config",
    "dataset_setup",
    "review",
    "create_project",
    "create_use_case",
    "create_dataset",
    "create_camera",
    "create_edge_device",
    "create_db_config",
    "create_llm_config",
    "upload_images",
    "label_images",
    "start_training",
    "completed",
]

PHASE_QUESTIONS = {
    "welcome": {
        "message": "Hey there! 👋 I'm your AI project assistant.\n\nI'll walk you through building a complete Computer Vision pipeline — project setup, cameras, edge devices, dataset, the works. Think of me as a colleague helping you get everything configured.\n\nSo, first things first — **what would you like to call this project?**",
        "field": "project_name",
        "type": "text",
        "placeholder": "e.g., Factory Safety Monitoring",
    },
    "project_info": {
        "message": "Love it! 🎉 Great name.\n\nNow, tell me a bit about the organization this is for. I just need three things — the **company name**, which **business unit or plant** this falls under, and the **product line** (if applicable).\n\nJust separate them with commas and I'll handle the rest.",
        "fields": ["biz_company", "biz_unit", "biz_product"],
        "type": "multi_text",
        "placeholder": "e.g., Tata Steel, Jamshedpur Plant, Hot Rolling Mill",
    },
    "geography": {
        "message": "Perfect, got it! 📍\n\nNow where is this going to be deployed? Give me the **country, state, city**, and the **specific site or location name** — like a building, gate, or floor.\n\nComma-separated works great.",
        "fields": ["geo_country", "geo_state", "geo_city", "geo_site"],
        "type": "multi_text",
        "placeholder": "e.g., India, Jharkhand, Jamshedpur, Main Gate Area",
    },
    "use_case": {
        "message": "Nice, I can picture the setup already! 🎯\n\nWhat's the main goal here? Pick a category that fits best:\n\n- **safety** — things like PPE detection, restricted zone alerts, fall detection\n- **quality** — defect inspection, surface analysis\n- **maintenance** — equipment monitoring, anomaly detection\n- **productivity** — people counting, workflow optimization\n- **custom** — something unique you have in mind\n\nAnd give me a quick one-liner about what exactly you want to detect or monitor. For example: *safety, Detect workers without helmets near heavy machinery*",
        "fields": ["use_case_type", "use_case_description"],
        "type": "multi_text",
        "placeholder": "e.g., safety, Detect workers without helmets and safety vests in production area",
    },
    "data_storage": {
        "message": "Alright, the vision part is shaping up! 💾\n\nWhere do you want all the detection data stored? Just tell me the **database type** (mysql, postgresql, sqlite, or mongodb), the **host**, and the **database name**.\n\nOr if you just want to use the default MySQL setup on localhost, simply type **default** — I'll configure everything for you.",
        "fields": ["db_type", "db_host", "db_name"],
        "type": "multi_text",
        "placeholder": "e.g., default  OR  mysql, 192.168.1.50, factory_vision_db",
    },
    "edge_device": {
        "message": "Database — sorted! 🖥️\n\nNow, what hardware will be running the AI models at the edge? I need a **device name** (whatever you call it internally), the **platform** (jetson_nano, jetson_xavier, raspberry_pi, x86_gpu, or cloud), the **GPU model** if there is one, and optionally the **IP address**.\n\nJust comma-separate them.",
        "fields": ["edge_name", "edge_platform", "edge_gpu", "edge_ip"],
        "type": "multi_text",
        "placeholder": "e.g., Jetson-Gate-01, jetson_xavier, Jetson GPU, 192.168.1.10",
    },
    "camera_setup": {
        "message": "Edge device is locked in! 📷\n\nLet's hook up the camera. I need the **camera name**, the **RTSP URL** (or just `0` if you're testing with a webcam), the **physical location** where it's mounted, and the **camera type** (ip, usb, or webcam).\n\nComma-separated as usual.",
        "fields": ["cam_name", "cam_rtsp", "cam_location", "cam_type"],
        "type": "multi_text",
        "placeholder": "e.g., Gate-Cam-01, rtsp://192.168.1.100:554/stream, Main Gate, ip",
    },
    "llm_config": {
        "message": "Camera's all set! 🤖\n\nOne more thing — would you like to connect a **language model** for intelligent image analysis and reasoning? You've got options:\n\n- **ollama** — run models locally (Llama3, Mistral, LLaVA) — totally free and private\n- **openai** — GPT-4o, GPT-4o-mini — powerful but needs an API key\n- **anthropic** — Claude 3.5 Sonnet — great reasoning, also needs a key\n- **skip** — no worries, you can set this up later\n\nJust tell me the provider and model name, like: *ollama, llama3*",
        "fields": ["llm_provider", "llm_model"],
        "type": "multi_text",
        "placeholder": "e.g., ollama, llama3  OR  openai, gpt-4o-mini  OR  skip",
    },
    "dataset_setup": {
        "message": "Almost there — this is the last piece of the puzzle! 📦\n\nLet's set up your training dataset. I need:\n\n- A **dataset name** (something descriptive)\n- The **object classes** you want to detect (comma-separated)\n- Your **labeling preference** — manual, auto, or semi-auto\n- The **training framework** — pytorch, tensorflow, or both\n\nFor example: *PPE Dataset, helmet, vest, person, gloves, auto, pytorch*",
        "fields": ["dataset_name", "classes", "label_mode", "framework"],
        "type": "multi_text",
        "placeholder": "e.g., PPE Dataset, helmet vest person gloves, auto, pytorch",
    },
    "review": {
        "message": "",  # Dynamically generated
        "type": "review",
    },
}


def _next_step_order(session_id: int) -> int:
    last = AgentStep.query.filter_by(session_id=session_id).order_by(
        AgentStep.step_order.desc()).first()
    return (last.step_order + 1) if last else 0


def _add_step(session_id, phase, role, content, step_type="message",
              metadata=None, snapshot_url=None, status="completed") -> AgentStep:
    step = AgentStep(
        session_id=session_id,
        step_order=_next_step_order(session_id),
        phase=phase,
        role=role,
        content=content,
        step_type=step_type,
        metadata_json=json.dumps(metadata or {}),
        snapshot_url=snapshot_url,
        status=status,
    )
    db.session.add(step)
    db.session.flush()
    return step


def _generate_review(config: dict) -> str:
    """Build a friendly conversational review of the config."""
    classes = config.get("classes", "")
    if isinstance(classes, list):
        classes_str = ", ".join(classes)
    else:
        classes_str = classes

    project_name = config.get('project_name', 'your project')
    company = config.get('biz_company', 'N/A')
    city = config.get('geo_city', '')
    site = config.get('geo_site', '')
    location_str = f"{city}, {site}" if city and site else city or site or "N/A"

    lines = [
        f"## Here's everything I've got for **{project_name}** 📋\n",
        "Take a quick look and make sure it all looks right:\n",
        f"**Organization:** {company}",
        f"  └ Business Unit: {config.get('biz_unit', 'N/A')} · Product Line: {config.get('biz_product', 'N/A')}\n",
        f"**Location:** {config.get('geo_country', 'N/A')} → {config.get('geo_state', 'N/A')} → {location_str}\n",
        f"**Use Case:** {config.get('use_case_type', 'custom').title()} — _{config.get('use_case_description', 'N/A')}_\n",
        f"**Database:** {config.get('db_type', 'mysql')} on {config.get('db_host', 'localhost')} ({config.get('db_name', 'default')})\n",
        f"**Edge Device:** {config.get('edge_name', 'N/A')} ({config.get('edge_platform', 'N/A')}"
        + (f", GPU: {config.get('edge_gpu')}" if config.get('edge_gpu') else "") + ")\n",
        f"**Camera:** {config.get('cam_name', 'N/A')} at {config.get('cam_location', 'N/A')} ({config.get('cam_type', 'ip')})\n",
        f"**LLM:** {config.get('llm_provider', 'skip').title()}"
        + (f" — {config.get('llm_model', '')}" if config.get('llm_provider', 'skip') != 'skip' else " (will set up later)") + "\n",
        f"**Dataset:** {config.get('dataset_name', 'N/A')}",
        f"  └ Classes: {classes_str}",
        f"  └ Labeling: {config.get('label_mode', 'auto')} · Framework: {config.get('framework', 'pytorch')}",
        "",
        "---",
        "If everything looks good, just say **confirm** and I'll start building everything for you! ✨",
        "",
        "Or tell me what you'd like to change — like *\"change the company to Reliance\"* or *\"add one more class called forklift\"*.",
    ]
    return "\n".join(lines)


# ── Execution helpers ──────────────────────────────────────────────────────────

def _execute_create_project(session: AgentSession) -> dict:
    from app.models import Project
    cfg = session.get_config()
    project = Project(
        name=cfg.get("project_name", "New Project"),
        description=f"Auto-created by AI Agent: {cfg.get('use_case_description', '')}",
        biz_company=cfg.get("biz_company", ""),
        biz_unit=cfg.get("biz_unit", ""),
        biz_product=cfg.get("biz_product", ""),
        geo_country=cfg.get("geo_country", ""),
        geo_state=cfg.get("geo_state", ""),
        geo_city=cfg.get("geo_city", ""),
        geo_site=cfg.get("geo_site", ""),
        status="active",
    )
    db.session.add(project)
    db.session.flush()
    session.project_id = project.id
    return project.to_dict()


def _execute_create_use_case(session: AgentSession) -> dict:
    from app.models import UseCase
    cfg = session.get_config()
    uc_type = cfg.get("use_case_type", "custom").lower().strip()
    if uc_type not in ("safety", "quality", "maintenance", "productivity", "custom"):
        uc_type = "custom"
    uc = UseCase(
        project_id=session.project_id,
        name=f"{cfg.get('project_name', '')} — {uc_type.title()} Detection",
        description=cfg.get("use_case_description", ""),
        type=uc_type,
        priority="high",
        status="active",
    )
    db.session.add(uc)
    db.session.flush()
    session.use_case_id = uc.id
    return uc.to_dict()


def _execute_create_dataset(session: AgentSession) -> dict:
    from app.models import LabelDataset
    cfg = session.get_config()
    classes_raw = cfg.get("classes", "")
    if isinstance(classes_raw, str):
        classes_list = [c.strip() for c in classes_raw.replace(",", " ").split() if c.strip()]
    else:
        classes_list = classes_raw

    classes_json_arr = [{"id": name, "name": name, "color": _class_color(i)}
                        for i, name in enumerate(classes_list)]

    ds = LabelDataset(
        name=cfg.get("dataset_name", "Training Dataset"),
        classes_json=json.dumps(classes_json_arr),
    )
    db.session.add(ds)
    db.session.flush()

    # Create images folder
    folder = os.path.join(current_app.config.get("LABEL_IMAGES_FOLDER", "uploads/label_images"),
                          str(ds.id))
    os.makedirs(folder, exist_ok=True)

    session.dataset_id = ds.id
    return ds.to_dict()


def _execute_create_camera(session: AgentSession) -> dict:
    from app.models import Camera
    cfg = session.get_config()
    cam = Camera(
        name=cfg.get("cam_name", "Camera 1"),
        rtsp_url=cfg.get("cam_rtsp", "0"),
        ip_address=cfg.get("edge_ip", ""),
        location=cfg.get("cam_location", ""),
        camera_type=cfg.get("cam_type", "ip"),
        status="active",
    )
    db.session.add(cam)
    db.session.flush()
    return cam.to_dict()


def _execute_create_edge_device(session: AgentSession) -> dict:
    from app.models import EdgeDevice
    cfg = session.get_config()
    dev = EdgeDevice(
        name=cfg.get("edge_name", "Edge Device 1"),
        location=cfg.get("cam_location", ""),
        status="online",
        platform=cfg.get("edge_platform", "x86_gpu"),
        gpu_model=cfg.get("edge_gpu", ""),
        ip_address=cfg.get("edge_ip", ""),
    )
    db.session.add(dev)
    db.session.flush()
    return dev.to_dict()


def _execute_create_db_config(session: AgentSession) -> dict:
    from app.models import DbConfig
    cfg = session.get_config()
    db_type = cfg.get("db_type", "mysql")
    if db_type == "default":
        db_type = "mysql"
    dbc = DbConfig(
        name=f"{cfg.get('project_name', 'Project')} Database",
        db_type=db_type,
        host=cfg.get("db_host", "localhost"),
        port=_default_port(db_type),
        db_name=cfg.get("db_name", "vision_platform_db"),
        username="root",
        status="connected",
    )
    db.session.add(dbc)
    db.session.flush()
    return dbc.to_dict()


def _execute_create_llm_config(session: AgentSession) -> dict:
    from app.models import LlmConfig
    cfg = session.get_config()
    provider = cfg.get("llm_provider", "skip").lower()
    if provider == "skip":
        return {"skipped": True}
    model = cfg.get("llm_model", "llama3")

    endpoints = {
        "ollama": "http://localhost:11434",
        "openai": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com",
    }

    llm = LlmConfig(
        name=f"{provider.title()} — {model}",
        provider=provider,
        llm_type="LLM" if provider != "ollama" else "SLM",
        size="7B" if provider == "ollama" else "Large",
        context_len="128K" if provider != "ollama" else "8K",
        endpoint=endpoints.get(provider, ""),
        description=f"Auto-configured by AI Agent for {cfg.get('project_name', '')}",
        status="configured",
    )
    db.session.add(llm)
    db.session.flush()
    return llm.to_dict()


def _default_port(db_type: str) -> int:
    return {"mysql": 3306, "postgresql": 5432, "mongodb": 27017, "sqlite": 0}.get(db_type, 3306)


_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
           "#FF9F40", "#E7E9ED", "#7CB342", "#D32F2F", "#1976D2"]

def _class_color(idx: int) -> str:
    return _COLORS[idx % len(_COLORS)]


# ── Routes ─────────────────────────────────────────────────────────────────────

@agent_bp.post("/sessions")
def create_session():
    body = request.get_json(silent=True) or {}
    title = body.get("title", "AI Agent Project Builder")
    session = AgentSession(title=title, current_phase="welcome", status="gathering")
    db.session.add(session)
    db.session.flush()

    # Add welcome message
    phase_def = PHASE_QUESTIONS["welcome"]
    _add_step(session.id, "welcome", "agent", phase_def["message"], "question",
              metadata={"field": phase_def["field"], "type": phase_def["type"],
                        "placeholder": phase_def.get("placeholder", "")},
              status="awaiting_input")

    db.session.commit()
    return success(session.to_dict(include_steps=True), message="Agent session created", status_code=201)


@agent_bp.get("/sessions")
def list_sessions():
    sessions = AgentSession.query.order_by(AgentSession.updated_at.desc()).limit(50).all()
    return success([s.to_dict() for s in sessions])


@agent_bp.get("/sessions/<int:session_id>")
def get_session(session_id):
    session = db.get_or_404(AgentSession, session_id)
    return success(session.to_dict(include_steps=True))


@agent_bp.delete("/sessions/<int:session_id>")
def delete_session(session_id):
    session = db.get_or_404(AgentSession, session_id)
    db.session.delete(session)
    db.session.commit()
    return success(None, message="Session deleted")


@agent_bp.post("/sessions/<int:session_id>/respond")
def respond_to_agent(session_id):
    """User answers an agent question. Agent processes and moves to next phase."""
    session = db.get_or_404(AgentSession, session_id)
    body = request.get_json(silent=True) or {}
    user_input = (body.get("content") or "").strip()

    if not user_input:
        return error("content is required", 400)

    cfg = session.get_config()
    phase = session.current_phase

    # Save user response
    _add_step(session.id, phase, "user", user_input, "message")

    # ── Parse user input for current phase ──────────────────────────────
    if phase == "welcome":
        cfg["project_name"] = user_input
        session.title = f"Agent: {user_input}"
        next_phase = "project_info"

    elif phase == "project_info":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["biz_company"] = parts[0] if len(parts) > 0 else ""
        cfg["biz_unit"] = parts[1] if len(parts) > 1 else ""
        cfg["biz_product"] = parts[2] if len(parts) > 2 else ""
        next_phase = "geography"

    elif phase == "geography":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["geo_country"] = parts[0] if len(parts) > 0 else ""
        cfg["geo_state"] = parts[1] if len(parts) > 1 else ""
        cfg["geo_city"] = parts[2] if len(parts) > 2 else ""
        cfg["geo_site"] = parts[3] if len(parts) > 3 else ""
        next_phase = "use_case"

    elif phase == "use_case":
        parts = [p.strip() for p in user_input.split(",", 1)]
        cfg["use_case_type"] = parts[0] if len(parts) > 0 else "custom"
        cfg["use_case_description"] = parts[1] if len(parts) > 1 else parts[0]
        next_phase = "data_storage"

    elif phase == "data_storage":
        if user_input.lower() in ("default", "defaults", "default settings"):
            cfg["db_type"] = "mysql"
            cfg["db_host"] = "localhost"
            cfg["db_name"] = "vision_platform_db"
        else:
            parts = [p.strip() for p in user_input.split(",")]
            cfg["db_type"] = parts[0] if len(parts) > 0 else "mysql"
            cfg["db_host"] = parts[1] if len(parts) > 1 else "localhost"
            cfg["db_name"] = parts[2] if len(parts) > 2 else "vision_platform_db"
        next_phase = "edge_device"

    elif phase == "edge_device":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["edge_name"] = parts[0] if len(parts) > 0 else "Edge-Device-01"
        cfg["edge_platform"] = parts[1] if len(parts) > 1 else "x86_gpu"
        cfg["edge_gpu"] = parts[2] if len(parts) > 2 else ""
        cfg["edge_ip"] = parts[3] if len(parts) > 3 else ""
        next_phase = "camera_setup"

    elif phase == "camera_setup":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["cam_name"] = parts[0] if len(parts) > 0 else "Camera-01"
        cfg["cam_rtsp"] = parts[1] if len(parts) > 1 else "0"
        cfg["cam_location"] = parts[2] if len(parts) > 2 else ""
        cfg["cam_type"] = parts[3] if len(parts) > 3 else "ip"
        next_phase = "llm_config"

    elif phase == "llm_config":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["llm_provider"] = parts[0].lower() if len(parts) > 0 else "skip"
        cfg["llm_model"] = parts[1] if len(parts) > 1 else ""
        if cfg["llm_provider"] == "skip":
            cfg["llm_model"] = ""
        next_phase = "dataset_setup"

    elif phase == "dataset_setup":
        parts = [p.strip() for p in user_input.split(",")]
        cfg["dataset_name"] = parts[0] if len(parts) > 0 else "Training Dataset"
        # classes are middle items
        if len(parts) >= 4:
            cfg["classes"] = [p.strip() for p in parts[1:-2] if p.strip()]
            cfg["label_mode"] = parts[-2].strip().lower()
            cfg["framework"] = parts[-1].strip().lower()
        elif len(parts) == 3:
            cfg["classes"] = [p.strip() for p in parts[1].split() if p.strip()]
            cfg["label_mode"] = parts[2].strip().lower() if parts[2].strip().lower() in ("manual", "auto", "semi-auto") else "auto"
            cfg["framework"] = "pytorch"
        else:
            cfg["classes"] = [p.strip() for p in parts[1:] if p.strip()] if len(parts) > 1 else ["object"]
            cfg["label_mode"] = "auto"
            cfg["framework"] = "pytorch"
        next_phase = "review"

    elif phase == "review":
        if user_input.lower() in ("confirm", "yes", "proceed", "ok", "go", "y", "looks good",
                                    "lgtm", "approved", "approve"):
            next_phase = "create_project"
            session.status = "executing"
        else:
            # User wants to change something — stay in review
            _add_step(session.id, "review", "agent",
                      "No problem at all! Just tell me what needs changing — for example, "
                      "*\"change company to Reliance\"* or *\"update the camera location to Floor 2\"*.\n\n"
                      "Once you're happy with everything, just say **confirm** and we'll get building! 🛠️",
                      "question", status="awaiting_input")
            session.set_config(cfg)
            db.session.commit()
            return success(session.to_dict(include_steps=True))
    else:
        next_phase = phase

    session.set_config(cfg)
    session.current_phase = next_phase

    # ── If entering execution phases, run them ──────────────────────────
    if next_phase.startswith("create_") or next_phase in ("upload_images", "label_images",
                                                           "start_training", "completed"):
        db.session.commit()
        return _run_execution_phases(session)

    # ── Otherwise, ask next question ────────────────────────────────────
    if next_phase == "review":
        review_text = _generate_review(cfg)
        _add_step(session.id, "review", "agent", review_text, "review", status="awaiting_input")
    elif next_phase in PHASE_QUESTIONS:
        q = PHASE_QUESTIONS[next_phase]
        _add_step(session.id, next_phase, "agent", q["message"], "question",
                  metadata={"fields": q.get("fields", [q.get("field", "")]),
                            "type": q["type"],
                            "placeholder": q.get("placeholder", "")},
                  status="awaiting_input")

    db.session.commit()
    return success(session.to_dict(include_steps=True))


def _run_execution_phases(session: AgentSession):
    """Execute all creation steps in sequence, creating snapshots along the way."""
    cfg = session.get_config()
    execution_steps = [
        ("create_project", "Alright, creating your project now...", _execute_create_project),
        ("create_use_case", "Setting up the use case...", _execute_create_use_case),
        ("create_dataset", "Building the dataset with your classes...", _execute_create_dataset),
        ("create_camera", "Registering the camera feed...", _execute_create_camera),
        ("create_edge_device", "Adding the edge device...", _execute_create_edge_device),
        ("create_db_config", "Wiring up the database connection...", _execute_create_db_config),
        ("create_llm_config", "Connecting the language model...", _execute_create_llm_config),
    ]

    results = {}
    errors_list = []

    for phase_name, msg, executor in execution_steps:
        _add_step(session.id, phase_name, "agent", msg, "action", status="completed")
        try:
            result = executor(session)
            results[phase_name] = result

            # Build success message with link
            if phase_name == "create_project":
                pid = session.project_id
                detail = f"Done! Your project is live — **#{pid}**. " \
                         f"You can see it in the [Projects page →](/projects).\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "project", "id": pid,
                                    "link": "/projects"})

            elif phase_name == "create_use_case":
                ucid = session.use_case_id
                detail = f"Use case created — **#{ucid}**. " \
                         f"Check it out under [Use Cases →](/projects/{session.project_id}/use-cases).\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "use_case", "id": ucid,
                                    "link": f"/projects/{session.project_id}/use-cases"})

            elif phase_name == "create_dataset":
                dsid = session.dataset_id
                detail = f"Dataset **#{dsid}** is ready for images! " \
                         f"Head over to the [Labeling Platform →](/labeling) to start uploading.\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "dataset", "id": dsid,
                                    "link": "/labeling"})

            elif phase_name == "create_camera":
                detail = f"Camera is registered and ready to go. " \
                         f"View it in [Cameras →](/configuration/cameras).\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "camera", "link": "/configuration/cameras"})

            elif phase_name == "create_edge_device":
                detail = f"Edge device is registered. " \
                         f"You can manage it from [Edge Devices →](/configuration/edge-devices).\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "edge_device", "link": "/configuration/edge-devices"})

            elif phase_name == "create_db_config":
                detail = f"Database config saved and connected. " \
                         f"See it in [Databases →](/configuration/databases).\n\n" \
                         f"```json\n{json.dumps(result, indent=2)}\n```"
                _add_step(session.id, phase_name, "system", detail, "result",
                          metadata={"entity": "db_config", "link": "/configuration/databases"})

            elif phase_name == "create_llm_config":
                if result.get("skipped"):
                    _add_step(session.id, phase_name, "system",
                              "Skipped LLM setup for now — you can always configure one later from Configuration → LLMs.",
                              "result")
                else:
                    detail = f"LLM is configured and ready for analysis. " \
                             f"Manage it from [LLM Configs →](/configuration/llms).\n\n" \
                             f"```json\n{json.dumps(result, indent=2)}\n```"
                    _add_step(session.id, phase_name, "system", detail, "result",
                              metadata={"entity": "llm_config", "link": "/configuration/llms"})

        except Exception as exc:
            logger.error("Agent execution error in %s: %s", phase_name, exc)
            _add_step(session.id, phase_name, "system",
                      f"❌ **Error in {phase_name}:** {str(exc)}\n\n"
                      f"```\n{traceback.format_exc()}\n```",
                      "error", status="error")
            errors_list.append(phase_name)

    # ── Final summary ──────────────────────────────────────────────────
    session.current_phase = "completed"

    if errors_list:
        session.status = "completed_with_errors"
        summary = (
            f"## Heads up — a few things didn't go as planned ⚠️\n\n"
            f"Most of the setup went smoothly, but these steps ran into issues: **{', '.join(errors_list)}**.\n\n"
            f"Don't worry — you can check the error details above and I can help you debug them. Just describe what went wrong and I'll take a look."
        )
    else:
        session.status = "completed"
        cfg = session.get_config()
        project_name = cfg.get('project_name', 'Your project')
        summary_parts = [
            f"## That's a wrap — **{project_name}** is fully set up! 🎉\n",
            f"Everything has been created and configured. Here's what's live:\n",
            f"- Project **#{session.project_id}** — your central workspace",
            f"- Use Case **#{session.use_case_id}** — detection pipeline defined",
            f"- Dataset **#{session.dataset_id}** — ready for images",
            f"- Camera — connected and streaming",
            f"- Edge Device — registered for inference",
            f"- Database — wired up for detection storage",
            f"- LLM — {'configured for analysis' if cfg.get('llm_provider', 'skip') != 'skip' else 'skipped (add later from settings)'}",
            "",
            "### What's next?",
            "",
            f"The logical next steps would be:",
            f"1. **Upload some images** — you can do it right here using the upload button below, or head to the [Labeling Platform](/labeling)",
            f"2. **Label your data** — {'I can auto-label them for you' if cfg.get('label_mode') == 'auto' else 'manual labeling through the platform'}",
            f"3. **Train a model** — kick off training from [Model Development](/model-development)",
            f"4. **Deploy & monitor** — push to edge from [Model Deployment](/model-deployment)",
            "",
            f"Or you can jump into the [Workflow Builder](/projects/{session.project_id}/use-cases/{session.use_case_id}/workflows) to wire it all together visually.",
            "",
            "Feel free to ask me anything — upload images, start training, or just ask a question. I'm here to help! 💬",
        ]
        summary = "\n".join(summary_parts)

    _add_step(session.id, "completed", "agent", summary, "result",
              metadata={"projectId": session.project_id,
                        "useCaseId": session.use_case_id,
                        "datasetId": session.dataset_id})

    db.session.commit()
    return success(session.to_dict(include_steps=True))


@agent_bp.post("/sessions/<int:session_id>/upload-images")
def upload_images(session_id):
    """Upload images into the session's dataset."""
    session = db.get_or_404(AgentSession, session_id)

    if not session.dataset_id:
        return error("No dataset created yet for this session", 400)

    files = request.files.getlist("files")
    if not files:
        return error("No files provided", 400)

    from app.models import LabelImage, LabelDataset
    ds = db.get_or_404(LabelDataset, session.dataset_id)

    folder = os.path.join(current_app.config.get("LABEL_IMAGES_FOLDER", "uploads/label_images"),
                          str(session.dataset_id))
    os.makedirs(folder, exist_ok=True)

    saved = []
    for f in files:
        if not f.filename:
            continue
        import uuid
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else "jpg"
        safe_name = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(folder, safe_name)
        f.save(filepath)

        # Read dimensions
        width, height = 0, 0
        try:
            from PIL import Image as PILImage
            with PILImage.open(filepath) as pil:
                width, height = pil.size
        except Exception:
            pass

        img = LabelImage(
            dataset_id=session.dataset_id,
            filename=safe_name,
            original_name=f.filename,
            width=width,
            height=height,
            status="unlabeled",
        )
        db.session.add(img)
        saved.append(safe_name)

    # Update dataset counts
    ds.total_images = (ds.total_images or 0) + len(saved)
    db.session.flush()

    # Add step with image info
    _add_step(session.id, "upload_images", "system",
              f"Got it — **{len(saved)} image{'s' if len(saved) != 1 else ''}** uploaded to dataset #{session.dataset_id}. "
              f"You can review them in the [Labeling Platform](/labeling).\n\n"
              f"Files: {', '.join(saved[:5])}{'...' if len(saved) > 5 else ''}",
              "result",
              metadata={"count": len(saved), "datasetId": session.dataset_id,
                        "files": saved[:10],
                        "link": "/labeling"})

    db.session.commit()
    return success({
        "uploaded": len(saved),
        "datasetId": session.dataset_id,
        "files": saved[:10],
    }, message=f"{len(saved)} image(s) uploaded")


@agent_bp.get("/sessions/<int:session_id>/snapshots")
def get_snapshots(session_id):
    """Return all snapshot steps for this session."""
    session = db.get_or_404(AgentSession, session_id)
    snapshots = AgentStep.query.filter_by(
        session_id=session_id,
        step_type="snapshot"
    ).order_by(AgentStep.step_order).all()
    return success([s.to_dict() for s in snapshots])


@agent_bp.post("/sessions/<int:session_id>/auto-label")
def trigger_auto_label(session_id):
    """Trigger auto-labeling for the session's dataset."""
    session = db.get_or_404(AgentSession, session_id)
    if not session.dataset_id:
        return error("No dataset created yet", 400)

    body = request.get_json(silent=True) or {}
    model_path = body.get("model_path", "yolov8n.pt")
    confidence = body.get("confidence", 0.25)

    from app.services.auto_labeler import auto_label_dataset
    try:
        result = auto_label_dataset(session.dataset_id, model_path, confidence)
        _add_step(session.id, "label_images", "system",
                  f"Auto-labeling is done! Processed **{result.get('processed', 0)} images** "
                  f"and created **{result.get('annotations', 0)} annotations**.\n\n"
                  f"You should review the labels to make sure they look good — "
                  f"head to [Label Review](/label-review) to check them out.",
                  "result",
                  metadata={"link": "/label-review", **result})
        db.session.commit()
        return success(result, message="Auto-labeling triggered")
    except Exception as exc:
        _add_step(session.id, "label_images", "system",
                  f"❌ Auto-labeling error: {str(exc)}",
                  "error", status="error")
        db.session.commit()
        return error(str(exc), 500)


@agent_bp.post("/sessions/<int:session_id>/start-training")
def start_training(session_id):
    """Start training on the session's dataset."""
    session = db.get_or_404(AgentSession, session_id)
    if not session.dataset_id:
        return error("No dataset created yet", 400)

    body = request.get_json(silent=True) or {}
    cfg = session.get_config()
    framework = body.get("framework", cfg.get("framework", "pytorch"))
    epochs = body.get("epochs", 3)

    from app.models import TrainingJob, LabelDataset
    ds = db.get_or_404(LabelDataset, session.dataset_id)

    jobs_started = []

    if framework in ("pytorch", "both"):
        job = TrainingJob(
            dataset_id=session.dataset_id,
            model_type="yolov8n",
            epochs=epochs,
            batch_size=8,
            img_size=640,
            device="cpu",
            status="queued",
        )
        db.session.add(job)
        db.session.flush()
        jobs_started.append(("PyTorch/YOLO", job.id))

        # Start YOLO training in background
        try:
            from app.services.yolo_trainer import start_yolo_training
            start_yolo_training(job.id)
        except Exception as exc:
            logger.error("YOLO training start error: %s", exc)

    if framework in ("tensorflow", "both"):
        job = TrainingJob(
            dataset_id=session.dataset_id,
            model_type="tf_mobilenetv2",
            epochs=epochs,
            batch_size=8,
            img_size=224,
            device="cpu",
            status="queued",
        )
        db.session.add(job)
        db.session.flush()
        jobs_started.append(("TensorFlow", job.id))

        try:
            from app.services.tf_trainer import start_tf_training
            start_tf_training(job.id)
        except Exception as exc:
            logger.error("TF training start error: %s", exc)

    if jobs_started:
        session.training_job_id = jobs_started[0][1]

    details = "\n".join([f"- **{name}** — Job #{jid}" for name, jid in jobs_started])
    _add_step(session.id, "start_training", "system",
              f"Training is underway! Here's what I kicked off:\n\n{details}\n\n"
              f"You can monitor progress in real-time from [Model Development](/model-development). "
              f"I'd suggest grabbing a coffee ☕ — depending on your dataset size, this could take a few minutes.",
              "result",
              metadata={"jobs": [{"name": n, "id": j} for n, j in jobs_started],
                        "link": "/model-development"})

    db.session.commit()
    return success({"jobs": [{"name": n, "id": j} for n, j in jobs_started]},
                   message="Training started")
