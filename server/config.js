require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-CHANGE-IN-PRODUCTION',
  tokenExpiresIn: '8h',
  bcryptRounds: 10,
  webAppUrl: process.env.WEB_APP_URL,
  apiKey: process.env.API_KEY,
  port: parseInt(process.env.PORT || '3001', 10),
};
