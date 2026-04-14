"""Add annotations to all images and start a training job."""
import requests
import random

BASE = "http://localhost:5000/api"
DS_ID = 1
IMG_W = IMG_H = 640

imgs_resp = requests.get(f"{BASE}/label-datasets/{DS_ID}/images/?per_page=150").json()
images = imgs_resp["data"]
print(f"Found {len(images)} images, adding annotations...")

classes = ["person", "vehicle", "object"]
count = 0
for img in images:
    anns = []
    for _ in range(random.randint(1, 3)):
        cls = random.choice(classes)
        w = random.randint(60, 160)
        h = random.randint(60, 160)
        x = random.randint(0, IMG_W - w - 1)
        y = random.randint(0, IMG_H - h - 1)
        anns.append({
            "classId": cls,
            "className": cls,
            "x": x, "y": y,
            "width": w, "height": h,
            "isAutoLabeled": False,
        })
    r = requests.post(
        f"{BASE}/label-datasets/{DS_ID}/images/{img['id']}/annotations",
        json={"annotations": anns},
    )
    count += 1

print(f"Annotated {count} images.")

# Start training job
job_resp = requests.post(f"{BASE}/training/jobs", json={
    "dataset_id": DS_ID,
    "model_type": "yolov8n",
    "epochs": 3,
    "batch_size": 8,
    "img_size": 640,
    "device": "cpu",
}).json()
job_id = job_resp["data"]["id"]
print(f"Training job started: id={job_id}")
print("Check progress at http://localhost:5173/model-development")
