require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { findUser, createUser, getAllUsers, updateUser, deleteUser } = require('./users');
const { requireAuth, requireAdmin } = require('./auth');
const { jwtSecret, tokenExpiresIn, webAppUrl, apiKey, port } = require('./config');

const app = express();

// ---------------------------------------------------------------------------
// Local meets storage (admin-added meets + field overrides for sheet meets)
// ---------------------------------------------------------------------------

const LOCAL_MEETS_FILE = path.join(__dirname, 'local-meets.json');

function readLocalMeets() {
  try {
    if (fs.existsSync(LOCAL_MEETS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_MEETS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading local meets file:', e.message);
  }
  return { overrides: {} };
}

function writeLocalMeets(data) {
  fs.writeFileSync(LOCAL_MEETS_FILE, JSON.stringify(data, null, 2), 'utf8');
}
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
  const { username, password, allowedHosts, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (role !== undefined && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "user"' });
  }
  if (allowedHosts !== undefined && allowedHosts !== null && !Array.isArray(allowedHosts)) {
    return res.status(400).json({ error: 'allowedHosts must be an array or null' });
  }
  try {
    const { bcryptRounds } = require('./config');
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    createUser(username, passwordHash, allowedHosts ?? null, role ?? 'user');
    res.status(201).json({ ok: true });
  } catch (err) {
    const status = err.message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  res.json(getAllUsers());
});

app.put('/api/users/:username', requireAuth, requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { username: newUsername, password, role, allowedHosts } = req.body;
  if (newUsername !== undefined && (!newUsername || typeof newUsername !== 'string' || !newUsername.trim())) {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }
  if (role !== undefined && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "user"' });
  }
  if (allowedHosts !== undefined && allowedHosts !== null && !Array.isArray(allowedHosts)) {
    return res.status(400).json({ error: 'allowedHosts must be an array or null' });
  }
  try {
    const { bcryptRounds } = require('./config');
    const updates = {};
    if (newUsername !== undefined) updates.newUsername = newUsername;
    if (password) updates.passwordHash = await bcrypt.hash(password, bcryptRounds);
    if (role !== undefined) updates.role = role;
    if (allowedHosts !== undefined) updates.allowedHosts = allowedHosts;
    updateUser(username, updates);
    res.json({ ok: true });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : err.message.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.delete('/api/users/:username', requireAuth, requireAdmin, (req, res) => {
  const { username } = req.params;
  if (username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    deleteUser(username);
    res.json({ ok: true });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
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

    // Apply any pending local overrides (proposed edits that the sheet owner hasn't acted on yet)
    const { overrides } = readLocalMeets();
    const mergedData = data.map(item => {
      const row = typeof item.sheetRow === 'number' ? item.sheetRow : null;
      if (row !== null && overrides[String(row)]) {
        return { ...item, ...overrides[String(row)] };
      }
      return item;
    });

    res.json(mergedData);
  } catch (err) {
    console.error('Data fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch data from upstream' });
  }
});

// Export the requesting user's approved meets as an iCalendar (.ics) file.
// Green-dominant bgColor = approved. allowedHosts from the JWT is enforced server-side
// so a user cannot export meets they cannot see in the UI.
app.get('/api/export.ics', requireAuth, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  try {
    const response = await fetch(`${webAppUrl}?key=${apiKey}`);
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
    const data = await response.json();

    const { overrides } = readLocalMeets();
    const mergedData = data.map(item => {
      const row = typeof item.sheetRow === 'number' ? item.sheetRow : null;
      if (row !== null && overrides[String(row)]) {
        return { ...item, ...overrides[String(row)] };
      }
      return item;
    });

    const { allowedHosts } = req.user;
    const scopedData = (allowedHosts && allowedHosts.length)
      ? mergedData.filter(item => allowedHosts.includes(item.Organisatie))
      : mergedData;

    function bgColorToStatus(bgColor) {
      if (!bgColor || bgColor === '#ffffff' || bgColor === 'white') return 'pending';
      const hex = bgColor.replace('#', '');
      if (hex.length !== 6) return 'pending';
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (g > r && g > b) return 'approved';
      if (r > g && r > b) return 'rejected';
      return 'pending';
    }

    function parseTimestamp(raw) {
      if (!raw) return null;
      if (typeof raw === 'number') { const d = new Date(raw); return isNaN(d) ? null : d; }
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); d.setSeconds(0, 0); return isNaN(d) ? null : d; }
      const swapped = s.replace(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/, (_, d, m, y) => `${m}/${d}/${y}`);
      const d2 = new Date(swapped);
      return isNaN(d2) ? null : d2;
    }

    const ical = require('ical-generator');
    const calendar = ical.default({
      name: 'Classroom Visits',
      prodId: { company: 'Lesbezoeken', product: 'Classroom Visit Schedule', language: 'EN' },
    });

    for (const item of scopedData) {
      if (bgColorToStatus(item.bgColor) !== 'approved') continue;
      const start = parseTimestamp(item.Timestamp);
      if (!start) continue;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const uid = typeof item.sheetRow === 'number'
        ? `${item.sheetRow}@lesbezoeken`
        : `${start.getTime()}-${Math.random().toString(36).slice(2)}@lesbezoeken`;
      calendar.createEvent({
        uid,
        start,
        end,
        summary: item.Organisatie || 'Classroom Visit',
        description: [
          `Organisation: ${item.Organisatie || '—'}`,
          `Class: ${item.Klas || '—'}`,
          `Professor: ${item.Lesgever || '—'}`,
          `Status: Approved`,
        ].join('\n'),
        status: 'CONFIRMED',
      });
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="classroom-visits.ics"',
      'Cache-Control': 'no-store',
    });
    res.send(calendar.toString());
  } catch (err) {
    console.error('ICS export error:', err.message);
    res.status(502).json({ error: 'Failed to generate calendar export' });
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

// Add a new meet as a proposition row in the sheet (yellow background, pending review).
// The Apps Script writes the row and returns the real sheetRow number.
app.post('/api/meets', requireAuth, requireAdmin, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  const { Timestamp, Organisatie, Klas, Lesgever } = req.body;
  if (!Timestamp || !Organisatie) {
    return res.status(400).json({ error: 'Timestamp and Organisatie required' });
  }
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        action: 'addProposition',
        data: { Timestamp, Organisatie, Klas: Klas || '', Lesgever: Lesgever || '' },
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('Add proposition upstream error:', response.status, text);
      throw new Error(`Upstream error ${response.status}: ${text.slice(0, 200)}`);
    }
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Upstream returned non-JSON: ${text.slice(0, 200)}`); }
    if (data.error) throw new Error(data.error);
    res.status(201).json({ ok: true, sheetRow: data.sheetRow });
  } catch (err) {
    console.error('Add proposition error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Propose edits to an existing sheet meet.
// Values in the sheet are NOT changed — the Apps Script writes cell notes so the
// sheet owner can review and decide whether to apply each proposed change.
// Field overrides are also stored locally so the calendar reflects them immediately.
app.patch('/api/meets/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!webAppUrl || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  const { id } = req.params;
  const fields = { ...req.body };

  const sheetRow = Number(id);
  if (!Number.isInteger(sheetRow) || sheetRow < 1) {
    return res.status(400).json({ error: 'Invalid meet ID — must be a positive sheet row number' });
  }

  // Build the changes object that goes to Apps Script (only sheet-storable fields)
  const sheetFields = ['Timestamp', 'Organisatie', 'Klas', 'Lesgever'];
  const changes = {};
  for (const f of sheetFields) {
    if (f in fields) changes[f] = fields[f];
  }

  // If there are field changes, write them as cell notes via Apps Script
  if (Object.keys(changes).length > 0) {
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey, action: 'editProposition', sheetRow, changes }),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error('Edit proposition upstream error:', response.status, text);
        throw new Error(`Upstream error ${response.status}: ${text.slice(0, 200)}`);
      }
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Upstream returned non-JSON: ${text.slice(0, 200)}`); }
      if (data.error) throw new Error(data.error);
    } catch (err) {
      console.error('Edit proposition error:', err.message);
      return res.status(502).json({ error: err.message });
    }
  }

  // Store overrides locally so the calendar shows proposed values immediately.
  // Keys mirror the sheet field names so GET /api/data can merge them.
  const local = readLocalMeets();
  if (!local.overrides[id]) local.overrides[id] = {};
  Object.assign(local.overrides[id], fields);
  writeLocalMeets(local);

  res.json({ ok: true });
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
