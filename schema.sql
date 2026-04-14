-- ============================================================
-- Computer Vision Platform - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS vision_platform_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE vision_platform_db;

-- ------------------------------------------------------------
-- cameras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cameras (
    id             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    name           VARCHAR(120)     NOT NULL,
    rtsp_url       VARCHAR(512)     NOT NULL DEFAULT '',
    ip_address     VARCHAR(45)      NOT NULL DEFAULT '',
    location       VARCHAR(255)     DEFAULT NULL,
    camera_type    VARCHAR(60)      NOT NULL DEFAULT 'generic',
    status         ENUM('active','inactive','error') NOT NULL DEFAULT 'inactive',
    fps            SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    resolution     VARCHAR(20)      NOT NULL DEFAULT '1920x1080',
    hardware_model VARCHAR(120)     DEFAULT NULL,
    created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_cameras_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- detection_events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detection_events (
    id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    camera_id     INT UNSIGNED  NOT NULL,
    detected_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type    VARCHAR(80)   NOT NULL DEFAULT 'object_detection',
    snapshot_path VARCHAR(512)  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_event_camera
        FOREIGN KEY (camera_id) REFERENCES cameras (id) ON DELETE CASCADE,
    INDEX idx_event_camera   (camera_id),
    INDEX idx_event_detected (detected_at),
    INDEX idx_event_type     (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- detected_objects
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detected_objects (
    id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    event_id   INT UNSIGNED      NOT NULL,
    label      VARCHAR(120)      NOT NULL,
    confidence DECIMAL(5,4)      NOT NULL,
    x1         SMALLINT UNSIGNED NOT NULL,
    y1         SMALLINT UNSIGNED NOT NULL,
    x2         SMALLINT UNSIGNED NOT NULL,
    y2         SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_object_event
        FOREIGN KEY (event_id) REFERENCES detection_events (id) ON DELETE CASCADE,
    INDEX idx_object_event (event_id),
    INDEX idx_object_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    camera_id  INT UNSIGNED  NOT NULL,
    event_id   INT UNSIGNED  DEFAULT NULL,
    alert_type VARCHAR(80)   NOT NULL DEFAULT 'detection',
    message    TEXT          NOT NULL,
    status     ENUM('unresolved','acknowledged','resolved') NOT NULL DEFAULT 'unresolved',
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_alert_camera
        FOREIGN KEY (camera_id) REFERENCES cameras (id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_event
        FOREIGN KEY (event_id) REFERENCES detection_events (id) ON DELETE SET NULL,
    INDEX idx_alert_camera (camera_id),
    INDEX idx_alert_status (status),
    INDEX idx_alert_type   (alert_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    description TEXT         DEFAULT NULL,
    biz_company VARCHAR(120) DEFAULT NULL,
    biz_unit    VARCHAR(120) DEFAULT NULL,
    biz_product VARCHAR(120) DEFAULT NULL,
    geo_country VARCHAR(120) DEFAULT NULL,
    geo_state   VARCHAR(120) DEFAULT NULL,
    geo_city    VARCHAR(120) DEFAULT NULL,
    geo_site    VARCHAR(120) DEFAULT NULL,
    status      ENUM('active','inactive','planning') NOT NULL DEFAULT 'planning',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_project_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- use_cases
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS use_cases (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    project_id INT UNSIGNED NOT NULL,
    name       VARCHAR(120) NOT NULL,
    description TEXT        DEFAULT NULL,
    type       ENUM('safety','quality','maintenance','productivity','custom')
                            NOT NULL DEFAULT 'custom',
    priority   ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
    status     ENUM('active','inactive','development') NOT NULL DEFAULT 'development',
    workflows  INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_uc_project
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    INDEX idx_uc_project (project_id),
    INDEX idx_uc_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- edge_devices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS edge_devices (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(120) NOT NULL,
    location   VARCHAR(255) DEFAULT NULL,
    status     ENUM('online','offline') NOT NULL DEFAULT 'offline',
    cpu        VARCHAR(10)  NOT NULL DEFAULT '0%',
    memory     VARCHAR(10)  NOT NULL DEFAULT '0%',
    storage    VARCHAR(10)  NOT NULL DEFAULT '0%',
    models     INT UNSIGNED NOT NULL DEFAULT 0,
    ip_address VARCHAR(45)  DEFAULT NULL,
    platform   VARCHAR(120) DEFAULT NULL,
    gpu_model  VARCHAR(120) DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_edge_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- experiments  (model development)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiments (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(120) NOT NULL,
    dataset       VARCHAR(120) NOT NULL DEFAULT '',
    status        ENUM('training','completed','pending','paused') NOT NULL DEFAULT 'pending',
    epoch_current INT UNSIGNED NOT NULL DEFAULT 0,
    epoch_total   INT UNSIGNED NOT NULL DEFAULT 100,
    accuracy      VARCHAR(20)  NOT NULL DEFAULT '-',
    loss          VARCHAR(20)  NOT NULL DEFAULT '-',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_exp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- model_deployments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_deployments (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    model      VARCHAR(120) NOT NULL,
    stations   TEXT         NOT NULL,
    status     ENUM('running','stopped') NOT NULL DEFAULT 'stopped',
    fps        INT UNSIGNED NOT NULL DEFAULT 0,
    latency    VARCHAR(20)  NOT NULL DEFAULT '0ms',
    uptime     VARCHAR(20)  NOT NULL DEFAULT '0%',
    detections VARCHAR(20)  NOT NULL DEFAULT '0',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_dep_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- db_configs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS db_configs (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(120) NOT NULL,
    host       VARCHAR(255) NOT NULL DEFAULT '',
    port       INT UNSIGNED NOT NULL DEFAULT 5432,
    db_type    VARCHAR(60)  NOT NULL DEFAULT 'postgresql',
    username   VARCHAR(120) NOT NULL DEFAULT '',
    db_name    VARCHAR(120) NOT NULL DEFAULT '',
    status     ENUM('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
    db_usage   VARCHAR(20)  NOT NULL DEFAULT '0%',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- model_configs  (model repository)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_configs (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    version     VARCHAR(40)  NOT NULL DEFAULT '1.0.0',
    size        VARCHAR(40)  NOT NULL DEFAULT '',
    model_type  VARCHAR(60)  NOT NULL DEFAULT '',
    accuracy    VARCHAR(20)  NOT NULL DEFAULT '',
    framework   VARCHAR(60)  NOT NULL DEFAULT '',
    description TEXT,
    model_path  VARCHAR(512) DEFAULT NULL,
    status      ENUM('active','deprecated','testing') NOT NULL DEFAULT 'testing',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- log_configs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_configs (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category    VARCHAR(120) NOT NULL,
    retention   VARCHAR(40)  NOT NULL DEFAULT '30 days',
    max_size    VARCHAR(40)  NOT NULL DEFAULT '500 MB',
    rotation    VARCHAR(40)  NOT NULL DEFAULT 'Daily',
    log_level   ENUM('info','debug','warning','error') NOT NULL DEFAULT 'info',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- llm_configs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS llm_configs (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    provider    VARCHAR(120) NOT NULL DEFAULT '',
    size        VARCHAR(40)  NOT NULL DEFAULT '',
    llm_type    VARCHAR(60)  NOT NULL DEFAULT '',
    context_len VARCHAR(20)  NOT NULL DEFAULT '',
    endpoint    VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,
    status      ENUM('deployed','configured','available') NOT NULL DEFAULT 'available',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- label_datasets  (labeling platform datasets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS label_datasets (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name         VARCHAR(200) NOT NULL,
    total_images INT UNSIGNED NOT NULL DEFAULT 0,
    labeled      INT UNSIGNED NOT NULL DEFAULT 0,
    auto_labeled INT UNSIGNED NOT NULL DEFAULT 0,
    verified     INT UNSIGNED NOT NULL DEFAULT 0,
    classes_json TEXT         NOT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- label_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS label_images (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dataset_id    INT UNSIGNED NOT NULL,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    status        ENUM('unlabeled','labeled','auto_labeled','verified') NOT NULL DEFAULT 'unlabeled',
    width         INT UNSIGNED NOT NULL DEFAULT 0,
    height        INT UNSIGNED NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_li_dataset FOREIGN KEY (dataset_id) REFERENCES label_datasets (id) ON DELETE CASCADE,
    INDEX idx_li_dataset (dataset_id),
    INDEX idx_li_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- label_annotations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS label_annotations (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    image_id        INT UNSIGNED NOT NULL,
    class_id        VARCHAR(80)  NOT NULL,
    class_name      VARCHAR(120) NOT NULL,
    x_center        FLOAT        NOT NULL,
    y_center        FLOAT        NOT NULL,
    ann_width       FLOAT        NOT NULL,
    ann_height      FLOAT        NOT NULL,
    confidence      FLOAT        DEFAULT NULL,
    is_auto_labeled TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ann_image FOREIGN KEY (image_id) REFERENCES label_images (id) ON DELETE CASCADE,
    INDEX idx_ann_image (image_id),
    INDEX idx_ann_auto  (is_auto_labeled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- training_jobs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_jobs (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    experiment_id   INT UNSIGNED DEFAULT NULL,
    dataset_id      INT UNSIGNED NOT NULL,
    model_type      VARCHAR(40)  NOT NULL DEFAULT 'yolov8n',
    epochs          SMALLINT UNSIGNED NOT NULL DEFAULT 50,
    batch_size      SMALLINT UNSIGNED NOT NULL DEFAULT 16,
    img_size        SMALLINT UNSIGNED NOT NULL DEFAULT 640,
    status          ENUM('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
    progress        TINYINT UNSIGNED NOT NULL DEFAULT 0,
    current_epoch   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    best_map50      FLOAT DEFAULT NULL,
    best_map50_95   FLOAT DEFAULT NULL,
    train_loss      FLOAT DEFAULT NULL,
    output_dir      VARCHAR(512) DEFAULT NULL,
    log_file        VARCHAR(512) DEFAULT NULL,
    error_message   TEXT DEFAULT NULL,
    started_at      DATETIME DEFAULT NULL,
    completed_at    DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_tj_dataset FOREIGN KEY (dataset_id) REFERENCES label_datasets (id) ON DELETE RESTRICT,
    INDEX idx_tj_status  (status),
    INDEX idx_tj_dataset (dataset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- llm_analyses  (AI vision image analysis results)
-- ------------------------------------------------------------
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
    CONSTRAINT fk_la_image   FOREIGN KEY (image_id)   REFERENCES label_images   (id) ON DELETE SET NULL,
    CONSTRAINT fk_la_dataset FOREIGN KEY (dataset_id) REFERENCES label_datasets (id) ON DELETE SET NULL,
    INDEX idx_la_dataset  (dataset_id),
    INDEX idx_la_provider (model_provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- llm_jobs  (LLM fine-tuning jobs)
-- ------------------------------------------------------------
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
    status        ENUM('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- chat_sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title      VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- chat_messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id INT UNSIGNED NOT NULL,
    role       ENUM('user','assistant','system') NOT NULL,
    content    LONGTEXT     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE,
    INDEX idx_cm_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
