const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const USERS_DB = path.join(__dirname, 'db', 'users.json');

function ensureUsersDb() {
  if (!fs.existsSync(USERS_DB)) {
    fs.mkdirSync(path.dirname(USERS_DB), { recursive: true });
    fs.writeFileSync(USERS_DB, JSON.stringify([]));
  }
}

function loadUsers() {
  try {
    ensureUsersDb();
    const raw = fs.readFileSync(USERS_DB, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Failed to load users DB', err);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

// Register: name, email, password, role (patient|caregiver)
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const users = loadUsers();
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'user exists' });

    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    const passwordHash = bcrypt.hashSync(password, 8);
    const user = { id, name: name || '', email, role: role || 'patient', passwordHash, createdAt: new Date().toISOString() };

    users.push(user);
    saveUsers(users);

    return res.json({ success: true, id, email, role: user.role });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Login: email, password -> token
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '12h' });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Get users list (for caregivers to see patients)
router.get('/users', verifyToken, (req, res) => {
  try {
    const users = loadUsers();
    const { role } = req.query;
    
    let filteredUsers = users;
    if (role) {
      filteredUsers = users.filter(u => u.role === role);
    }
    
    // Return users without password hash
    const safeUsers = filteredUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    
    return res.json(safeUsers);
  } catch (err) {
    console.error('Get users error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  const secret = process.env.JWT_SECRET || 'dev-secret';
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'missing user' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { router, verifyToken, requireRole };
