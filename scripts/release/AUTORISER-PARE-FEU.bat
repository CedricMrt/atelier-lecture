@echo off
setlocal
chcp 65001 >nul
title Atelier Lecture - Autoriser les tablettes

set "ROOT=%~dp0"
set "NODE=%ROOT%node\node.exe"

net session >nul 2>&1
if errorlevel 1 (
  echo Ce fichier doit etre lance en administrateur :
  echo clic droit sur le fichier, puis "Executer en tant qu'administrateur".
  echo.
  pause
  exit /b 1
)

if not exist "%NODE%" (
  echo Le dossier "node" est introuvable.
  echo Extrais tout le contenu du ZIP, puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="Atelier Lecture" >nul 2>&1

netsh advfirewall firewall add rule name="Atelier Lecture" dir=in action=allow program="%NODE%" enable=yes profile=any

if errorlevel 1 (
  echo.
  echo La regle n'a pas pu etre creee.
) else (
  echo.
  echo C'est fait : les tablettes pourront se connecter a ce PC.
  echo Si tu deplaces le dossier, relance ce fichier.
)

echo.
pause
