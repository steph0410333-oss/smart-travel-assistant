@echo off
cd /d "%~dp0"
echo Starting Smart Travel Assistant...
echo Open http://127.0.0.1:8000/ in your browser.
echo Keep this window open while using the prototype.
echo.
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo The server has stopped.
pause
