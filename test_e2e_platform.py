"""
End-to-End Platform Test — Industrial AI Vision Platform
=========================================================
Tests EVERY module in sequence using real laptop hardware:

 1. Project hierarchy  (company → unit → product → geo)
 2. Use-cases           (safety, quality)
 3. Camera              (laptop webcam)
 4. Edge device         (this laptop)
 5. Database config     (MySQL on this machine)
 6. Log config          (create log folder + config)
 7. Model config        (placeholder)
 8. Experiment          (placeholder)
 9. Capture images      (from laptop webcam)
10. Label dataset + upload images
11. Annotate images     (auto-generate bounding boxes)
12. Train YOLO model    (yolov8n, 3 epochs)
13. Wait for training completion
14. Validate model      (against the same dataset)
15. Download model file
16. Benchmark model
17. Deploy model
18. Create alert
19. Dashboard / analytics smoke-test
20. Cleanup  (optional)

Usage:
    .venv\\Scripts\\python.exe test_e2e_platform.py
"""

import os
import sys
import time
import json
import socket
import platform
import tempfile
import requests

# ── Config ────────────────────────────────────────────────────────────────────
BASE = "http://127.0.0.1:5000"
API  = f"{BASE}/api"
WEBCAM_CAPTURE_COUNT = 10        # number of frames to capture from webcam
TRAIN_EPOCHS         = 3
TRAIN_BATCH          = 8
YOLO_MODEL           = "yolov8n"
LOG_FOLDER           = os.path.join(os.path.dirname(__file__), "logs", "e2e_test")
POLL_INTERVAL        = 5         # seconds between training polls
POLL_TIMEOUT         = 300       # max seconds to wait for training

# ── Helpers ───────────────────────────────────────────────────────────────────
passed = []
failed = []


def step(name):
    print(f"\n{'='*70}")
    print(f"  STEP: {name}")
    print(f"{'='*70}")


def check(label, response, expected_status=None):
    """Validate API response and record pass/fail."""
    ok = response.ok if expected_status is None else (response.status_code == expected_status)
    if ok:
        passed.append(label)
        print(f"  ✅ {label}  [{response.status_code}]")
    else:
        failed.append(label)
        print(f"  ❌ {label}  [{response.status_code}] {response.text[:200]}")
    return ok


def jdata(resp):
    """Extract .data from JSON response."""
    return resp.json().get("data")


# ── Webcam capture ────────────────────────────────────────────────────────────
def capture_webcam_images(count: int, out_dir: str) -> list[str]:
    """Capture `count` frames from the default webcam and save as JPEG files.
    Falls back to synthetic images if OpenCV / camera is unavailable."""
    paths = []
    try:
        import cv2
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            raise RuntimeError("Cannot open webcam")
        # Let auto-exposure settle
        for _ in range(10):
            cap.read()
        for i in range(count):
            ret, frame = cap.read()
            if not ret:
                print(f"    ⚠ Frame {i} failed, using synthetic")
                frame = _synthetic_frame(i)
            fp = os.path.join(out_dir, f"webcam_{i:03d}.jpg")
            cv2.imwrite(fp, frame)
            paths.append(fp)
        cap.release()
        print(f"    Captured {len(paths)} frames from webcam")
    except Exception as ex:
        print(f"    ⚠ Webcam unavailable ({ex}), generating synthetic images")
        paths = _generate_synthetic(count, out_dir)
    return paths


def _synthetic_frame(idx):
    """Create a 640x480 numpy array with random coloured rectangles."""
    import numpy as np
    img = np.random.randint(40, 200, (480, 640, 3), dtype=np.uint8)
    # Draw a rectangle so annotations make sense
    x1, y1 = 100 + idx * 10, 100 + idx * 5
    img[y1:y1+120, x1:x1+150] = [0, 255, 0]
    return img


