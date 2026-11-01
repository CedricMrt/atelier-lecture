@echo off
title Atelier Lecture - Installation
cd /d "%~dp0.."

echo ==========================================
echo   ATELIER LECTURE - INSTALLATION
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe sur ce PC.
  echo.
  echo 1. Telecharge Node.js 20 LTS : https://nodejs.org
  echo 2. Installe-le avec les options par defaut.
  echo 3. Relance ce fichier.
  echo.
  pause
  exit /b
)

echo Node.js detecte.
echo.

if not exist data mkdir data
if not exist backups mkdir backups
if not exist logs mkdir logs

echo Installation des dependances...
echo Cela peut prendre quelques minutes.
echo.

call npm install
if errorlevel 1 (
  echo.
  echo Erreur pendant l'installation.
  pause
  exit /b
)

echo.
echo Compilation de l'application...
call npm run build:all
if errorlevel 1 (
  echo.
  echo Erreur pendant la compilation.
  pause
  exit /b
)

echo.
echo ==========================================
echo   INSTALLATION TERMINEE
echo ==========================================
echo.
echo Pour lancer l'application :
echo Double-clique sur DEMARRER.bat
echo.
pause