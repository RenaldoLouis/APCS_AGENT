<#
.SYNOPSIS
    Runs all unit tests across both apcs_website (frontend) and apcs_service (backend).
    Use this before pushing to catch regressions in critical business logic.

.DESCRIPTION
    - Frontend: Runs Jest via react-scripts (price calculation, discounts)
    - Backend: Runs Jest directly (invoice conversion, discount tiers)
    
    Exit code is non-zero if ANY test fails.
#>

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$allPassed = $true

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APCS Pre-Push Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Backend Tests ---
Write-Host "[1/2] Running Backend Tests (apcs_service)..." -ForegroundColor Yellow
Push-Location "$projectRoot\apcs_service"
try {
    & cmd /c "npx jest --forceExit --detectOpenHandles 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  BACKEND TESTS FAILED" -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  Backend tests passed" -ForegroundColor Green
    }
} catch {
    Write-Host "  BACKEND TESTS ERROR: $_" -ForegroundColor Red
    $allPassed = $false
} finally {
    Pop-Location
}

Write-Host ""

# --- Frontend Tests ---
Write-Host "[2/2] Running Frontend Tests (apcs_website)..." -ForegroundColor Yellow
Push-Location "$projectRoot\apcs_website"
try {
    & cmd /c "npx react-scripts test --watchAll=false --ci 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FRONTEND TESTS FAILED" -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  Frontend tests passed" -ForegroundColor Green
    }
} catch {
    Write-Host "  FRONTEND TESTS ERROR: $_" -ForegroundColor Red
    $allPassed = $false
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "  ALL TESTS PASSED — Safe to push!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  SOME TESTS FAILED — Fix before pushing!" -ForegroundColor Red
    exit 1
}