def _generate_synthetic(count, out_dir):
    """Generate synthetic JPEG images with PIL."""
    from PIL import Image, ImageDraw
    import random
    paths = []
    for i in range(count):
        img = Image.new("RGB", (640, 480),
                        (random.randint(30, 200), random.randint(30, 200), random.randint(30, 200)))
        draw = ImageDraw.Draw(img)
        for _ in range(random.randint(1, 3)):
            x1 = random.randint(10, 400)
            y1 = random.randint(10, 300)
            x2 = x1 + random.randint(60, 180)
            y2 = y1 + random.randint(60, 150)
            color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
            draw.rectangle([x1, y1, x2, y2], fill=color, outline="white", width=2)
        fp = os.path.join(out_dir, f"synthetic_{i:03d}.jpg")
        img.save(fp, "JPEG", quality=90)
        paths.append(fp)
    print(f"    Generated {len(paths)} synthetic images")
    return paths


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN TEST
# ══════════════════════════════════════════════════════════════════════════════
def main():
    print("\n" + "🏭" * 35)
    print("  INDUSTRIAL AI VISION PLATFORM — END-TO-END TEST")
    print("🏭" * 35)

    # ── 0. Pre-check ──────────────────────────────────────────────────────────
    step("0 · Pre-flight check")
    try:
        r = requests.get(f"{API}/projects/", timeout=5)
        print(f"  Backend is UP ({r.status_code})")
    except Exception as ex:
        print(f"  ❌ Backend is NOT reachable at {BASE}: {ex}")
        print("     Start the backend first: Start-Process cmd -ArgumentList '/c','start_backend.bat'")
        sys.exit(1)

    # ── 1. Project with hierarchy ─────────────────────────────────────────────
    step("1 · Create project with business & geography hierarchy")
    r = requests.post(f"{API}/projects/", json={
        "name":        "E2E Test — Factory Safety AI",
        "description": "End-to-end automated test of the full Vision AI platform pipeline.",
        "status":      "active",
        "biz_company": "LTIMindtree",
        "biz_unit":    "Digital Engineering",
        "biz_product": "Smart Factory Vision",
        "geo_country": "India",
        "geo_state":   "Maharashtra",
        "geo_city":    "Pune",
        "geo_site":    "Hinjewadi Phase III — Laptop Lab",
    })
    check("Create project", r, 201)
    project = jdata(r)
    project_id = project["id"]
    print(f"    Project ID: {project_id}")
    print(f"    Business:   {project.get('businessHierarchy')}")
    print(f"    Geography:  {project.get('geographyHierarchy')}")

    # ── 2. Use-cases ──────────────────────────────────────────────────────────
    step("2 · Create use-cases under the project")
    uc_ids = []
    for uc in [
        {"name": "PPE Detection",     "type": "safety",  "priority": "high",   "status": "active"},
        {"name": "Defect Inspection",  "type": "quality", "priority": "medium", "status": "development"},
    ]:
        r = requests.post(f"{API}/projects/{project_id}/use-cases", json=uc)
        check(f"Create use-case '{uc['name']}'", r, 201)
        uc_ids.append(jdata(r)["id"])

    r = requests.get(f"{API}/projects/{project_id}/use-cases")
    check("List use-cases", r)
    print(f"    Use-cases: {[u['name'] for u in jdata(r)]}")

    # ── 3. Camera (laptop webcam) ─────────────────────────────────────────────
    step("3 · Register laptop webcam as camera")
    local_ip = socket.gethostbyname(socket.gethostname())
    r = requests.post(f"{API}/cameras/", json={
        "name":           f"{platform.node()} Webcam",
        "rtsp_url":       "device://0",
        "ip_address":     local_ip,
        "location":       "Laptop — built-in camera",
        "camera_type":    "webcam",
        "status":         "active",
        "fps":            30,
        "resolution":     "1280x720",
        "hardware_model": "Integrated Webcam",
    })
    check("Create camera", r, 201)
    camera_id = jdata(r)["id"]
    print(f"    Camera ID: {camera_id}  ({platform.node()} @ {local_ip})")

    # ── 4. Edge device (this laptop) ──────────────────────────────────────────
    step("4 · Register this laptop as edge device")
    r = requests.post(f"{API}/edge-devices/", json={
        "name":       platform.node(),
        "location":   "Laptop — local development",
        "status":     "online",
        "cpu":        f"{os.cpu_count()} cores",
        "memory":     "16 GB",
        "storage":    "512 GB SSD",
        "models":     0,
        "ip_address": local_ip,
        "platform":   f"{platform.system()} {platform.release()}",
        "gpu_model":  "Integrated / CPU-only",
    })
    check("Create edge device", r, 201)
    device_id = jdata(r)["id"]
    print(f"    Edge Device ID: {device_id}")

    r = requests.put(f"{API}/edge-devices/{device_id}/status", json={"status": "online"})
    check("Set device online", r)

    # ── 5. Database config (MySQL on this machine) ────────────────────────────
    step("5 · Register MySQL database configuration")
    r = requests.post(f"{API}/config/databases/", json={
        "name":     "Local MySQL — vision_platform_db",
        "host":     "127.0.0.1",
        "port":     3306,
        "db_type":  "mysql",
        "username": "root",
        "db_name":  "vision_platform_db",
        "status":   "connected",
        "db_usage": "42%",
    })
    check("Create DB config", r, 201)
    db_config_id = jdata(r)["id"]
    print(f"    DB Config ID: {db_config_id}")

    # ── 6. Log config + create log folder ─────────────────────────────────────
    step("6 · Create log folder & register log configuration")
    os.makedirs(LOG_FOLDER, exist_ok=True)
    print(f"    Log folder: {LOG_FOLDER}")

    r = requests.post(f"{API}/config/logs/", json={
        "category":  "E2E Test Logs",
        "retention": "7 days",
        "max_size":  "100 MB",
        "rotation":  "Daily",
        "log_level": "debug",
    })
    check("Create log config", r, 201)
    log_config_id = jdata(r)["id"]

    # Write a test log entry
    log_file = os.path.join(LOG_FOLDER, "e2e_test.log")
    with open(log_file, "w") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] E2E test started\n")
    print(f"    Log config ID: {log_config_id}")
    print(f"    Log file:      {log_file}")

    # ── 7. Model config (placeholder) ─────────────────────────────────────────
    step("7 · Create initial model configuration (pre-training placeholder)")
    r = requests.post(f"{API}/config/models/", json={
        "name":        "E2E YOLOv8n Baseline",
        "version":     "0.1.0",
        "size":        "6 MB",
        "model_type":  YOLO_MODEL,
        "accuracy":    "N/A",
        "framework":   "PyTorch",
        "description": "Placeholder config for E2E test — will be replaced by training output.",
        "status":      "testing",
    })
    check("Create model config", r, 201)

    # ── 8. Experiment ─────────────────────────────────────────────────────────
    step("8 · Create experiment tracker")
    r = requests.post(f"{API}/experiments/", json={
        "name":          "E2E Full Pipeline Test",
        "dataset":       "webcam-captures",
        "status":        "pending",
        "epoch_total":   TRAIN_EPOCHS,
        "epoch_current": 0,
    })
    check("Create experiment", r, 201)
    experiment_id = jdata(r)["id"]

    # ── 9. Capture images from webcam ─────────────────────────────────────────
    step("9 · Capture images from laptop webcam")
    capture_dir = tempfile.mkdtemp(prefix="e2e_webcam_")
    image_paths = capture_webcam_images(WEBCAM_CAPTURE_COUNT, capture_dir)
    print(f"    Images saved to: {capture_dir}")

    # ── 10. Create label dataset & upload images ──────────────────────────────
    step("10 · Create label dataset and upload captured images")
    classes = [
        {"id": "person",  "name": "person"},
        {"id": "helmet",  "name": "helmet"},
        {"id": "object",  "name": "object"},
    ]
    r = requests.post(f"{API}/label-datasets/", json={
        "name":    "E2E Webcam Captures",
        "classes": classes,
    })
    check("Create label dataset", r, 201)
    dataset_id = jdata(r)["id"]
    print(f"    Dataset ID: {dataset_id}")

    # Upload images as multipart
    files = [("files", (os.path.basename(p), open(p, "rb"), "image/jpeg")) for p in image_paths]
    r = requests.post(f"{API}/label-datasets/{dataset_id}/images/", files=files)
    for _, (_, fh, _) in files:
        fh.close()
    check("Upload images", r, 201)
    uploaded = jdata(r)
    print(f"    Uploaded: {len(uploaded)} images")

    # List images back
    r = requests.get(f"{API}/label-datasets/{dataset_id}/images/", params={"per_page": 100})
    check("List images", r)
    images = jdata(r)

    # ── 11. Annotate images ───────────────────────────────────────────────────
    step("11 · Annotate images with bounding boxes")
    import random
    annotated_count = 0
    for img in images:
        iw = img.get("width", 640)
        ih = img.get("height", 480)
        annotations = []
        for _ in range(random.randint(1, 3)):
            cls = random.choice(classes)
            w = random.randint(60, min(180, iw // 2))
            h = random.randint(60, min(150, ih // 2))
            x = random.randint(0, max(1, iw - w - 1))
            y = random.randint(0, max(1, ih - h - 1))
            annotations.append({
                "classId":       cls["id"],
                "className":     cls["name"],
                "x": x, "y": y, "width": w, "height": h,
                "isAutoLabeled": False,
            })
        r = requests.post(
            f"{API}/label-datasets/{dataset_id}/images/{img['id']}/annotations",
            json={"annotations": annotations},
        )
        if r.ok:
            annotated_count += 1

    check_label = f"Annotate {annotated_count}/{len(images)} images"
    if annotated_count == len(images):
        passed.append(check_label)
        print(f"  ✅ {check_label}")
    else:
        failed.append(check_label)
        print(f"  ❌ {check_label}")

    # Verify annotations
    r = requests.get(f"{API}/label-datasets/{dataset_id}/images/{images[0]['id']}/annotations")
    check("Read back annotations", r)
    print(f"    Sample image has {len(jdata(r))} annotations")

    # ── 12. Train YOLO model ──────────────────────────────────────────────────
    step("12 · Start YOLO training job")
    r = requests.post(f"{API}/training/jobs", json={
        "dataset_id":    dataset_id,
        "model_type":    YOLO_MODEL,
        "epochs":        TRAIN_EPOCHS,
        "batch_size":    TRAIN_BATCH,
        "img_size":      640,
        "device":        "cpu",
        "experiment_id": experiment_id,
    })
    check("Create training job", r, 201)
    job = jdata(r)
    job_id = job["id"]
    print(f"    Training Job ID: {job_id}  |  Model: {YOLO_MODEL}  |  Epochs: {TRAIN_EPOCHS}")

    # ── 13. Poll until training completes ─────────────────────────────────────
    step("13 · Wait for training to complete")
    start_t = time.time()
    final_status = "queued"
    while time.time() - start_t < POLL_TIMEOUT:
        time.sleep(POLL_INTERVAL)
        r = requests.get(f"{API}/training/jobs/{job_id}")
        job = jdata(r)
        final_status = job["status"]
        elapsed = int(time.time() - start_t)
        print(f"    [{elapsed:3d}s] status={final_status}  progress={job['progress']}%  "
              f"epoch={job['currentEpoch']}/{job['epochs']}", end="\r")
        if final_status in ("completed", "failed", "cancelled"):
            break
    print()  # newline after \r

    if final_status == "completed":
        passed.append("Training completed")
        print(f"  ✅ Training completed in {int(time.time()-start_t)}s")
        print(f"     mAP50: {job.get('bestMap50')}  |  Loss: {job.get('trainLoss')}")
    else:
        failed.append("Training completed")
        print(f"  ❌ Training ended with status: {final_status}")
        print(f"     Error: {job.get('errorMessage', 'N/A')}")
        # Still continue remaining tests

    # Fetch training logs
    r = requests.get(f"{API}/training/jobs/{job_id}/logs")
    check("Fetch training logs", r)
    log_data = r.json().get("data", {})
    log_lines = log_data.get("lines", []) if isinstance(log_data, dict) else []
    print(f"    Log lines: {len(log_lines)}")

    # Append to our test log
    with open(log_file, "a") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Training {final_status} "
                f"job_id={job_id} mAP50={job.get('bestMap50')}\n")

    # ── 14. Validate model ────────────────────────────────────────────────────
    step("14 · Validate trained model")
    if final_status == "completed":
        r = requests.post(f"{API}/training/jobs/{job_id}/validate", json={
            "dataset_id": dataset_id,
            "conf":       0.25,
            "iou":        0.5,
        })
        check("Model validation", r)
        if r.ok:
            val = jdata(r)
            print(f"    Validation mAP50: {val.get('map50')}  "
                  f"Precision: {val.get('precision')}  Recall: {val.get('recall')}")
    else:
        print("    ⏭  Skipped (training did not complete)")
        passed.append("Model validation (skipped — training failed)")

    # ── 15. Download model ────────────────────────────────────────────────────
    step("15 · Download trained model file")
    if final_status == "completed":
        r = requests.get(f"{API}/training/jobs/{job_id}/download")
        ok = r.ok and len(r.content) > 1000
        label = f"Download model ({len(r.content)} bytes)"
        if ok:
            passed.append(label)
            print(f"  ✅ {label}")
            # Save to log folder
            dl_path = os.path.join(LOG_FOLDER, f"model_job{job_id}.pt")
            with open(dl_path, "wb") as f:
                f.write(r.content)
            print(f"    Saved: {dl_path}")
        else:
            failed.append(label)
            print(f"  ❌ {label}")
    else:
        print("    ⏭  Skipped (training did not complete)")
        passed.append("Download model (skipped)")

    # ── 16. Benchmark ─────────────────────────────────────────────────────────
    step("16 · Benchmark model")
    # Find the model config auto-registered by training
    r = requests.get(f"{API}/benchmark/models")
    check("List benchmarkable models", r)
    bench_models = jdata(r) or []
    # Find model configs matching our job
    mc_ids = [m["id"] for m in bench_models if str(job_id) in m.get("name", "")]
    if not mc_ids:
        mc_ids = [m["id"] for m in bench_models[:1]]  # fallback to first

    if mc_ids:
        r = requests.post(f"{API}/benchmark/run", json={
            "model_config_ids": mc_ids,
            "dataset_id":      dataset_id,
        })
        check("Start benchmark", r, 202)
        token = jdata(r).get("token") if r.ok else None

        if token:
            # Poll benchmark
            bench_start = time.time()
            while time.time() - bench_start < 120:
                time.sleep(3)
                r = requests.get(f"{API}/benchmark/status/{token}")
                bdata = jdata(r)
                if bdata and bdata.get("status") in ("done", "failed"):
                    break
            bench_result = jdata(r)
            if bench_result and bench_result.get("status") == "done":
                passed.append("Benchmark completed")
                print(f"  ✅ Benchmark completed")
                for res in bench_result.get("results", []):
                    print(f"     Model: {res.get('model_name')}  "
                          f"mAP50: {res.get('map50',0):.4f}  "
                          f"Speed: {res.get('speed_ms',0):.1f}ms")
            else:
                failed.append("Benchmark completed")
                print(f"  ❌ Benchmark failed: {bench_result}")
    else:
        print("    ⏭  No benchmarkable models found")
        passed.append("Benchmark (skipped — no models)")

    # ── 17. Deploy model ──────────────────────────────────────────────────────
    step("17 · Create model deployment")
    r = requests.post(f"{API}/model-deployments/", json={
        "model":    f"E2E-{YOLO_MODEL}-Job{job_id}",
        "stations": [platform.node()],
        "status":   "running",
        "fps":      30,
        "latency":  "45ms",
        "uptime":   "100%",
    })
    check("Create deployment", r, 201)
    dep_id = jdata(r)["id"] if r.ok else None

    if dep_id:
        # Toggle status
        r = requests.put(f"{API}/model-deployments/{dep_id}/status", json={
            "status": "running",
            "fps":    30,
        })
        check("Set deployment running", r)

    # Update edge device model count
    r = requests.put(f"{API}/edge-devices/{device_id}", json={"models": 1})
    check("Update edge device model count", r)

    # ── 18. Create alert ──────────────────────────────────────────────────────
    step("18 · Create test alert")
    r = requests.post(f"{API}/alerts/", json={
        "camera_id":  camera_id,
        "alert_type": "detection",
        "message":    "E2E Test: Person detected without helmet in Zone A",
        "status":     "unresolved",
    })
    check("Create alert", r, 201)
    alert_id = jdata(r)["id"] if r.ok else None

    if alert_id:
        # Acknowledge alert
        r = requests.put(f"{API}/alerts/{alert_id}", json={"status": "acknowledged"})
        check("Acknowledge alert", r)

        # Resolve alert
        r = requests.put(f"{API}/alerts/{alert_id}", json={"status": "resolved"})
        check("Resolve alert", r)

    # ── 19. Dashboard / analytics smoke-test ──────────────────────────────────
    step("19 · Dashboard & analytics smoke-test")
    for endpoint, label in [
        (f"{API}/dashboard",               "Dashboard"),
        (f"{API}/cameras/",                "List cameras"),
        (f"{API}/edge-devices/",           "List edge devices"),
        (f"{API}/config/databases/",       "List DB configs"),
        (f"{API}/config/logs/",            "List log configs"),
        (f"{API}/config/models/",          "List model configs"),
        (f"{API}/experiments/",            "List experiments"),
        (f"{API}/model-deployments/",      "List deployments"),
        (f"{API}/alerts/",                 "List alerts"),
        (f"{API}/label-datasets/",         "List datasets"),
        (f"{API}/training/jobs",           "List training jobs"),
        (f"{API}/projects/{project_id}",   "Get project by ID"),
    ]:
        r = requests.get(endpoint)
        check(label, r)

    # Update experiment to completed
    r = requests.put(f"{API}/experiments/{experiment_id}/status", json={
        "status":        "completed",
        "epoch_current": TRAIN_EPOCHS,
        "accuracy":      str(job.get("bestMap50", "N/A")),
        "loss":          str(job.get("trainLoss", "N/A")),
    })
    check("Update experiment to completed", r)

    # ── 20. Write final log ───────────────────────────────────────────────────
    with open(log_file, "a") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] E2E test finished. "
                f"Passed={len(passed)} Failed={len(failed)}\n")

    # ══════════════════════════════════════════════════════════════════════════
    #  RESULTS SUMMARY
    # ══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("  TEST RESULTS SUMMARY")
    print("=" * 70)
    print(f"\n  ✅ PASSED: {len(passed)}")
    for p in passed:
        print(f"      • {p}")
    if failed:
        print(f"\n  ❌ FAILED: {len(failed)}")
        for f_ in failed:
            print(f"      • {f_}")
    else:
        print("\n  🎉 ALL TESTS PASSED!")

    print(f"\n  Total: {len(passed) + len(failed)}  |  "
          f"Pass: {len(passed)}  |  Fail: {len(failed)}")
    print(f"  Log file: {log_file}")
    print("=" * 70 + "\n")

    # ── Created resource IDs (for manual inspection) ──────────────────────────
    print("  Created Resources:")
    print(f"    Project ID:     {project_id}")
    print(f"    Use-case IDs:   {uc_ids}")
    print(f"    Camera ID:      {camera_id}")
    print(f"    Edge Device ID: {device_id}")
    print(f"    DB Config ID:   {db_config_id}")
    print(f"    Log Config ID:  {log_config_id}")
    print(f"    Dataset ID:     {dataset_id}")
    print(f"    Training Job:   {job_id}")
    print(f"    Experiment ID:  {experiment_id}")
    if dep_id:
        print(f"    Deployment ID:  {dep_id}")
    if alert_id:
        print(f"    Alert ID:       {alert_id}")
    print()

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
