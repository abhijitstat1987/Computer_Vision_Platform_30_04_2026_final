@echo off
echo Building and starting Computer Vision Platform...
echo.

REM Use docker compose v2 (built into Docker Desktop)
docker compose up --build -d

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying docker-compose v1...
    docker-compose up --build -d
)

echo.
echo =============================================
echo  Services starting up:
echo  Frontend  : http://localhost
echo  Backend   : http://localhost:5000
echo  MySQL     : localhost:3306 (root / no password)
echo =============================================
