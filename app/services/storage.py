"""
Storage service abstraction — MinIO (S3-compatible) or local filesystem fallback.

Usage:
    from app.services.storage import storage
    url = storage.upload("images", "datasets/1/photo.jpg", file_bytes, "image/jpeg")
    link = storage.get_url("images", "datasets/1/photo.jpg")
    storage.delete("images", "datasets/1/photo.jpg")

Environment variables:
    MINIO_ENDPOINT   — e.g. "localhost:9000" (omit → use local files)
    MINIO_ACCESS_KEY — default "minioadmin"
    MINIO_SECRET_KEY — default "minioadmin"
    MINIO_SECURE     — "true" / "false" (default false)
"""
from __future__ import annotations

import io
import os
import logging
from datetime import timedelta
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

_BASE_UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)


class StorageService:
    """Unified storage service: MinIO when configured, local filesystem otherwise."""

    def __init__(self) -> None:
        endpoint = os.getenv("MINIO_ENDPOINT", "").strip()
        self.use_minio = bool(endpoint)

        if self.use_minio:
            try:
                from minio import Minio  # type: ignore
                secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
                self._client = Minio(
                    endpoint,
                    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
                    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
                    secure=secure,
                )
                logger.info("StorageService: using MinIO at %s", endpoint)
            except ImportError:
                logger.warning(
                    "minio package not installed — falling back to local storage."
                )
                self.use_minio = False
        else:
            logger.info("StorageService: using local filesystem at %s", _BASE_UPLOAD_DIR)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _ensure_bucket(self, bucket: str) -> None:
        """Create MinIO bucket if it does not exist."""
        if not self._client.bucket_exists(bucket):
            self._client.make_bucket(bucket)

    def _local_path(self, bucket: str, key: str) -> str:
        return os.path.join(_BASE_UPLOAD_DIR, bucket, key)

    # ── Public API ────────────────────────────────────────────────────────────

    def upload(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload *data* bytes to bucket/key.
        Returns the public/presigned URL for the stored object.
        """
        if self.use_minio:
            self._ensure_bucket(bucket)
            self._client.put_object(
                bucket, key, io.BytesIO(data), length=len(data),
                content_type=content_type,
            )
        else:
            local = self._local_path(bucket, key)
            os.makedirs(os.path.dirname(local), exist_ok=True)
            with open(local, "wb") as f:
                f.write(data)

        return self.get_url(bucket, key)

    def get_url(self, bucket: str, key: str) -> str:
        """Return a URL (presigned for MinIO, relative path for local)."""
        if self.use_minio:
            return self._client.presigned_get_object(
                bucket, key, expires=timedelta(hours=24)
            )
        return f"/uploads/{bucket}/{key}"

    def delete(self, bucket: str, key: str) -> None:
        """Delete an object. Silently ignores missing files."""
        if self.use_minio:
            try:
                self._client.remove_object(bucket, key)
            except Exception as exc:
                logger.warning("MinIO delete failed for %s/%s: %s", bucket, key, exc)
        else:
            local = self._local_path(bucket, key)
            try:
                os.remove(local)
            except FileNotFoundError:
                pass

    def list_files(self, bucket: str, prefix: str = "") -> List[str]:
        """Return list of keys under bucket/prefix."""
        if self.use_minio:
            self._ensure_bucket(bucket)
            objects = self._client.list_objects(bucket, prefix=prefix, recursive=True)
            return [obj.object_name for obj in objects]
        else:
            base = self._local_path(bucket, prefix)
            if not os.path.isdir(base):
                return []
            results: List[str] = []
            for root, _dirs, files in os.walk(base):
                for fname in files:
                    full = os.path.join(root, fname)
                    rel = os.path.relpath(full, self._local_path(bucket, ""))
                    results.append(rel.replace("\\", "/"))
            return results

    def file_exists(self, bucket: str, key: str) -> bool:
        """Check whether a file exists in storage."""
        if self.use_minio:
            try:
                self._client.stat_object(bucket, key)
                return True
            except Exception:
                return False
        return os.path.exists(self._local_path(bucket, key))

    def get_bytes(self, bucket: str, key: str) -> Optional[bytes]:
        """Download and return file bytes, or None if not found."""
        if self.use_minio:
            try:
                response = self._client.get_object(bucket, key)
                return response.read()
            except Exception:
                return None
        local = self._local_path(bucket, key)
        if not os.path.exists(local):
            return None
        with open(local, "rb") as f:
            return f.read()


# Singleton — import and use directly
storage = StorageService()
