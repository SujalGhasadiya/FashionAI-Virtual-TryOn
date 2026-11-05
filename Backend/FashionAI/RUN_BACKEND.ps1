$newRunner = Join-Path (Split-Path -Parent $PSScriptRoot) "backend\RUN_BACKEND.ps1"

if (-not (Test-Path $newRunner)) {
    $newRunner = "D:\VirtualTryon\Backend\backend\RUN_BACKEND.ps1"
}

if (-not (Test-Path $newRunner)) {
    throw "New backend runner not found at $newRunner"
}

Write-Host "FashionAI runner now forwards to the new backend structure..."
& powershell -ExecutionPolicy Bypass -File $newRunner
