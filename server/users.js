const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    console.error(
      '⚠️  server/users.json not found.\n' +
      '   Copy server/users.example.json to server/users.json and configure your accounts.\n' +
      '   Use `node server/hash-password.js <password>` to generate password hashes.'
    );
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse server/users.json:', err.message);
    return [];
  }
}

function findUser(username) {
  return loadUsers().find(u => u.username === username) || null;
}

function createUser(username, passwordHash, allowedHosts, role = 'user') {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    throw new Error(`Username "${username}" already exists`);
  }
  users.push({ username, passwordHash, role, allowedHosts: allowedHosts ?? null });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function getAllUsers() {
  return loadUsers().map(({ passwordHash: _omit, ...u }) => u);
}

function updateUser(username, { newUsername, passwordHash, role, allowedHosts }) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) throw new Error(`User "${username}" not found`);
  if (newUsername !== undefined && newUsername !== username) {
    if (users.find(u => u.username === newUsername)) {
      throw new Error(`Username "${newUsername}" already exists`);
    }
    users[idx].username = newUsername;
  }
  if (passwordHash !== undefined) users[idx].passwordHash = passwordHash;
  if (role !== undefined) users[idx].role = role;
  if (allowedHosts !== undefined) users[idx].allowedHosts = allowedHosts;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function deleteUser(username) {
  const users = loadUsers();
  const filtered = users.filter(u => u.username !== username);
  if (filtered.length === users.length) throw new Error(`User "${username}" not found`);
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
}

module.exports = { findUser, createUser, getAllUsers, updateUser, deleteUser };
