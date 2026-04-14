@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\HP\Desktop\Claude Test Vision Platform\Computer Vision Platform"
echo Installing frontend dependencies...
npm install --legacy-peer-deps
echo.
echo Done. Exit code: %ERRORLEVEL%
