"""
Seed script: generate 100 synthetic images, create a dataset,
upload images with YOLO-format annotations, then start a training job.

Run with the venv Python:
    venv\Scripts\python seed_test_data.py
"""
import io
import json
import os
import random
import sys
import time

# Fix Windows cp1252 terminal encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
from PIL import Image, ImageDraw

BASE_URL = "http://localhost:5000/api"

# ── Classes ────────────────────────────────────────────────────────────────────
CLASSES = [
    {"id": "person",  "name": "person"},
    {"id": "vehicle", "name": "vehicle"},
    {"id": "object",  "name": "object"},
]

# Palette per class
CLASS_COLORS = {
    "person":  [(255, 100, 100), (230, 60, 60), (200, 40, 40)],
    "vehicle": [(100, 160, 255), (60, 120, 230), (40, 90, 200)],
    "object":  [(100, 220, 100), (60, 190, 60), (40, 160, 40)],
}

IMG_W, IMG_H = 640, 640


# ── Image generator ───────────────────────────────────────────────────────────

def _random_bg():
    return (random.randint(30, 80), random.randint(30, 80), random.randint(30, 80))


def _draw_person(draw, x, y, w, h, color):
    """Stick-figure silhouette."""
    # body
    draw.rectangle([x, y + h // 3, x + w, y + h], fill=color)
    # head
    cx = x + w // 2
    r  = w // 3
    draw.ellipse([cx - r, y, cx + r, y + 2 * r], fill=color)


def _draw_vehicle(draw, x, y, w, h, color):
    """Simplified car shape."""
    draw.rectangle([x, y + h // 3, x + w, y + h], fill=color)
    draw.rectangle([x + w // 5, y, x + w * 4 // 5, y + h // 3 + 4], fill=color)
    # wheels
    wr = h // 6
    for cx in [x + w // 4, x + 3 * w // 4]:
        draw.ellipse([cx - wr, y + h - 2 * wr, cx + wr, y + h], fill=(20, 20, 20))


def _draw_object(draw, x, y, w, h, color):
    """Generic box / crate."""
    draw.rectangle([x, y, x + w, y + h], fill=color)
    # cross lines
    draw.line([x, y, x + w, y + h], fill=(0, 0, 0, 120), width=2)
    draw.line([x + w, y, x, y + h], fill=(0, 0, 0, 120), width=2)


_DRAWERS = {"person": _draw_person, "vehicle": _draw_vehicle, "object": _draw_object}


def generate_image(n_objects: int = 3):
    """
    Returns (PIL.Image, annotations)
    annotations: list of (class_id, cx, cy, bw, bh)  — all normalized 0-1
    """
    img  = Image.new("RGB", (IMG_W, IMG_H), _random_bg())
    draw = ImageDraw.Draw(img, "RGBA")

    annotations = []
    placed      = []

    for _ in range(n_objects):
        cls  = random.choice(CLASSES)
        cid  = cls["id"]
        col  = random.choice(CLASS_COLORS[cid])
        col  = col + (200,)       # add alpha

        w  = random.randint(IMG_W // 10, IMG_W // 4)
        h  = random.randint(IMG_H // 10, IMG_H // 3)
        x  = random.randint(0, IMG_W - w - 1)
        y  = random.randint(0, IMG_H - h - 1)

        # Avoid excessive overlap
        overlap = any(
            abs(x - px) < (w + pw) // 2 and abs(y - py) < (h + ph) // 2
            for px, py, pw, ph in placed
        )
        if overlap and len(placed) > 0:
            continue

        placed.append((x, y, w, h))
        _DRAWERS[cid](draw, x, y, w, h, col[:3])

        cx = (x + w / 2) / IMG_W
        cy = (y + h / 2) / IMG_H
        bw = w / IMG_W
        bh = h / IMG_H
        annotations.append((cid, cx, cy, bw, bh))

    return img, annotations


# ── API helpers ────────────────────────────────────────────────────────────────

def _post(path, **kwargs):
    r = requests.post(f"{BASE_URL}{path}", **kwargs)
    r.raise_for_status()
    return r.json()


def _get(path, **kwargs):
    r = requests.get(f"{BASE_URL}{path}", **kwargs)
    r.raise_for_status()
    return r.json()


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    N = 100

    print("--- Computer Vision Platform — Test Data Seeder ---\n")

    # 1. Create dataset
    print("1. Creating dataset …")
    ds_body = {"name": "Test Dataset 100", "classes": CLASSES}
    ds_resp = _post("/label-datasets/", json=ds_body)
    ds_id   = ds_resp["data"]["id"]
    print(f"   Dataset created -> id={ds_id}\n")

    # 2. Generate & upload images in batches of 10
    print(f"2. Generating and uploading {N} images …")
    all_annotations = {}   # stored_filename -> [(cid, cx, cy, bw, bh), ...]

    batch_size = 10
    for batch_start in range(0, N, batch_size):
        files  = []
        batch_anns = []

        for i in range(batch_start, min(batch_start + batch_size, N)):
            n_objs = random.randint(1, 4)
            img, anns = generate_image(n_objs)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            buf.seek(0)
            files.append(("files", (f"img_{i:04d}.jpg", buf, "image/jpeg")))
            batch_anns.append(anns)

        resp = requests.post(
            f"{BASE_URL}/label-datasets/{ds_id}/images/",
            files=files,
        )
        resp.raise_for_status()
        uploaded = resp.json()["data"]

        for img_rec, anns in zip(uploaded, batch_anns):
            all_annotations[img_rec["id"]] = anns

        done = min(batch_start + batch_size, N)
        print(f"   Uploaded {done}/{N} …")

    print(f"   All {N} images uploaded.\n")

    # 3. Add annotations (API accepts pixel coords; status auto-set to 'labeled')
    print("3. Adding annotations …")
    labeled_count = 0

    for img_id, anns in all_annotations.items():
        if not anns:
            continue
        ann_list = []
        for (cid, cx, cy, bw, bh) in anns:
            # Convert normalized -> pixel (image is IMG_W × IMG_H)
            w_px = bw * IMG_W
            h_px = bh * IMG_H
            x_px = cx * IMG_W - w_px / 2
            y_px = cy * IMG_H - h_px / 2
            ann_list.append({
                "classId":       cid,
                "className":     cid,
                "x":             round(x_px, 2),
                "y":             round(y_px, 2),
                "width":         round(w_px, 2),
                "height":        round(h_px, 2),
                "isAutoLabeled": False,
            })
        _post(
            f"/label-datasets/{ds_id}/images/{img_id}/annotations",
            json={"annotations": ann_list},
        )
        labeled_count += 1

    print(f"   Annotated {labeled_count} images.\n")

    # 5. Start training job
    print("5. Starting YOLO training job …")
    job_resp = _post("/training/jobs", json={
        "dataset_id": ds_id,
        "model_type": "yolov8n",
        "epochs":     5,
        "batch_size": 8,
        "img_size":   640,
    })
    job_id = job_resp["data"]["id"]
    print(f"   Training job started -> id={job_id}\n")

    # 6. Poll progress for 30 s
    print("6. Polling job status (30 s) …")
    for _ in range(10):
        time.sleep(3)
        j = _get(f"/training/jobs/{job_id}")["data"]
        pct    = j.get("progress", 0)
        status = j.get("status")
        print(f"   status={status}  progress={pct}%")
        if status in ("completed", "failed", "cancelled"):
            break

    print("\n--- Seeder complete ---")
    print(f"   Dataset id : {ds_id}")
    print(f"   Training job id : {job_id}")
    print(f"   UI: http://localhost:5173")


if __name__ == "__main__":
    main()
