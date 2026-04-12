module.exports = {
  apps: [
    {
      name: 'lesbezoeken-calendar',
      script: 'server/index.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
