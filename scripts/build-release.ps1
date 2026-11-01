$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root "release"
$version = Get-Date -Format "yyyy-MM-dd-HHmm"

Write-Host "Compilation de l'application..."
Set-Location $root
npm run build:all

if (Test-Path $release) {
  Remove-Item $release -Recurse -Force
}

New-Item -ItemType Directory -Path $release | Out-Null

Copy-Item -Path (Join-Path $root "apps\tablet\dist") `
  -Destination (Join-Path $release "apps\tablet\dist") `
  -Recurse -Force

Copy-Item -Path (Join-Path $root "apps\server\dist") `
  -Destination (Join-Path $release "apps\server\dist") `
  -Recurse -Force

Copy-Item -Path (Join-Path $root "apps\server\package.json") `
  -Destination (Join-Path $release "apps\server\package.json")

Copy-Item -Path (Join-Path $root "package.json") `
  -Destination (Join-Path $release "package.json")

Copy-Item -Path (Join-Path $root "scripts\*.bat") `
  -Destination $release

Copy-Item -Path (Join-Path $root ".env.example") `
  -Destination $release

Copy-Item -Path (Join-Path $root "docs\GUIDE-ENSEIGNANTE.md") `
  -Destination $release

Compress-Archive `
  -Path "$release\*" `
  -DestinationPath (Join-Path $root "atelier-lecture-$version.zip")

Write-Host ""
Write-Host "Release creee : atelier-lecture-$version.zip"