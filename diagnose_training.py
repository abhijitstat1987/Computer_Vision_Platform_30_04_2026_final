"""
Exact reproduction of how Flask calls the training thread.
Runs _training_thread directly in a daemon thread WITH the Flask app context,
using the REAL app object — so we see the exact same error.
"""
import sys
import os
import time

# Make sure we're running from the right directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Python:", sys.executable)
print("CWD:", os.getcwd())

# Import the Flask app EXACTLY as run.py does
from app import create_app

app = create_app()

print("Flask app created")
print("TRAINING_OUTPUT_DIR:", app.config.get("TRAINING_OUTPUT_DIR"))

# Check for an existing training job to use
with app.app_context():
    from app.extensions import db
    from app.models import TrainingJob, LabelDataset, LabelImage, LabelAnnotation

    # Check datasets
    datasets = LabelDataset.query.all()
    print(f"\nDatasets: {[(d.id, d.name) for d in datasets]}")

    # Check images
    for ds in datasets:
        imgs = LabelImage.query.filter_by(dataset_id=ds.id).all()
        labeled = [i for i in imgs if i.status in ("labeled", "auto_labeled", "verified")]
        print(f"  Dataset {ds.id} '{ds.name}': {len(imgs)} total images, {len(labeled)} labeled")
        if labeled:
            ann = LabelAnnotation.query.filter_by(image_id=labeled[0].id).first()
            print(f"    Sample annotation on image {labeled[0].id}: {ann}")

    # Check existing jobs
    jobs = TrainingJob.query.all()
    print(f"\nTraining jobs: {[(j.id, j.status, j.error_message) for j in jobs]}")

    # Also check dataset classes_json
    ds = LabelDataset.query.get(1)
    print(f"\nDataset 1 classes_json: {ds.classes_json}")

    # Create a fresh test job
    from app.models import TrainingJob
    test_job = TrainingJob(
        dataset_id=1,
        model_type="yolov8n",
        epochs=1,
        batch_size=2,
        img_size=320,
        device="cpu",
        status="queued",
    )
    db.session.add(test_job)
    db.session.commit()
    test_job_id = test_job.id
    print(f"\nCreated test job id={test_job_id}")

# Now import the training service and run in a thread exactly as Flask does
from app.services.yolo_trainer import _training_thread
import threading

print("\nStarting training thread (with Flask app context)...")
t = threading.Thread(target=_training_thread, args=(app, test_job_id), daemon=False)
t.start()

# Wait up to 60 seconds (1 epoch should complete)
t.join(timeout=60)

print("\nThread finished (or timed out).")

# Check result
with app.app_context():
    from app.extensions import db
    from app.models import TrainingJob
    job = db.session.get(TrainingJob, test_job_id)
    print(f"Job {test_job_id} status: {job.status}")
    print(f"Job {test_job_id} error: {job.error_message}")
    print(f"Job {test_job_id} output_dir: {job.output_dir}")

# Also check for error file
error_file = os.path.join(app.config.get("TRAINING_OUTPUT_DIR", "."), f"job_{test_job_id}_error.txt")
if os.path.exists(error_file):
    print(f"\n=== Error file {error_file} ===")
    with open(error_file) as f:
        print(f.read())
else:
    print(f"\nNo error file at: {error_file}")

# Check for job-specific error files
job_dir = os.path.join(app.config.get("TRAINING_OUTPUT_DIR", "."), "jobs", str(test_job_id))
if os.path.exists(job_dir):
    for fname in os.listdir(job_dir):
        print(f"\n=== {os.path.join(job_dir, fname)} ===")
        fpath = os.path.join(job_dir, fname)
        with open(fpath, errors="replace") as f:
            print(f.read()[:2000])
