require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { findUser, createUser } = require('./users');
const { requireAuth, requireAdmin } = require('./auth');
const { jwtSecret, tokenExpiresIn, webAppUrl, apiKey, port } = require('./config');

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = findUser(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    username: user.username,
    role: user.role,
    allowedHosts: user.allowedHosts ?? null,
  };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: tokenExpiresIn });
  res.json({ token, user: payload });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// User management (admin only)
// ---------------------------------------------------------------------------

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, allowedHosts } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (allowedHosts !== undefined && allowedHosts !== null && !Array.isArray(allowedHosts)) {
    return res.status(400).json({ error: 'allowedHosts must be an array or null' });
  }
  try {
    const { bcryptRounds } = require('./config');
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    createUser(username, passwordHash, allowedHosts ?? null);
    res.status(201).json({ ok: true });
  } catch (err) {
    const status = err.message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Data proxy — keeps Google Apps Script secrets server-side
// ---------------------------------------------------------------------------

app.get('/api/data', requireAuth, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({
      error: 'Server not configured: add WEB_APP_URL and API_KEY to server/.env',
    });
  }
  try {
    const response = await fetch(`${webAppUrl}?key=${apiKey}`);
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Data fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch data from upstream' });
  }
});

// Approve or reject a pending meet by updating its row color in the Google Sheet.
// Colors: faint green (#d9ead3) for approved, faint red (#f4cccc) for rejected.
app.post('/api/approve', requireAuth, requireAdmin, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  const { sheetRow: sheetRowRaw, action } = req.body;
  const sheetRow = Number(sheetRowRaw);
  if (!Number.isInteger(sheetRow) || sheetRow < 1 || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'sheetRow (positive integer) and action (approve|reject) required' });
  }
  const color = action === 'approve' ? '#d9ead3' : '#f4cccc';
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey, sheetRow, color }),
    });
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Approve error:', err.message);
    res.status(502).json({ error: 'Failed to update upstream' });
  }
});

app.get('/api/check-update', requireAuth, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  try {
    const response = await fetch(`${webAppUrl}?key=${apiKey}&action=checkUpdate`);
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Update check error:', err.message);
    res.status(502).json({ error: 'Failed to check for updates' });
  }
});

// ---------------------------------------------------------------------------
// Serve built React app in production
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`Auth server running on port ${port}`);
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set in server/.env — using insecure default!');
  }
  if (!webAppUrl || !apiKey) {
    console.warn('⚠️  WEB_APP_URL or API_KEY not set in server/.env — data endpoints will fail!');
  }
});
