# MediGuardian — MVP

An MVP for "MediGuardian: An Intelligent Mobile App for Ensuring Timely and Correct Medication Consumption".

This repo contains two folders:
- `backend/` — Node/Express server using `@tensorflow/tfjs-node` + MobileNet to extract image embeddings and perform pill verification.
- `frontend/` — Expo React Native app that captures pill images and calls the backend endpoints.

Quick start (PowerShell):

```powershell
# Backend
cd backend
npm install
node index.js

# In a second terminal: Frontend
cd frontend
npm install
expo start
```

Testing (PowerShell):

```powershell
curl -X POST http://localhost:4000/register-pill -F "image=@C:/full/path/to/pill1.jpg" -F "name=aspirin"
curl -X POST http://localhost:4000/verify-pill -F "image=@C:/full/path/to/test.jpg"
```

Notes:
- Replace `YOUR_PC_IP` in `frontend/App.js` with your machine IP if testing from a physical phone.
- Tune `MATCH_THRESHOLD` in `backend/index.js` after evaluating with real images; start ~0.6–0.7.
