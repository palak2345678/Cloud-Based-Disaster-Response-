@echo off
title Disaster Response Coordination Platform
echo ======================================================================
echo Disaster Response Coordination Platform
echo Priority-Based Live Resource Allocation Engine
echo ======================================================================
echo Starting server at http://127.0.0.1:8000 ...
echo Press Ctrl+C in this window to stop the server.
echo ======================================================================
cd /d "%~dp0"
python run.py
pause
