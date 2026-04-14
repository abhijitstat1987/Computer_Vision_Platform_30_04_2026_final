import os
import threading
from flask import Flask
from config import config_map
from app.extensions import db, migrate, cors


def create_app(env: str = None) -> Flask:
    env = env or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__, static_folder=None)

    # ── Configuration ──────────────────────────────────────────────────────────
    app.config.from_object(config_map.get(env, config_map["default"]))

    # Ensure upload / training folders exist at startup
    for folder_key in ("UPLOAD_FOLDER", "LABEL_IMAGES_FOLDER", "TRAINING_OUTPUT_DIR"):
        os.makedirs(app.config[folder_key], exist_ok=True)

    # ── Extensions ─────────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]},
                                   r"/uploads/*": {"origins": app.config["CORS_ORIGINS"]}})

    # ── Models — must be imported before blueprints so SQLAlchemy registers them
    from app.models import (  # noqa: F401
        Camera, DetectionEvent, DetectedObject, Alert,
        Project, UseCase, EdgeDevice, Experiment, ModelDeployment,
        DbConfig, ModelConfig, LogConfig, LlmConfig,
        LabelDataset, LabelImage, LabelAnnotation, TrainingJob,
        LlmAnalysis, ChatSession, ChatMessage, LlmJob,
    )

    # ── Blueprints ─────────────────────────────────────────────────────────────
    from app.routes import register_blueprints
    register_blueprints(app)

    # ── Error Handlers ─────────────────────────────────────────────────────────
    from app.errors.handlers import register_error_handlers
    register_error_handlers(app)

    # ── DB migrations + crash recovery — run in background so Flask binds fast ─
    def _startup_tasks():
        # Small delay to let Flask finish binding first
        import time; time.sleep(1)

        with app.app_context():
            # DB migrations
            try:
                with db.engine.connect() as conn:
                    # model_configs.model_path
                    r = conn.execute(db.text(
                        "SELECT COUNT(*) FROM information_schema.COLUMNS "
                        "WHERE TABLE_SCHEMA = DATABASE() "
                        "  AND TABLE_NAME = 'model_configs' "
                        "  AND COLUMN_NAME = 'model_path'"
                    ))
                    if r.scalar() == 0:
                        conn.execute(db.text(
                            "ALTER TABLE model_configs "
                            "ADD COLUMN model_path VARCHAR(512) DEFAULT NULL"
                        ))

                    conn.execute(db.text("""
                        CREATE TABLE IF NOT EXISTS llm_analyses (
                            id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
                            image_id       INT UNSIGNED DEFAULT NULL,
                            dataset_id     INT UNSIGNED DEFAULT NULL,
                            model_provider VARCHAR(60)  NOT NULL,
                            model_name     VARCHAR(120) NOT NULL,
                            prompt         TEXT         NOT NULL,
                            result_text    LONGTEXT     DEFAULT NULL,
                            image_filename VARCHAR(255) DEFAULT NULL,
                            created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            INDEX idx_la_dataset  (dataset_id),
                            INDEX idx_la_provider (model_provider)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))

                    conn.execute(db.text("""
                        CREATE TABLE IF NOT EXISTS llm_jobs (
                            id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
                            base_model    VARCHAR(255) NOT NULL,
                            technique     ENUM('lora','qlora','full') NOT NULL DEFAULT 'lora',
                            dataset_path  VARCHAR(512) DEFAULT NULL,
                            epochs        SMALLINT UNSIGNED NOT NULL DEFAULT 3,
                            batch_size    SMALLINT UNSIGNED NOT NULL DEFAULT 4,
                            lora_r        SMALLINT UNSIGNED NOT NULL DEFAULT 16,
                            lora_alpha    SMALLINT UNSIGNED NOT NULL DEFAULT 32,
                            lora_dropout  FLOAT        NOT NULL DEFAULT 0.05,
                            learning_rate DOUBLE       NOT NULL DEFAULT 0.0002,
                            status        ENUM('queued','running','completed','failed','cancelled')
                                          NOT NULL DEFAULT 'queued',
                            progress      TINYINT UNSIGNED NOT NULL DEFAULT 0,
                            output_dir    VARCHAR(512) DEFAULT NULL,
                            log_file      VARCHAR(512) DEFAULT NULL,
                            error_message TEXT         DEFAULT NULL,
                            train_loss    FLOAT        DEFAULT NULL,
                            started_at    DATETIME     DEFAULT NULL,
                            completed_at  DATETIME     DEFAULT NULL,
                            created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            INDEX idx_llmj_status (status)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))

                    conn.execute(db.text("""
                        CREATE TABLE IF NOT EXISTS chat_sessions (
                            id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
                            title      VARCHAR(255) NOT NULL DEFAULT 'New Chat',
                            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
                            PRIMARY KEY (id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))

                    conn.execute(db.text("""
                        CREATE TABLE IF NOT EXISTS chat_messages (
                            id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
                            session_id INT UNSIGNED NOT NULL,
                            role       ENUM('user','assistant','system') NOT NULL,
                            content    LONGTEXT     NOT NULL,
                            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            CONSTRAINT fk_cm_session FOREIGN KEY (session_id)
                                REFERENCES chat_sessions (id) ON DELETE CASCADE,
                            INDEX idx_cm_session (session_id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))

                    # training_jobs.device column
                    r = conn.execute(db.text(
                        "SELECT COUNT(*) FROM information_schema.COLUMNS "
                        "WHERE TABLE_SCHEMA = DATABASE() "
                        "  AND TABLE_NAME = 'training_jobs' "
                        "  AND COLUMN_NAME = 'device'"
                    ))
                    if r.scalar() == 0:
                        conn.execute(db.text(
                            "ALTER TABLE training_jobs "
                            "ADD COLUMN device VARCHAR(20) NOT NULL DEFAULT 'cpu'"
                        ))

                    conn.commit()
            except Exception:
                pass  # DB not yet ready

            # Crash recovery
            try:
                from app.services.yolo_trainer import reset_stuck_jobs
                reset_stuck_jobs(app)
            except Exception:
                pass

            try:
                from app.services.llm_trainer import reset_stuck_llm_jobs
                reset_stuck_llm_jobs(app)
            except Exception:
                pass

    # threading.Thread(target=_startup_tasks, daemon=True).start()

    return app
