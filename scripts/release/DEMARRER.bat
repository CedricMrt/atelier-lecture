@echo off
setlocal
chcp 65001 >nul
title Atelier Lecture - Serveur de classe

set "ROOT=%~dp0"
set "NODE=%ROOT%node\node.exe"

if not exist "%NODE%" (
  echo Le dossier "node" est introuvable.
  echo Extrais tout le contenu du ZIP, puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%apps\server\dist\index.js" (
  echo Les fichiers de l'application sont introuvables.
  echo Extrais tout le contenu du ZIP, puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

cd /d "%ROOT%apps\server"

if "%PORT%"=="" set "PORT=3000"

echo ==========================================
echo   ATELIER LECTURE
echo ==========================================
echo.
echo Ne ferme pas cette fenetre pendant la classe.
echo.

rem Sauvegarde automatique au demarrage (au plus une par heure).
"%NODE%" dist\scripts\backup.js --quiet

rem Ouvre l'espace enseignant apres quelques secondes, le temps que le serveur demarre.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'https://localhost:%PORT%/adulte/connexion'"

"%NODE%" dist\index.js

echo.
echo Le serveur s'est arrete.
pause
