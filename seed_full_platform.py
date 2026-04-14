"""
Full-platform seed script.
Creates: project, use-case, camera, edge-device, model-config, log-config,
         db-config, llm-config, model-deployment, alerts, benchmark run,
         experiment, and wires everything together.

Run AFTER seed_test_data.py (which creates dataset id=1 and training job id=1).

    .venv\\Scripts\\python seed_full_platform.py
"""
import json, sys, time
import requests

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:5000/api"


def post(path, **kw):
    r = requests.post(f"{BASE}{path}", **kw)
    try:
        r.raise_for_status()
    except Exception:
        print(f"  ERROR {r.status_code} on POST {path}: {r.text[:300]}")
        raise
    return r.json().get("data", r.json())


def get(path, **kw):
    r = requests.get(f"{BASE}{path}", **kw)
    r.raise_for_status()
    return r.json().get("data", r.json())


def put(path, **kw):
    r = requests.put(f"{BASE}{path}", **kw)
    r.raise_for_status()
    return r.json().get("data", r.json())


def delete(path, **kw):
    r = requests.delete(f"{BASE}{path}", **kw)
    return r.status_code


# ──────────────────────────────────────────────────────────────────────────────
print("\n=== Computer Vision Platform — Full Platform Seeder ===\n")

# ── 1. Project ────────────────────────────────────────────────────────────────
print("1. Creating project …")
project = post("/projects/", json={
    "name": "Industrial Safety AI — Demo Project",
    "description": "End-to-end demo covering PPE detection, zone violation monitoring and anomaly detection on the factory floor.",
    "status": "active",
    "biz_company": "LTIMindtree",
    "biz_unit": "Manufacturing Unit 1",
    "biz_product": "Safety Vision Line",
    "geo_country": "India",
    "geo_state": "Maharashtra",
    "geo_city": "Pune",
    "geo_site": "Hinjewadi Plant A",
})
proj_id = project["id"]
print(f"   Project id={proj_id}  name='{project['name']}'")

# ── 2. Use-cases ──────────────────────────────────────────────────────────────
print("\n2. Creating use-cases …")
use_cases = []
for uc in [
    {
        "name": "PPE Compliance Detection",
        "description": "Detects whether workers are wearing mandatory PPE (helmet, vest, gloves).",
        "type": "safety",
        "status": "active",
    },
    {
        "name": "Restricted Zone Monitoring",
        "description": "Triggers alerts when unauthorized personnel enter hazardous zones.",
        "type": "safety",
        "status": "active",
    },
    {
        "name": "Anomaly & Fall Detection",
        "description": "Identifies unusual postures or falls on the factory floor.",
        "type": "safety",
        "status": "development",
    },
]:
    uc_data = post(f"/projects/{proj_id}/use-cases", json=uc)
    use_cases.append(uc_data)
    print(f"   Use-case id={uc_data['id']}  '{uc_data['name']}'")

# ── 3. Cameras ────────────────────────────────────────────────────────────────
print("\n3. Creating cameras …")
cameras = []
for cam in [
    {"name": "Floor-Cam-A1", "rtsp_url": "rtsp://192.168.1.101:554/stream", "ip_address": "192.168.1.101",
     "location": "Assembly Line A", "camera_type": "ip", "status": "active", "fps": 25, "resolution": "1920x1080"},
    {"name": "Floor-Cam-B2", "rtsp_url": "rtsp://192.168.1.102:554/stream", "ip_address": "192.168.1.102",
     "location": "Packaging Zone B", "camera_type": "ip", "status": "active", "fps": 30, "resolution": "1280x720"},
    {"name": "Entry-Cam-C1", "rtsp_url": "rtsp://192.168.1.103:554/stream", "ip_address": "192.168.1.103",
     "location": "Main Entry Gate", "camera_type": "ptz", "status": "active", "fps": 15, "resolution": "1920x1080"},
    {"name": "Warehouse-Cam-D1", "rtsp_url": "rtsp://192.168.1.104:554/stream", "ip_address": "192.168.1.104",
     "location": "Warehouse Section D", "camera_type": "fisheye", "status": "inactive", "fps": 20, "resolution": "3840x2160"},
]:
    c = post("/cameras/", json=cam)
    cameras.append(c)
    print(f"   Camera id={c['id']}  '{c['name']}'")

