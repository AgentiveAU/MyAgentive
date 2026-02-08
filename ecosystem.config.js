const path = require('path');
const appDir = __dirname;

module.exports = {
  apps: [
    {
      name: 'myagentive',
      script: 'npm',
      args: 'start',
      cwd: appDir,
      instances: 1,
      exec_mode: 'fork',

      // Environment from .env file
      env: {
        NODE_ENV: 'production',
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(appDir, 'logs', 'error.log'),
      out_file: path.join(appDir, 'logs', 'out.log'),
      merge_logs: true,

      // Process management
      max_memory_restart: '500M',
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Watch (disable in production)
      watch: false,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],
};
