"""Minimal reproduction of the training thread to catch the exact error."""
import sys
import os
sys.path.insert(0, r"c:\Industrial AI\Industrial AI - Vision AI Platform\Computer_Vision_Platform_F_B")

import threading
import traceback

def train_thread():
    try:
        import numpy as _np
        print("numpy ok:", _np.__version__)
        from ultralytics import YOLO
        print("YOLO imported ok")
        model = YOLO("yolov8n.pt")
        print("model loaded ok")
        # Try a tiny predict to trigger any lazy numpy issues
        import numpy as np
        import cv2
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        results = model.predict(dummy, verbose=False)
        print("predict ok:", results)
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

t = threading.Thread(target=train_thread)
t.start()
t.join()
print("Done")
