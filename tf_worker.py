"""
Standalone TensorFlow training worker.
Runs in its own venv (C:\\tf_env) via subprocess.

Usage:
    C:\\tf_env\\Scripts\\python.exe tf_worker.py <config.json>

config.json must contain:
    train_dir, output_dir, log_path, model_type, epochs, batch_size, device,
    db_uri, job_id
"""
import os
import sys
import json
import time
import traceback

def update_job(db_uri, job_id, **fields):
    """Direct MySQL update — no Flask/SQLAlchemy dependency."""
    try:
        import pymysql
        from urllib.parse import urlparse, unquote
        u = urlparse(db_uri)
        conn = pymysql.connect(
            host=u.hostname or "localhost",
            port=u.port or 3306,
            user=unquote(u.username or "root"),
            password=unquote(u.password or ""),
            database=u.path.lstrip("/").split("?")[0],
        )
        sets = ", ".join(f"{k}=%s" for k in fields)
        vals = list(fields.values()) + [job_id]
        with conn.cursor() as cur:
            cur.execute(f"UPDATE training_jobs SET {sets} WHERE id=%s", vals)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB-UPDATE-ERROR] {e}", file=sys.stderr)


def main():
    cfg_path = sys.argv[1]
    with open(cfg_path, "r") as f:
        cfg = json.load(f)

    train_dir  = cfg["train_dir"]
    output_dir = cfg["output_dir"]
    log_path   = cfg["log_path"]
    model_type = cfg["model_type"]
    epochs     = cfg["epochs"]
    batch_size = cfg["batch_size"]
    device     = cfg.get("device", "cpu")
    db_uri     = cfg["db_uri"]
    job_id     = cfg["job_id"]

    def log(msg):
        # Only print to stdout; the parent process captures stdout and writes
        # it to the log file, so writing here as well would duplicate lines.
        print(msg, flush=True)

    try:
        log(f"[TF Worker] Starting job {job_id}")
        log(f"[TF Worker] train_dir={train_dir}")
        log(f"[TF Worker] model_type={model_type}, epochs={epochs}, batch={batch_size}")

        os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

        import tensorflow as tf
        from tensorflow.keras import layers, Model
        from tensorflow.keras.applications import ResNet50, EfficientNetB0, MobileNetV2
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
        from tensorflow.keras.callbacks import Callback

        log(f"[TF Worker] TensorFlow {tf.__version__} loaded")

        # Device
        if device == "cpu":
            tf_device = "/CPU:0"
        else:
            gpus = tf.config.list_physical_devices("GPU")
            tf_device = "/GPU:0" if gpus else "/CPU:0"
        log(f"[TF Worker] Using device: {tf_device}")

        # Data generators
        datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=0.2,
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            horizontal_flip=True,
        )
        train_gen = datagen.flow_from_directory(
            train_dir, target_size=(224, 224), batch_size=batch_size,
            class_mode="categorical", subset="training"
        )
        val_gen = datagen.flow_from_directory(
            train_dir, target_size=(224, 224), batch_size=batch_size,
            class_mode="categorical", subset="validation"
        )

        num_classes = train_gen.num_classes
        class_names = list(train_gen.class_indices.keys())

        if num_classes < 2:
            raise ValueError(f"Need >= 2 classes, found {num_classes}")

        log(f"[TF Worker] Classes ({num_classes}): {class_names}")

        # Build model
        with tf.device(tf_device):
            model_map = {
                "tf_resnet50":       ResNet50,
                "tf_efficientnetb0": EfficientNetB0,
                "tf_mobilenetv2":    MobileNetV2,
            }
            base_cls   = model_map.get(model_type, MobileNetV2)
            base_model = base_cls(weights="imagenet", include_top=False,
                                  input_shape=(224, 224, 3))
            base_model.trainable = False

            inputs  = tf.keras.Input(shape=(224, 224, 3))
            x       = base_model(inputs, training=False)
            x       = layers.GlobalAveragePooling2D()(x)
            x       = layers.Dropout(0.3)(x)
            outputs = layers.Dense(num_classes, activation="softmax")(x)
            model   = Model(inputs, outputs)

            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
                loss="categorical_crossentropy",
                metrics=["accuracy"],
            )

            class ProgressCallback(Callback):
                def on_epoch_end(self, epoch, logs=None):
                    logs     = logs or {}
                    acc      = logs.get("accuracy", 0)
                    val_acc  = logs.get("val_accuracy", 0)
                    loss_val = logs.get("loss", 0)
                    progress = int((epoch + 1) / epochs * 100)

                    log(f"[Epoch {epoch+1}/{epochs}] acc={acc:.4f} val_acc={val_acc:.4f} loss={loss_val:.4f}")

                    update_job(db_uri, job_id,
                               progress=progress,
                               current_epoch=epoch + 1,
                               best_map50=float(val_acc),
                               train_loss=float(loss_val))

            log("[TF Worker] Training...")
            model.fit(
                train_gen,
                epochs=epochs,
                validation_data=val_gen,
                callbacks=[ProgressCallback()],
                verbose=0,
            )

            # Fine-tune
            if epochs > 5:
                base_model.trainable = True
                for layer in base_model.layers[:-20]:
                    layer.trainable = False
                model.compile(
                    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
                    loss="categorical_crossentropy",
                    metrics=["accuracy"],
                )
                log("[TF Worker] Fine-tuning top layers...")
                model.fit(train_gen, epochs=5, validation_data=val_gen,
                          callbacks=[ProgressCallback()], verbose=0)

        # Save model
        saved_path = os.path.join(output_dir, "saved_model.keras")
        model.save(saved_path)
        with open(os.path.join(output_dir, "class_names.json"), "w") as f:
            json.dump(class_names, f)

        log(f"[OK] Training completed. Model saved: {saved_path}")

        # Write result for the parent process
        result = {
            "status": "completed",
            "saved_model_path": saved_path,
            "class_names": class_names,
        }
        with open(os.path.join(output_dir, "result.json"), "w") as f:
            json.dump(result, f)

    except Exception as ex:
        tb = traceback.format_exc()
        log(f"[FAILED] {ex}\n{tb}")
        result = {"status": "failed", "error": str(ex)}
        try:
            with open(os.path.join(output_dir, "result.json"), "w") as f:
                json.dump(result, f)
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
