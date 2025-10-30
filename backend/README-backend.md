# MediGuardian backend (MVP)

Requirements:
- Node.js 18+ (Windows PowerShell commands below)

Install & run (PowerShell):
```powershell
# from the backend directory
npm install

# start server
node index.js
```

Server runs on http://localhost:4000 by default.

Endpoints:
- GET /health
- POST /register-pill (multipart/form-data: field 'image', optional 'name')
- POST /verify-pill (multipart/form-data: field 'image')

Example curl (PowerShell):
```powershell
curl -X POST http://localhost:4000/register-pill -F "image=@C:/path/to/pill.jpg" -F "name=aspirin"
curl -X POST http://localhost:4000/verify-pill -F "image=@C:/path/to/test.jpg"
```

Notes:
- The first run loads the MobileNet model and may take 10–30s depending on network & CPU.
- Tune MATCH_THRESHOLD in index.js to adjust sensitivity.
