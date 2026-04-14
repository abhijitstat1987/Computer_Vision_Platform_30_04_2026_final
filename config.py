import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ----- Core Flask -----
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    DEBUG      = False
    TESTING    = False

    # ----- MySQL via SQLAlchemy -----
    DB_USER     = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "3306")
    DB_NAME     = os.getenv("DB_NAME", "vision_platform_db")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{quote_plus(os.getenv('DB_PASSWORD', ''))}"
        f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}"
        f"/{os.getenv('DB_NAME', 'vision_platform_db')}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping":  True,
        "pool_recycle":   3600,
        "pool_size":      10,
        "max_overflow":   5,
        "connect_args":   {"connect_timeout": 5},  # fail fast if MySQL is down
    }

    # ----- Uploads -----
    BASE_DIR              = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER         = os.path.join(BASE_DIR, "uploads", "snapshots")
    LABEL_IMAGES_FOLDER   = os.path.join(BASE_DIR, "uploads", "images")
    TRAINING_OUTPUT_DIR   = os.path.join(BASE_DIR, "training_runs")
    MAX_CONTENT_LENGTH    = 64 * 1024 * 1024   # 64 MB max upload

    # ----- CORS -----
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

    # ----- Pagination defaults -----
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE     = 100


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
    "default":     DevelopmentConfig,
}
