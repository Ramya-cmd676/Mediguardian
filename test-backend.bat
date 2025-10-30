@echo off
echo ========================================
echo Testing MediGuardian Backend
echo ========================================
echo.

echo Testing health endpoint...
curl -s http://localhost:4000/health
echo.
echo.

echo Running automated test (register + verify pill)...
docker-compose exec -T backend node scripts/test_flow.js

echo.
echo ========================================
echo Test complete!
echo ========================================
pause
