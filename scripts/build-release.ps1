# Fabrique le ZIP "pret a lancer" pour le PC de l'enseignante.
#
# A lancer sur un PC Windows 64 bits (celui qui sert a developper) :
#     pnpm release
#     pnpm release -- -Version 0.2.0
#
# Le ZIP contient tout : l'application compilee, Node.js et les modules du serveur.
# Le PC de l'enseignante n'a besoin ni de Node, ni de pnpm, ni d'internet.
#
# Ce fichier ne contient volontairement que des caracteres ASCII
# (PowerShell 5 lit mal l'UTF-8 sans BOM).

param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "== $Title"
  & $Action

  if ($LASTEXITCODE -ne 0) {
    throw "Etape en echec : $Title (code $LASTEXITCODE)"
  }
}

function Require-Command {
  param([string]$Name, [string]$Hint)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' est introuvable. $Hint"
  }
}

# --- Verifications -----------------------------------------------------------

if ($env:OS -ne "Windows_NT") {
  throw "Ce script fabrique une version Windows : il doit etre lance sur Windows (le module better-sqlite3 est compile pour la machine qui l'installe)."
}

if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
  throw "Il faut un Windows 64 bits classique (x64) pour fabriquer la release."
}

Require-Command "node" "Installe Node.js LTS."
Require-Command "pnpm" "Installe pnpm (npm install -g pnpm)."
Require-Command "npm" "npm est fourni avec Node.js."

# Le tar de Windows (bsdtar), pas celui de Git Bash : le tar GNU lit "C:\..." comme "machine:chemin".
$windowsTar = Join-Path $env:SystemRoot "System32\tar.exe"
if (-not (Test-Path -LiteralPath $windowsTar)) {
  throw "tar.exe est introuvable dans System32 : il faut Windows 10 (version 1803 ou plus) ou Windows 11."
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = (Get-Content -Raw -LiteralPath (Join-Path $root "package.json") | ConvertFrom-Json).version
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  throw "Aucune version : ajoute un champ ""version"" dans package.json ou passe -Version."
}

$nodeExe = (& node -p "process.execPath").Trim()
$nodeVersion = (& node -p "process.version").Trim()

Write-Host "Version de l'application : $Version"
Write-Host "Node.js embarque         : $nodeVersion ($nodeExe)"

# --- Compilation -------------------------------------------------------------

Invoke-Step "Installation des dependances de developpement" {
  pnpm install --frozen-lockfile
}

Invoke-Step "Compilation (tablette + serveur)" {
  pnpm run build:all
}

foreach ($required in @("apps\tablet\dist\index.html", "apps\server\dist\index.js", "apps\server\dist\scripts\backup.js")) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $required))) {
    throw "Fichier manquant apres la compilation : $required"
  }
}

# --- Dossier de release ------------------------------------------------------

$releaseRoot = Join-Path $root "release"
$stage = Join-Path $releaseRoot "AtelierLecture"
$serverStage = Join-Path $stage "apps\server"
$zipName = "atelier-lecture-v$Version-windows.zip"
$zipPath = Join-Path $root $zipName

if (Test-Path -LiteralPath $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $serverStage -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "apps\tablet") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "node") -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $root "apps\tablet\dist") -Destination (Join-Path $stage "apps\tablet\dist") -Recurse
Copy-Item -LiteralPath (Join-Path $root "apps\server\dist") -Destination (Join-Path $serverStage "dist") -Recurse
Copy-Item -LiteralPath (Join-Path $root "apps\server\package.json") -Destination (Join-Path $serverStage "package.json")

Copy-Item -LiteralPath $nodeExe -Destination (Join-Path $stage "node\node.exe")

# Modules du serveur uniquement (sans les outils de developpement).
# Fait ici, sur Windows, pour que better-sqlite3 soit deja compile.
Invoke-Step "Installation des modules du serveur" {
  Push-Location $serverStage
  try {
    npm install --omit=dev --no-audit --no-fund
  }
  finally {
    Pop-Location
  }
}

# --- Module natif de better-sqlite3 ------------------------------------------
# Les versions recentes de npm bloquent les scripts d'installation : le fichier
# better_sqlite3.node n'est alors jamais telecharge. On lance donc nous-memes
# prebuild-install, avec le Node embarque (meme version que celle du ZIP).

$sqliteDir = Join-Path $serverStage "node_modules\better-sqlite3"
$prebuildCandidates = @(
  (Join-Path $serverStage "node_modules\prebuild-install\bin.js"),
  (Join-Path $sqliteDir "node_modules\prebuild-install\bin.js")
)
$prebuildBin = $prebuildCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $prebuildBin) {
  throw "prebuild-install est introuvable dans node_modules : impossible de recuperer le module natif de better-sqlite3."
}

Invoke-Step "Telechargement du module natif de better-sqlite3" {
  Push-Location $sqliteDir
  try {
    & (Join-Path $stage "node\node.exe") $prebuildBin
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $sqliteDir "build\Release\better_sqlite3.node"))) {
  throw "better_sqlite3.node est toujours absent apres prebuild-install."
}

# --- Test : le Node embarque charge-t-il bien les modules ? ------------------

$smokeSource = Join-Path $PSScriptRoot "release\smoke-test.cjs"
$smokeTarget = Join-Path $serverStage "smoke-test.cjs"

# Copie dans apps\server : require() cherche node_modules a cote du script.
Copy-Item -LiteralPath $smokeSource -Destination $smokeTarget

Invoke-Step "Test du Node embarque et des modules" {
  Push-Location $serverStage
  try {
    & (Join-Path $stage "node\node.exe") "smoke-test.cjs"
  }
  finally {
    Pop-Location
  }
}

Remove-Item -LiteralPath $smokeTarget -Force

# --- Fichiers pour l'enseignante ---------------------------------------------

foreach ($name in @("DEMARRER.bat", "SAUVEGARDER.bat", "AUTORISER-PARE-FEU.bat")) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot "release\$name") -Destination (Join-Path $stage $name)
}

$guide = Join-Path $root "docs\GUIDE-ENSEIGNANT(E).md"
if (Test-Path -LiteralPath $guide) {
  Copy-Item -LiteralPath $guide -Destination (Join-Path $stage "LISEZ-MOI.md")
}

Set-Content -LiteralPath (Join-Path $stage "VERSION.txt") -Value "Atelier Lecture $Version" -Encoding ASCII

# --- ZIP ---------------------------------------------------------------------

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

# tar (et non Compress-Archive) : les noms de fichiers et les chemins longs de node_modules passent mieux.
Invoke-Step "Creation du ZIP" {
  & $windowsTar -a -c -f $zipPath -C $releaseRoot AtelierLecture
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 1)

Write-Host ""
Write-Host "Release prete : $zipName ($sizeMb Mo)"
Write-Host ""
Write-Host "Etapes suivantes :"
Write-Host "  1. Teste-la : decompresse le ZIP dans un dossier simple et lance DEMARRER.bat"
Write-Host "  2. Publie-la : git tag v$Version ; git push origin v$Version"

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "  3. Puis : gh release create v$Version $zipName --title ""Atelier Lecture $Version"" --notes ""Voir LISEZ-MOI.md dans le ZIP."""
}
else {
  Write-Host "  3. Sur GitHub : Releases > Draft a new release > choisis le tag v$Version > glisse le ZIP"
}
