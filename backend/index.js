const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const {ensureModelLoaded, imageBufferToEmbedding, cosineSimilarity, loadDatabase, saveDatabase} = require('./model');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'db', 'pills.json');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const app = express();
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ storage: multer.memoryStorage() });

// health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// register a pill image and store embedding
app.post('/register-pill', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file required (field name: image)' });
    const name = req.body.name || 'unknown';
    await ensureModelLoaded();

    const embedding = await imageBufferToEmbedding(req.file.buffer);

    const id = uuidv4();
    const filename = `${id}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const db = loadDatabase(DB_PATH);
    db.push({ id, name, imagePath: `uploads/${filename}`, embedding });
    saveDatabase(DB_PATH, db);

    return res.json({ success: true, id, name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// verify pill
app.post('/verify-pill', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file required (field name: image)' });
    await ensureModelLoaded();

    const probe = await imageBufferToEmbedding(req.file.buffer);
    const db = loadDatabase(DB_PATH);

    let best = { id: null, name: null, score: -1 };
    for (const entry of db) {
      const score = cosineSimilarity(probe, entry.embedding);
      if (score > best.score) {
        best = { id: entry.id, name: entry.name, score };
      }
    }

    const MATCH_THRESHOLD = 0.65; // tune this
    if (best.score >= MATCH_THRESHOLD) {
      return res.json({ match: true, id: best.id, name: best.name, score: best.score });
    } else {
      return res.json({ match: false, score: best.score });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MediGuardian backend listening on port ${PORT}`);
});
