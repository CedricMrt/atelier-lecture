@echo off
setlocal
chcp 65001 >nul
title Atelier Lecture - Sauvegarde

set "ROOT=%~dp0"

if not exist "%ROOT%node\node.exe" (
  echo Le dossier "node" est introuvable.
  echo Extrais tout le contenu du ZIP, puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

cd /d "%ROOT%apps\server"

"%ROOT%node\node.exe" dist\scripts\backup.js

echo.
echo Les sauvegardes sont dans le dossier "backups".
echo.
pause
