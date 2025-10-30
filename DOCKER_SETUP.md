# MediGuardian - Docker Setup (Works on Any System!)

## Prerequisites
1. Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. After installation, restart your computer
3. Start Docker Desktop application

## Build and Run (3 Simple Commands!)

Open PowerShell or cmd and run:

```powershell
# Navigate to project
cd M:\Desktop\Ramya-major

# Build the Docker image (takes 3-5 minutes first time)
docker-compose build

# Start the backend server
docker-compose up
```

You should see:
```
backend_1  | MediGuardian backend listening on port 4000
```

Server is now running at: http://localhost:4000

## Test the Backend

Open a NEW PowerShell window (keep the server running):

```powershell
# Test health endpoint
curl http://localhost:4000/health

# Register a test pill (creates a tiny test image automatically)
docker-compose exec backend node scripts/test_flow.js
```

Expected output:
```
Register response: {"success":true,"id":"...","name":"testpill"}
Verify response: {"match":true,"id":"...","name":"testpill","score":0.9X}
```

## Test with Real Images

```powershell
# Register a pill with a real image
curl -X POST http://localhost:4000/register-pill -F "image=@C:\path\to\your\pill.jpg" -F "name=aspirin"

# Verify a pill
curl -X POST http://localhost:4000/verify-pill -F "image=@C:\path\to\test.jpg"
```

## Stop the Server

Press `Ctrl+C` in the terminal where docker-compose is running, or:

```powershell
docker-compose down
```

## Useful Commands

```powershell
# View logs
docker-compose logs -f

# Restart server
docker-compose restart

# Rebuild after code changes
docker-compose up --build

# Access container shell
docker-compose exec backend sh
```

## Troubleshooting

### Docker Desktop not starting
- Restart your computer
- Make sure Hyper-V is enabled (Windows Settings → Apps → Optional Features)

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running (check system tray)

### Port 4000 already in use
Change port in docker-compose.yml:
```yaml
ports:
  - "4001:4000"  # Use 4001 instead
```

### Build fails
```powershell
# Clean everything and rebuild
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up
```

## Next Steps

1. ✅ Backend running in Docker
2. 📱 Setup frontend (Expo app)
3. 🧪 Test with real pill images
4. 🚀 Deploy to cloud

The backend is now running completely isolated in Docker - no Node.js installation needed on your Windows machine!