# ── 4. Edge Devices ───────────────────────────────────────────────────────────
print("\n4. Creating edge devices …")
edge_devices = []
for ed in [
    {"name": "Jetson-Nano-01",  "ip_address": "192.168.1.201", "device_type": "jetson_nano",  "status": "online",  "location": "Assembly Line A"},
    {"name": "Jetson-AGX-02",   "ip_address": "192.168.1.202", "device_type": "jetson_agx",   "status": "online",  "location": "Packaging Zone B"},
    {"name": "RaspberryPi-03",  "ip_address": "192.168.1.203", "device_type": "raspberry_pi", "status": "offline", "location": "Main Entry Gate"},
]:
    e = post("/edge-devices/", json=ed)
    edge_devices.append(e)
    print(f"   Edge Device id={e['id']}  '{e['name']}'")

# ── 5. Model Configs ──────────────────────────────────────────────────────────
print("\n5. Creating model configs …")
model_configs = []
for mc in [
    {"name": "YOLOv8n-PPE",        "model_type": "yolov8n", "framework": "pytorch",     "version": "1.0.0",
     "description": "Nano YOLOv8 for real-time PPE detection",          "status": "active"},
    {"name": "YOLOv8s-ZoneGuard",  "model_type": "yolov8s", "framework": "pytorch",     "version": "1.0.0",
     "description": "Small YOLOv8 for restricted zone monitoring",       "status": "active"},
    {"name": "TFLite-AnomalyDet",  "model_type": "custom",  "framework": "tensorflow",  "version": "0.9.0",
     "description": "Lightweight TFLite model for fall/anomaly detection","status": "testing"},
]:
    m = post("/config/models/", json=mc)
    model_configs.append(m)
    print(f"   Model Config id={m['id']}  '{m['name']}'")

# ── 6. Log Configs ────────────────────────────────────────────────────────────
print("\n6. Creating log configs …")
for lc in [
    {"category": "Application Logs",  "log_level": "info",    "retention": "30 days", "max_size": "1 GB",   "rotation": "Daily"},
    {"category": "Debug Logs",        "log_level": "debug",   "retention": "7 days",  "max_size": "500 MB", "rotation": "Hourly"},
    {"category": "Security Audit",    "log_level": "warning", "retention": "90 days", "max_size": "2 GB",   "rotation": "Weekly"},
]:
    l = post("/config/logs/", json=lc)
    print(f"   Log Config id={l['id']}  '{l['category']}'")

# ── 7. DB Configs ─────────────────────────────────────────────────────────────
print("\n7. Creating DB configs …")
for dc in [
    {"name": "Primary MySQL",      "db_type": "mysql",      "host": "localhost",    "port": 3306, "db_name": "vision_platform_db", "username": "root",    "status": "connected"},
    {"name": "Analytics Postgres", "db_type": "postgresql", "host": "192.168.1.50", "port": 5432, "db_name": "analytics_db",        "username": "analyst", "status": "disconnected"},
]:
    d = post("/config/databases/", json=dc)
    print(f"   DB Config id={d['id']}  '{d['name']}'")

# ── 8. LLM Configs ────────────────────────────────────────────────────────────
print("\n8. Creating LLM configs …")
for llm in [
    {"name": "GPT-4o Vision",      "provider": "openai",    "llm_type": "multimodal",  "endpoint": "https://api.openai.com/v1",       "description": "OpenAI GPT-4o for vision analytics",    "status": "configured"},
    {"name": "Claude 3 Sonnet",    "provider": "anthropic", "llm_type": "chat",        "endpoint": "https://api.anthropic.com",       "description": "Anthropic Claude 3 for analysis",       "status": "available"},
    {"name": "Ollama LLaVA Local", "provider": "ollama",    "llm_type": "multimodal",  "endpoint": "http://localhost:11434",          "description": "Local LLaVA 13B for offline inference", "status": "available"},
]:
    lm = post("/config/llms/", json=llm)
    print(f"   LLM Config id={lm['id']}  '{lm['name']}'")

