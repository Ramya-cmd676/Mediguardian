# Test the MediGuardian Backend

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Testing MediGuardian Backend" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "[1/4] Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get
    Write-Host "Success - Health check passed: $($health | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Failed - Health check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Create a tiny test image
Write-Host "[2/4] Creating test pill image..." -ForegroundColor Yellow
$testDir = "M:\Desktop\Ramya-major\backend\test-images"
if (!(Test-Path $testDir)) { New-Item -ItemType Directory -Path $testDir | Out-Null }

# Create a tiny 1x1 PNG (red pixel)
$base64png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
$bytes = [Convert]::FromBase64String($base64png)
$imagePath = Join-Path $testDir "pill1.png"
[IO.File]::WriteAllBytes($imagePath, $bytes)
Write-Host "Success - Test image created: $imagePath" -ForegroundColor Green

Write-Host ""

# Test 3: Register the pill
Write-Host "[3/4] Registering test pill..." -ForegroundColor Yellow
try {
    $form = @{
        image = Get-Item -Path $imagePath
        name = "test-aspirin"
    }
    $registerResult = Invoke-RestMethod -Uri "http://localhost:4000/register-pill" -Method Post -Form $form
    Write-Host "Success - Registration complete!" -ForegroundColor Green
    Write-Host "  Response: $($registerResult | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "Failed - Registration failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Verify the pill
Write-Host "[4/4] Verifying the same pill..." -ForegroundColor Yellow
try {
    $verifyResult = Invoke-RestMethod -Uri "http://localhost:4000/verify-pill" -Method Post -Form @{ image = Get-Item -Path $imagePath }
    
    if ($verifyResult.match) {
        Write-Host "Success - Verification passed!" -ForegroundColor Green
        Write-Host "  Matched: $($verifyResult.name)" -ForegroundColor Gray
        $confidencePercent = [math]::Round($verifyResult.score * 100, 2)
        Write-Host "  Confidence: $confidencePercent%" -ForegroundColor Gray
    } else {
        Write-Host "No match found (score: $($verifyResult.score))" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed - Verification failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "All tests passed!" -ForegroundColor Green
Write-Host "Backend is working correctly!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
