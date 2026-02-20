
# -----------------------------------------------------------------------------
# AUTOMATED TEST ORCHESTRATOR
# -----------------------------------------------------------------------------
# 1. Stops running containers
# 2. Builds new LEAN Docker image
# 3. Starts container
# 4. Runs automated test suite
# 5. Cleans up
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host "🛑 Checking for existing containers..."
docker compose down
if ($LASTEXITCODE -ne 0) { Write-Warning "Docker down failed (maybe nothing running)." }

Write-Host "`n🏗️  Building Lean Image (Python 3.10-slim + PyTorch Nightly)..."
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) { Write-Error "Build Failed!"; exit 1 }

Write-Host "`n🚀 Starting Container in Background..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Error "Startup Failed!"; exit 1 }

Write-Host "`n⏳ Waiting for server to initialize (max 60s)..."
# Simple wait loop for port 8000
$max_retries = 30
$url = "http://localhost:8000/health"
$ready = $false

for ($i=0; $i -lt $max_retries; $i++) {
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction SilentlyContinue
        if ($response.status -eq "ok") {
            Write-Host "✅ Server is healthy!"
            $ready = $true
            break
        }
    } catch {
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Error "`n❌ Server failed to start within timeout. Check logs:"
    docker compose logs --tail 50
    docker compose down
    exit 1
}

Write-Host "`n🧪 Running Automated Test Suite..."
# Install test dependency if needed
pip install pytest requests uvicorn fastapi python-multipart > $null 2>&1

python test_docker_simulation.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ TEST PASSED SUCCESSFULLY!"
} else {
    Write-Host "`n❌ TEST FAILED!"
    docker compose logs
    exit 1
}

Write-Host "`n🧹 Cleaning up..."
docker compose down
Write-Host "Done."
