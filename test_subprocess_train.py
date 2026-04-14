"""
Run training using subprocess to simulate exactly how Flask spawns the training.
This writes output to a file so we can see the full error.
"""
import subprocess
import sys
import os

# The Python executable from the venv
venv_python = r"c:\Industrial AI\Industrial AI - Vision AI Platform\Computer_Vision_Platform_F_B\.venv\Scripts\python.exe"

# Script that runs training directly
training_script = r"""
import sys, os
sys.path.insert(0, r"c:\Industrial AI\Industrial AI - Vision AI Platform\Computer_Vision_Platform_F_B")
os.chdir(r"c:\Industrial AI\Industrial AI - Vision AI Platform\Computer_Vision_Platform_F_B")

# Check what the Flask app's __init__ does to sys.path
print("sys.path before flask:", sys.path[:5])

# Import Flask app exactly as it happens
from app import create_app
app = create_app()

print("sys.path after flask:", sys.path[:5])

# Now import torch and test numpy
import torch
print("torch path:", torch.__file__)
import numpy as np
print("numpy path:", np.__file__)
t = torch.tensor([1.0])
print("t.numpy():", t.numpy())

# Now do exactly what _training_thread does
with app.app_context():
    from ultralytics import YOLO
    print("YOLO imported OK")
    model = YOLO("yolov8n.pt")
    print("Model loaded OK")
    
    # Try a very minimal train
    import tempfile, shutil
    # We'll just check if we can call model.train without it crashing on numpy
    print("All OK - would start training now")
"""

result = subprocess.run(
    [venv_python, "-c", training_script],
    capture_output=True, text=True,
    cwd=r"c:\Industrial AI\Industrial AI - Vision AI Platform\Computer_Vision_Platform_F_B"
)
print("=== STDOUT ===")
print(result.stdout)
print("=== STDERR ===")
print(result.stderr)
print("=== Return code:", result.returncode)
