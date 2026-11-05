$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendRoot = $PSScriptRoot
$pythonExe = Join-Path $backendRoot "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    $pythonExe = "D:\Anaconda3\envs\vton\python.exe"
}

if (-not (Test-Path $pythonExe)) {
    throw "Python executable not found at $pythonExe. Please create the virtual environment in $backendRoot\venv."
}

Set-Location $backendRoot
$env:PYTHONPATH = $repoRoot

# Kill any existing processes on port 8001
$existingProcess = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($existingProcess) {
    Stop-Process -Id $existingProcess.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Starting backend from $backendRoot using Python at $pythonExe..."
Write-Host "Docs: http://127.0.0.1:8001/docs"
Write-Host "PYTHONPATH: $env:PYTHONPATH"

# Start backend without --reload to avoid socket permission issues
& $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --access-log --log-level info --timeout-keep-alive 3600
