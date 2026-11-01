@echo off
title Atelier Lecture - Serveur de classe
cd /d "%~dp0.."

echo ==========================================
echo   ATELIER LECTURE
echo ==========================================
echo.
echo Ne ferme pas cette fenetre pendant la classe.
echo.

if not exist apps\server\data mkdir apps\server\data
if not exist apps\server\logs mkdir apps\server\logs
if not exist backups mkdir backups

start "" "https://localhost:3000/adulte/connexion"

call npm run start

echo.
echo Le serveur s'est arrete.
pause