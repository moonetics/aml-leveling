module.exports = {
  apps: [
    {
      name: 'aml-leveling',
      script: 'dist/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
