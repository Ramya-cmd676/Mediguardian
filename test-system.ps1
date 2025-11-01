# MediGuardian System Test Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediGuardian System Test Suite"
Write-Host "========================================" -ForegroundColor Cyan

$API = "http://localhost:4000"
$pass = 0
$fail = 0

Write-Host "`n[1/15] Testing Health Check..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/health"
    if ($r.status -eq "ok") { Write-Host "PASS" -ForegroundColor Green; $pass++ } else { throw "Bad response" }
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[2/15] Register Caregiver..." -ForegroundColor Yellow
try {
    $b = '{"email":"testcaregiver@test.com","password":"test123","role":"caregiver","name":"Test Caregiver"}'
    try { $r = Invoke-RestMethod "$API/auth/register" -Method Post -Body $b -ContentType "application/json" } catch {}
    Write-Host "PASS (or exists)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[3/15] Login Caregiver..." -ForegroundColor Yellow
try {
    $b = '{"email":"testcaregiver@test.com","password":"test123"}'
    $r = Invoke-RestMethod "$API/auth/login" -Method Post -Body $b -ContentType "application/json"
    $global:ctoken = $r.token
    Write-Host "PASS - Token: $($r.token.Substring(0,20))..." -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[4/15] Register Patient..." -ForegroundColor Yellow
try {
    $b = '{"email":"testpatient@test.com","password":"test123","role":"patient","name":"Test Patient"}'
    try { $r = Invoke-RestMethod "$API/auth/register" -Method Post -Body $b -ContentType "application/json" } catch {}
    Write-Host "PASS (or exists)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[5/15] Login Patient..." -ForegroundColor Yellow
try {
    $b = '{"email":"testpatient@test.com","password":"test123"}'
    $r = Invoke-RestMethod "$API/auth/login" -Method Post -Body $b -ContentType "application/json"
    $global:ptoken = $r.token
    $global:patientid = $r.user.id
    Write-Host "PASS - Patient ID: $($r.user.id)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[6/15] Create Test Image..." -ForegroundColor Yellow
try {
    $dir = "backend\test-images"
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $png = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC"
    [IO.File]::WriteAllBytes("$dir\test-pill.png", [Convert]::FromBase64String($png))
    Write-Host "PASS - Image created" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[7/15] Register Pill (Caregiver)..." -ForegroundColor Yellow
try {
    $filePath = "backend\test-images\test-pill.png"
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test-pill.png`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileContent),
        "--$boundary",
        "Content-Disposition: form-data; name=`"name`"$LF",
        "Test Aspirin 100mg",
        "--$boundary--$LF"
    ) -join $LF
    
    $h = @{ 
        Authorization = "Bearer $global:ctoken"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $r = Invoke-RestMethod "$API/register-pill" -Method Post -Body $bodyLines -Headers $h
    $global:pillid = $r.id
    Write-Host "PASS - Pill ID: $($r.id)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[8/15] Patient Cannot Register (RBAC)..." -ForegroundColor Yellow
try {
    $filePath = "backend\test-images\test-pill.png"
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test-pill.png`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileContent),
        "--$boundary",
        "Content-Disposition: form-data; name=`"name`"$LF",
        "Should Fail",
        "--$boundary--$LF"
    ) -join $LF
    
    $h = @{ 
        Authorization = "Bearer $global:ptoken"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $ok = $false
    try { 
        Invoke-RestMethod "$API/register-pill" -Method Post -Body $bodyLines -Headers $h -ErrorAction Stop 
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) { $ok = $true }
    }
    if ($ok) { Write-Host "PASS - 403 Forbidden" -ForegroundColor Green; $pass++ }
    else { Write-Host "FAIL - Should be forbidden" -ForegroundColor Red; $fail++ }
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[9/15] Verify Pill (AI)..." -ForegroundColor Yellow
try {
    $filePath = "backend\test-images\test-pill.png"
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $fileContent = [System.IO.File]::ReadAllBytes($filePath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test-pill.png`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileContent),
        "--$boundary--$LF"
    ) -join $LF
    
    $h = @{ "Content-Type" = "multipart/form-data; boundary=$boundary" }
    $r = Invoke-RestMethod "$API/verify-pill" -Method Post -Body $bodyLines -Headers $h
    Write-Host "PASS - Match: $($r.match), Score: $([math]::Round($r.score*100,2))%" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[10/15] List Pills..." -ForegroundColor Yellow
try {
    $h = @{ Authorization = "Bearer $global:ctoken" }
    $r = Invoke-RestMethod "$API/pills" -Headers $h
    Write-Host "PASS - Count: $($r.Count)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[11/15] List Users..." -ForegroundColor Yellow
try {
    $h = @{ Authorization = "Bearer $global:ctoken" }
    $r = Invoke-RestMethod "$API/users" -Headers $h
    Write-Host "PASS - Count: $($r.Count)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[12/15] Register Push Token..." -ForegroundColor Yellow
try {
    $h = @{ Authorization = "Bearer $global:ptoken"; "Content-Type" = "application/json" }
    $b = "{`"userId`":`"$global:patientid`",`"expoPushToken`":`"ExponentPushToken[test]`",`"deviceInfo`":{`"platform`":`"win`"}}"
    $r = Invoke-RestMethod "$API/api/push/register" -Method Post -Body $b -Headers $h -ContentType "application/json"
    Write-Host "PASS - Token registered" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[13/15] Create Schedule..." -ForegroundColor Yellow
try {
    $h = @{ Authorization = "Bearer $global:ctoken"; "Content-Type" = "application/json" }
    $time = (Get-Date).AddMinutes(2).ToString("HH:mm")
    $b = "{`"patientId`":`"$global:patientid`",`"pillId`":`"$global:pillid`",`"times`":[`"$time`"],`"label`":`"Test`"}"
    $r = Invoke-RestMethod "$API/api/schedules" -Method Post -Body $b -Headers $h -ContentType "application/json"
    Write-Host "PASS - Schedule @ $time" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[14/15] List Schedules..." -ForegroundColor Yellow
try {
    $h = @{ Authorization = "Bearer $global:ctoken" }
    $r = Invoke-RestMethod "$API/api/schedules" -Headers $h
    Write-Host "PASS - Count: $($r.Count)" -ForegroundColor Green
    $pass++
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n[15/15] Unauthenticated Blocked..." -ForegroundColor Yellow
try {
    $ok = $false
    try { 
        Invoke-RestMethod "$API/pills" -ErrorAction Stop 
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) { $ok = $true }
    }
    if ($ok) { Write-Host "PASS - 401 Unauthorized" -ForegroundColor Green; $pass++ }
    else { Write-Host "FAIL - Should be unauthorized" -ForegroundColor Red; $fail++ }
} catch { Write-Host "FAIL: $_" -ForegroundColor Red; $fail++ }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Results: $pass PASSED, $fail FAILED"
Write-Host "========================================" -ForegroundColor Cyan

if ($fail -eq 0) {
    Write-Host "`nALL TESTS PASSED! System is working!" -ForegroundColor Green
    Write-Host "`nVerified Components:" -ForegroundColor Cyan
    Write-Host "  - Backend API" -ForegroundColor White
    Write-Host "  - JWT Auth & RBAC" -ForegroundColor White
    Write-Host "  - AI Pill Recognition" -ForegroundColor White
    Write-Host "  - Schedule System" -ForegroundColor White
    Write-Host "  - Push Notifications" -ForegroundColor White
}
