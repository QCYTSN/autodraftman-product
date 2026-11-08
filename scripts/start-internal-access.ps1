$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendRoot = Join-Path $projectRoot 'backend'
$frontendRoot = Join-Path $projectRoot 'frontend'
$privateRoot = Join-Path $projectRoot 'data/internal-access'
$logRoot = Join-Path $projectRoot 'artifacts/internal-access'
$pythonPath = Join-Path $backendRoot '.venv-local/Scripts/python.exe'
if (!(Test-Path -LiteralPath (Join-Path $backendRoot '.env.internal'))) {
    throw 'Configure backend/.env.internal and migrate PostgreSQL first. See docs/internal-access.md.'
}
New-Item -ItemType Directory -Force $logRoot | Out-Null
$pgControl = Join-Path $privateRoot 'pgsql/bin/pg_ctl.exe'
$pgData = Join-Path $privateRoot 'pgdata'
if ((Test-Path -LiteralPath $pgControl) -and (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    & $pgControl -D $pgData status *> $null
    if ($LASTEXITCODE -ne 0) {
        & $pgControl -D $pgData -l (Join-Path $privateRoot 'postgres.log') start
        if ($LASTEXITCODE -ne 0) { throw 'The private account database did not start.' }
    }
}
if (!(Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','autodraftman_backend.main:app','--env-file','.env.internal','--host','127.0.0.1','--port','8788','--no-access-log' -WorkingDirectory $backendRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'api.out.log') -RedirectStandardError (Join-Path $logRoot 'api.err.log')
}
if (!(Get-NetTCPConnection -LocalPort 5179 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath (Get-Command node).Source -ArgumentList 'node_modules/vite/bin/vite.js','--mode','internal-test','--host','127.0.0.1','--port','5179','--strictPort' -WorkingDirectory $frontendRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'web.out.log') -RedirectStandardError (Join-Path $logRoot 'web.err.log')
}
Write-Output 'Internal sign-in: http://127.0.0.1:5179/login'
Write-Output 'This script does not start, restart or submit work to the frozen reconstruction service.'
