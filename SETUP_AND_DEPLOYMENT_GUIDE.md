# Industrial AI Vision Platform — Setup & Deployment Guide

> **Repository:** `git@github.com:abhijitstat1987/Computer_Vision_Platform_30_04_2026_final.git`

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Pull from GitHub](#2-pull-from-github)
3. [Environment Configuration](#3-environment-configuration)
4. [Data Backup (Before Any Update)](#4-data-backup-before-any-update)
5. [Option A — Run with Docker (Recommended)](#5-option-a--run-with-docker-recommended)
6. [Option B — Run Locally (Development)](#6-option-b--run-locally-development)
7. [Restore Previous Data Backup](#7-restore-previous-data-backup)
8. [Seed Demo Data](#8-seed-demo-data)
9. [Verify the Platform](#9-verify-the-platform)
10. [Stopping the Platform](#10-stopping-the-platform)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Install these tools before proceeding.

| Tool | Version | Purpose |
|------|---------|---------|
| Git | Any recent | Clone / pull code |
| Docker Desktop | 4.x+ | Containerised deployment |
| Docker Compose | 2.x+ (bundled with Docker Desktop) | Multi-service orchestration |
| Python | 3.12 | Local development only |
| Node.js | 20.x | Local development only |
| MySQL | 8.0 | Local development only (Docker has its own) |

> For **Docker deployment** you only need Git + Docker Desktop.  
> For **local development** you also need Python 3.12, Node.js 20, and a local MySQL 8.0 instance.

---

## 2. Pull from GitHub

### First-time clone

```bash
git clone git@github.com:abhijitstat1987/Computer_Vision_Platform_30_04_2026_final.git
cd Computer_Vision_Platform_30_04_2026_final
```

### Update an existing local copy

```bash
# 1. Back up your data FIRST (see Section 4)
# 2. Pull latest code
git pull origin main
```

> Always back up your database and uploads before pulling, in case schema changes are included.

---

## 3. Environment Configuration

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
FLASK_APP=run.py
FLASK_ENV=development          # use "production" for Docker / live deployment

SECRET_KEY=change-this-to-a-random-string

# MySQL connection
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost              # use "mysql" when running inside Docker
DB_PORT=3306
DB_NAME=vision_platform_db

# Allowed browser origins (comma-separated, no trailing slash)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5176
```

> **Docker note:** When using Docker Compose, environment variables are passed directly in `docker-compose.yml`. The `.env` file is only used for local development.

---

## 4. Data Backup (Before Any Update)

Run these steps **before** pulling new code or rebuilding containers so you do not lose existing data.

### 4.1 Back up the MySQL database

#### Docker deployment

```bash
# Replace "your_password" with your DB_PASSWORD (empty string "" if no password)
docker exec cv_mysql mysqldump \
  -u root \
  vision_platform_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Local MySQL

```bash
mysqldump -u root -p vision_platform_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

> On Windows (Command Prompt), replace `$(date +%Y%m%d_%H%M%S)` with a manual timestamp, e.g. `backup_20260430.sql`.

### 4.2 Back up uploaded files and training data

#### Docker deployment

```bash
# Copy uploads from Docker volumes to a local backup folder
docker cp cv_backend:/app/uploads ./backup_uploads_$(date +%Y%m%d)
docker cp cv_backend:/app/training_runs ./backup_training_runs_$(date +%Y%m%d)
```

#### Local development

```bash
# Windows — copy the folders manually
xcopy /E /I uploads backup_uploads_%date:~-4,4%%date:~-10,2%%date:~-7,2%
xcopy /E /I training_runs backup_training_runs_%date:~-4,4%%date:~-10,2%%date:~-7,2%
```

### 4.3 Backup checklist

- [ ] `backup_YYYYMMDD_HHMMSS.sql` — database dump
- [ ] `backup_uploads_YYYYMMDD/` — snapshots and labeled images
- [ ] `backup_training_runs_YYYYMMDD/` — training job artifacts and exported models

---

## 5. Option A — Run with Docker (Recommended)

This is the simplest path. Docker handles MySQL, the Flask backend, and the React frontend automatically.

### 5.1 First-time start

```bash
# Build all images and start containers in the background
docker-compose up --build -d
```

This will:
- Start a MySQL 8.0 container and auto-apply `schema.sql`
- Build and start the Flask backend (Gunicorn on port 5000)
- Build and start the React frontend served by nginx (port 80)

### 5.2 Wait for healthy status

```bash
docker-compose ps
```

All three services (`cv_mysql`, `cv_backend`, `cv_frontend`) should show **Up** or **healthy** within 1–2 minutes.

### 5.3 Open the platform

```
http://localhost
```

### 5.4 Subsequent starts (no rebuild needed)

```bash
docker-compose up -d
```

### 5.5 Rebuild after code changes

```bash
docker-compose up --build -d
```

---

## 6. Option B — Run Locally (Development)

Use this when you want hot-reload for active development.

### 6.1 Create MySQL database

Log into your local MySQL instance and run:

```sql
CREATE DATABASE IF NOT EXISTS vision_platform_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then load the schema:

```bash
mysql -u root -p vision_platform_db < schema.sql
```

### 6.2 Set up Python backend

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 6.3 Start the backend

```bash
python run.py
```

Backend runs on **http://localhost:5100**

### 6.4 Set up and start the frontend

```bash
cd "Computer Vision Platform"

# Install Node dependencies (first time only)
npm install

# Start dev server with hot reload
npm run dev
```

Frontend runs on **http://localhost:5173**

> The frontend Vite dev server proxies `/api/` requests to `http://localhost:5100` automatically.

---

## 7. Restore Previous Data Backup

Use this to bring back data after a fresh install or after a failed update.

### 7.1 Restore the database

#### Docker deployment

```bash
# Make sure MySQL container is running
docker-compose up -d mysql

# Wait ~30 seconds for MySQL to be ready, then restore
docker exec -i cv_mysql mysql -u root vision_platform_db < backup_YYYYMMDD_HHMMSS.sql
```

#### Local MySQL

```bash
mysql -u root -p vision_platform_db < backup_YYYYMMDD_HHMMSS.sql
```

### 7.2 Restore uploaded files

#### Docker deployment

```bash
# Copy backup folders back into the running backend container
docker cp backup_uploads_YYYYMMDD/. cv_backend:/app/uploads/
docker cp backup_training_runs_YYYYMMDD/. cv_backend:/app/training_runs/
```

#### Local development

```bash
# Windows
xcopy /E /I backup_uploads_YYYYMMDD uploads
xcopy /E /I backup_training_runs_YYYYMMDD training_runs
```

### 7.3 Restart the backend

```bash
# Docker
docker-compose restart backend

# Local
# Stop and re-run: python run.py
```

---

## 8. Seed Demo Data

Run these only on a **fresh empty database** to populate the platform with sample data.

```bash
# Activate virtual environment first (local) or exec into container (Docker)

# Docker: open a shell in the backend container
docker exec -it cv_backend bash

# Then run seed scripts:

# Full platform setup — projects, cameras, devices, models, alerts
python seed_full_platform.py

# 100 synthetic training images + a training job
python seed_test_data.py

# Annotation data for training
python seed_annotations_train.py
```

> Do **not** run seed scripts on a database that already has production data — they will add duplicate records.

---

## 9. Verify the Platform

```bash
# Local
python verify_platform.py

# Docker
docker exec cv_backend python verify_platform.py
```

This checks that all API endpoints, database tables, and file directories are correctly configured.

---

## 10. Stopping the Platform

### Docker

```bash
# Stop containers (data is preserved in Docker volumes)
docker-compose down

# Stop AND delete all data volumes (full reset — use with caution)
docker-compose down -v
```

### Local development

- Stop the backend: `Ctrl+C` in the backend terminal
- Stop the frontend: `Ctrl+C` in the frontend terminal

---

## 11. Troubleshooting

### MySQL container not healthy

```bash
docker logs cv_mysql
```

Common cause: port 3306 already in use by a local MySQL instance.  
Fix: stop the local MySQL service before starting Docker, or change the host port mapping in `docker-compose.yml` to `"3307:3306"` and update `DB_PORT`.

### Backend fails to connect to database

```bash
docker logs cv_backend
```

- Verify `DB_HOST=mysql` in `docker-compose.yml` (not `localhost`)
- Verify `DB_PASSWORD` matches the MySQL container password

### Frontend shows blank page or API errors

```bash
docker logs cv_frontend
```

- Confirm the backend is running: `docker-compose ps`
- The nginx config proxies `/api/` to the backend — if the backend is down, all API calls fail

### SSH / Git permission denied on push

- Ensure your SSH public key is added to the GitHub account under **Settings → SSH and GPG keys**
- Test: `ssh -T git@github.com` — should respond with `Hi <username>!`

### Port conflicts (local development)

| Service | Default Port |
|---------|-------------|
| Backend (local) | 5100 |
| Frontend dev server | 5173 |
| Backend (Docker) | 5000 |
| Frontend (Docker/nginx) | 80 |
| MySQL | 3306 |

If any port is in use, stop the conflicting process or edit the port in `run.py` (backend) or `vite.config.ts` (frontend).

### Re-applying the schema after a reset

```bash
# Docker: schema is auto-applied only when the mysql_data volume is empty
# To force re-apply, remove the volume first:
docker-compose down -v
docker-compose up --build -d
```

---

*Last updated: 30 April 2026*
