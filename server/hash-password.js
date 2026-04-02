// Utility to generate bcrypt hashes for users.json.
// Usage: node server/hash-password.js <your-password>
const bcrypt = require('bcrypt');
const { bcryptRounds } = require('./config');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node server/hash-password.js <your-password>');
  process.exit(1);
}

bcrypt.hash(password, bcryptRounds).then(hash => {
  console.log('\nCopy this hash into the passwordHash field in server/users.json:');
  console.log(hash);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
