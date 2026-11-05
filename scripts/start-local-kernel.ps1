param(
    [string]$Credentials = 'D:\Github_Ku\FigFox-926\.env',
    [string]$SamPython = 'D:\fyp\sam3-local-test\runtime\.venv\Scripts\python.exe',
    [string]$SamBridge = 'D:\Github_Ku\FigFox-926\local\sam_bridge.py'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePython = Join-Path $projectRoot 'backend\.venv-local\Scripts\python.exe'
$frontendDir = Join-Path $projectRoot 'frontend'
$logRoot = Join-Path $projectRoot 'data\local-reconstruction\services'
foreach ($required in @($runtimePython, $SamPython, $SamBridge, $Credentials)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Missing local runtime file: $required. See docs/local-kernel.md." }
}
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$env:PYTHONUTF8 = '1'
$env:FIGFOX_KERNEL_ENV = (Resolve-Path -LiteralPath $Credentials).Path

function Test-LocalService([string]$Url) {
    try { $null = Invoke-RestMethod -Uri $Url -TimeoutSec 2; return $true }
    catch { return $false }
}
function Start-LocalProcess([string]$Name, [string]$Executable, [string[]]$Arguments, [string]$Directory) {
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot "$Name.out.log") -RedirectStandardError (Join-Path $logRoot "$Name.err.log")
    $process.Id | Set-Content -LiteralPath (Join-Path $logRoot "$Name.pid")
}
if (-not (Test-LocalService 'http://127.0.0.1:18080/health')) {
    Start-LocalProcess 'sam' $SamPython @(('"' + $SamBridge + '"'), '--host', '127.0.0.1', '--port', '18080') $projectRoot
}
if (-not (Test-LocalService 'http://127.0.0.1:8787/local-api/health')) {
    Start-LocalProcess 'api' $runtimePython @('-m', 'uvicorn', 'autodraftman_backend.local_reconstruction.app:app', '--host', '127.0.0.1', '--port', '8787') $projectRoot
}
if (-not (Test-LocalService 'http://127.0.0.1:5178/')) {
    $nodePath = (Get-Command node.exe).Source
    Start-LocalProcess 'web' $nodePath @('node_modules/vite/bin/vite.js', '--mode', 'local-kernel', '--host', '127.0.0.1', '--port', '5178', '--strictPort') $frontendDir
}
Write-Output 'Local workspace: http://127.0.0.1:5178/workspace'
Write-Output "Service logs: $logRoot"
