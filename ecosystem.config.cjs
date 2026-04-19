module.exports = {
  apps: [
    {
      name: 'super-pro-general-server',
      cwd: './general-server',
      script: './dist/main.cjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'super-pro-agent-server',
      cwd: './agent-server',
      script: './dist/main.cjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'super-pro-reimburse-server',
      cwd: './reimburse-server',
      script: './dist/main.cjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
