@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul || (echo [FEHLER] Node.js fehlt im PATH.& pause & exit /b 1)
where py >nul 2>nul || (echo [FEHLER] Python Launcher ^(py^) fehlt im PATH.& pause & exit /b 1)
start "Once Human Archiv - Website" cmd /k "cd /d ""%CD%"" && py -m http.server 5500 --bind 127.0.0.1"
start "Once Human Archiv - Bridge" cmd /k "cd /d ""%CD%"" && node companion\bridge\server.js"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500/index.html#/map"
echo Website und Bridge wurden lokal gestartet.
echo Kopiere den Provider-Token aus dem Bridge-Fenster in die Overwolf-Companion-Einstellungen.
endlocal
