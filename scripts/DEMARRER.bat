@echo off
title Atelier Lecture - Serveur de classe
cd /d "%~dp0.."

echo ==========================================
echo   ATELIER LECTURE
echo ==========================================
echo.
echo Recherche de l'adresse du PC...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set IP=%%a
)

set IP=%IP: =%

echo Adresse a utiliser sur les tablettes :
echo http://%IP%:3000
echo.

start "" "http://localhost:3000/adulte/connexion"

call npm run start

echo.
echo Le serveur s'est arrete.
pause