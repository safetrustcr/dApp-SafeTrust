<#
.SYNOPSIS
    Runs all Hasura SQL acceptance checks against the local Postgres container.

.DESCRIPTION
    Iterates every verify_*.sql file under infra/hasura/verification/ and
    executes each through the running Postgres container via docker compose exec.
    Prints a pass / FAIL summary for every check and exits non-zero if any fail.

.PARAMETER PgService
    The docker-compose service name that runs Postgres.  Default: postgres

.PARAMETER PgUser
    Postgres user inside the container.  Default: postgres

.PARAMETER PgDatabase
    Database name to connect to.  Default: postgres

.PARAMETER VerificationDir
    Directory that contains verify_*.sql files.  Default: infra/hasura/verification

.EXAMPLE
    # Run from the repo root with default settings
    .\infra\hasura\verification\run_checks.ps1

.EXAMPLE
    # Override service name and database
    .\infra\hasura\verification\run_checks.ps1 -PgService db -PgDatabase safetrust
#>
[CmdletBinding()]
param(
    [string] $PgService      = 'postgres',
    [string] $PgUser         = 'postgres',
    [string] $PgDatabase     = 'postgres',
    [string] $VerificationDir = 'infra/hasura/verification',
    [ValidateSet('up', 'down')]
    [string] $Phase          = 'up'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
function Write-Pass([string] $label) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
}

function Write-Fail([string] $label, [string] $detail) {
    Write-Host "  [FAIL] $label" -ForegroundColor Red
    if ($detail) {
        Write-Host "         $detail" -ForegroundColor DarkYellow
    }
}

# ------------------------------------------------------------------
# Locate SQL files
# ------------------------------------------------------------------
$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.Parent.FullName
$verDir   = Join-Path $repoRoot $VerificationDir

if (-not (Test-Path $verDir)) {
    Write-Error "Verification directory not found: $verDir"
    exit 1
}

# Select phase-specific checks so UP and DOWN assertions are not mixed.
$allSqlFiles = @(Get-ChildItem -Path $verDir -Filter 'verify_*.sql' | Sort-Object Name)
if ($Phase -eq 'up') {
    $sqlFiles = @($allSqlFiles | Where-Object { $_.Name -notlike 'verify_down_*' })
} else {
    $sqlFiles = @($allSqlFiles | Where-Object { $_.Name -like 'verify_down_*' })
}

if ($sqlFiles.Count -eq 0) {
    Write-Warning "No SQL checks found for phase '$Phase' in $verDir"
    exit 0
}

# ------------------------------------------------------------------
# Confirm docker compose is reachable
# ------------------------------------------------------------------
$null = & docker compose ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose ps failed - is the stack running? Run: docker compose up -d"
    exit 1
}

# ------------------------------------------------------------------
# Execute each SQL file
# ------------------------------------------------------------------
$passed  = 0
$failed  = 0
$results = [System.Collections.Generic.List[PSCustomObject]]::new()

Write-Host "`nSafeTrust Hasura acceptance checks ($Phase)" -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Cyan

foreach ($file in $sqlFiles) {
    $label = $file.BaseName

    # Convert the absolute path to a container-friendly relative path that
    # docker compose can redirect into psql via stdin (-T reads from stdin).
    $relativePath = $file.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')

    # docker compose exec reads stdin only when -T is given (no pseudo-TTY).
    $output = & docker compose exec -T $PgService `
        psql -U $PgUser -d $PgDatabase -v ON_ERROR_STOP=1 -f $relativePath 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Pass $label
        $passed++
        $results.Add([PSCustomObject]@{ File = $label; Result = 'PASS'; Detail = '' })
    } else {
        $detail = ($output | Where-Object { $_ -match 'ERROR|FATAL|EXCEPTION' } | Select-Object -First 1) -as [string]
        Write-Fail $label $detail
        $failed++
        $results.Add([PSCustomObject]@{ File = $label; Result = 'FAIL'; Detail = $detail })
    }
}

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
Write-Host "------------------------------------" -ForegroundColor Cyan
Write-Host "  Passed : $passed" -ForegroundColor $(if ($passed -gt 0) { 'Green'  } else { 'White' })
Write-Host "  Failed : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red'    } else { 'White' })
Write-Host ""

if ($failed -gt 0) {
    Write-Host "One or more checks failed. Review the output above." -ForegroundColor Red
    exit 1
}

Write-Host "All checks passed." -ForegroundColor Green
exit 0
