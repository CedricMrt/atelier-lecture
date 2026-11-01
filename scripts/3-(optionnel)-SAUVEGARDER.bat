@echo off
title Atelier Lecture - Sauvegarde
cd /d "%~dp0.."

if not exist backups mkdir backups

set DATESTAMP=%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%
set DATESTAMP=%DATESTAMP: =0%

if exist "data\atelier-lecture.db" (
  copy "data\atelier-lecture.db" "backups\atelier-lecture-%DATESTAMP%.db" >nul
  echo Sauvegarde créée dans le dossier "backups".
) else (
  echo Aucune base de donnees trouvée dans le dossier "data".
)

echo.
pause