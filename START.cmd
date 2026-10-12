@echo off
cd /d "%~dp0"
node scripts\run-framework.mjs dev --port 5189 --hostname 127.0.0.1
pause