# ── 9. Experiments ────────────────────────────────────────────────────────────
print("\n9. Creating experiments …")
for ex in [
    {"name": "PPE Baseline v1",    "dataset": "Test Dataset 100", "status": "completed", "epoch_current": 50, "epoch_total": 50,  "accuracy": "94.3%", "loss": "0.0821"},
    {"name": "ZoneGuard Exp v1",  "dataset": "Test Dataset 100", "status": "training",  "epoch_current": 23, "epoch_total": 100, "accuracy": "88.1%", "loss": "0.1432"},
    {"name": "Augmented Retrain", "dataset": "Test Dataset 100", "status": "pending",   "epoch_current": 0,  "epoch_total": 75,  "accuracy": "-",     "loss": "-"},
]:
    payload = {k: v for k, v in ex.items() if v is not None}
    e = post("/experiments/", json=payload)
    print(f"   Experiment id={e['id']}  '{e['name']}'")

# ── 10. Model Deployments ─────────────────────────────────────────────────────
print("\n10. Creating model deployments …")
deployments = []
for dep in [
    {"model": "YOLOv8n-PPE v1.0",       "stations": ["Station A-01", "Station A-02", "Station A-03"], "status": "running", "fps": 24, "latency": "41ms",  "uptime": "99.2%", "detections": "14,382"},
    {"model": "YOLOv8s-ZoneGuard v1.0", "stations": ["Station B-01", "Station B-02"],                 "status": "running", "fps": 18, "latency": "55ms",  "uptime": "97.8%", "detections": "6,201"},
    {"model": "TFLite-AnomalyDet v0.9", "stations": ["Station C-01"],                                  "status": "stopped", "fps": 0,  "latency": "-",     "uptime": "0%",    "detections": "0"},
]:
    dp = post("/model-deployments/", json=dep)
    deployments.append(dp)
    print(f"   Deployment id={dp['id']}  '{dp['model']}'  status={dp['status']}")

# ── 11. Detection Events + Alerts ─────────────────────────────────────────────
print("\n11. Creating detection events and alerts …")
# Create cameras list for reference
cam_id = cameras[0]["id"] if cameras else 1

for i, alert_data in enumerate([
    {"camera_id": cam_id, "alert_type": "PPE Violation — No Helmet",    "status": "unresolved",   "confidence": 0.92, "location": "Assembly Line A", "message": "Worker detected without helmet at Station A-01"},
    {"camera_id": cam_id, "alert_type": "Restricted Zone Breach",       "status": "acknowledged", "confidence": 0.88, "location": "Packaging Zone B", "message": "Unauthorized person entered restricted zone B-02"},
    {"camera_id": cam_id, "alert_type": "PPE Violation — No Safety Vest","status": "unresolved",  "confidence": 0.85, "location": "Assembly Line A", "message": "Worker missing safety vest near conveyor belt"},
    {"camera_id": cam_id, "alert_type": "Fall Detection Warning",        "status": "resolved",     "confidence": 0.79, "location": "Warehouse D",     "message": "Possible fall detected — manually verified as false positive"},
    {"camera_id": cam_id, "alert_type": "Critical — Multiple PPE Failures","status": "unresolved", "confidence": 0.96, "location": "Entry Gate C",    "message": "3 workers simultaneously without PPE at entry checkpoint"},
    {"camera_id": cam_id, "alert_type": "Zone Hazard — Forklift Proximity","status": "acknowledged","confidence": 0.91, "location": "Warehouse D",   "message": "Worker in forklift operating zone without clearance"},
    {"camera_id": cam_id, "alert_type": "PPE Violation — No Gloves",    "status": "resolved",     "confidence": 0.83, "location": "Packaging Zone B", "message": "Chemical handling area — worker without gloves"},
    {"camera_id": cam_id, "alert_type": "Emergency — Unauthorized Access","status": "unresolved", "confidence": 0.97, "location": "Server Room",     "message": "Unauthorized person detected in server room"},
]):
    a = post("/alerts/", json=alert_data)
    print(f"   Alert id={a['id']}  '{a['alert_type']}'  [{a['status']}]")

print("\n=== Full Platform Seed Complete! ===")
print(f"  Project        : id={proj_id}")
print(f"  Use-cases      : {len(use_cases)}")
print(f"  Cameras        : {len(cameras)}")
print(f"  Edge Devices   : {len(edge_devices)}")
print(f"  Model Configs  : {len(model_configs)}")
print(f"  Deployments    : {len(deployments)}")
print(f"  Alerts         : 8")
print(f"\n  Frontend: http://localhost:5173")
print(f"  Backend:  http://localhost:5000")
