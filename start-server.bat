@echo off
REM Serves the app at http://localhost:8080 (enables install-as-app + offline caching).
cd /d "%~dp0"
start "" http://localhost:8080
python -m http.server 8080
