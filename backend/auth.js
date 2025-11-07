const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('./database');

const router = express.Router();

// Register: name, email, password, role (patient|caregiver)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'user exists' });

    const userId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    const passwordHash = bcrypt.hashSync(password, 8);
    
    const user = new User({
      userId,
      name: name || '',
      email,
      role: role || 'patient',
      passwordHash
    });

    await user.save();
    console.log('[AUTH] User registered:', email);

    return res.json({ success: true, id: userId, email, role: user.role });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Login: email, password -> token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const payload = { id: user.userId, email: user.email, role: user.role, name: user.name };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '12h' });

    console.log('[AUTH] User logged in:', email);

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Get users list (for caregivers to see patients)
router.get('/users', verifyToken, async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = {};
    if (role) query.role = role;
    
    const users = await User.find(query).select('userId name email role createdAt');
    
    const safeUsers = users.map(u => ({
      id: u.userId,
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
    req.userId = payload.id; // Add userId to request for easy access
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
