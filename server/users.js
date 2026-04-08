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

function createUser(username, passwordHash, allowedHosts) {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    throw new Error(`Username "${username}" already exists`);
  }
  users.push({ username, passwordHash, role: 'user', allowedHosts: allowedHosts ?? null });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

module.exports = { findUser, createUser };
