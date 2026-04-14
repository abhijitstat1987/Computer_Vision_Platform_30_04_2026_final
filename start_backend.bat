@echo off
cd /d "%~dp0"
set PYTHONPATH=
call .venv\Scripts\activate.bat
echo Starting Flask backend...
python run.py
if errorlevel 1 (
    echo.
    echo Flask exited with error. Press any key to close.
    pause >nul
)
