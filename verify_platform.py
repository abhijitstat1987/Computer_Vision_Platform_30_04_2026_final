"""Verify all platform data is correctly seeded."""
import requests

BASE = "http://localhost:5000/api"

endpoints = [
    ("Projects",       f"{BASE}/projects/"),
    ("Use-cases",      f"{BASE}/projects/1/use-cases"),
    ("Cameras",        f"{BASE}/cameras/"),
    ("Edge Devices",   f"{BASE}/edge-devices/"),
    ("Label Datasets", f"{BASE}/label-datasets/"),
    ("Images (ds=1)",  f"{BASE}/label-datasets/1/images/?per_page=1"),
    ("Training Jobs",  f"{BASE}/training/jobs"),
    ("Model Configs",  f"{BASE}/config/models/"),
    ("Deployments",    f"{BASE}/model-deployments/"),
    ("Alerts",         f"{BASE}/alerts/"),
    ("Experiments",    f"{BASE}/experiments/"),
    ("Log Configs",    f"{BASE}/config/logs/"),
    ("DB Configs",     f"{BASE}/config/databases/"),
    ("LLM Configs",    f"{BASE}/config/llms/"),
]

print("\n=== Platform Data Verification ===")
for label, url in endpoints:
    r = requests.get(url).json()
    total = r.get("pagination", {}).get("total_items", len(r.get("data", [])))
    print(f"  {label:20s}: {total}")

# Check annotations on first image
ann_r = requests.get(f"{BASE}/label-datasets/1/images/").json()
if ann_r["data"]:
    img_id = ann_r["data"][0]["id"]
    anns = requests.get(f"{BASE}/label-datasets/1/images/{img_id}/annotations").json()
    print(f"  {'Annotations (img 1)':20s}: {len(anns['data'])}")

# Check training job status
jobs = requests.get(f"{BASE}/training/jobs").json()["data"]
if jobs:
    j = jobs[0]
    print(f"\n  Training Job id={j['id']}: status={j['status']} progress={j['progress']}%")

print("\n  Frontend: http://localhost:5173")
