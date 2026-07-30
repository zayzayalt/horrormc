module.exports = {
  apps: [
    {
      name: 'horrormc',
      script: './scripts/start-bot.sh',
      interpreter: 'bash',
      env: {
        HOST: '0.0.0.0',
        PORT: 3000
      },
      autorestart: true,
      restart_delay: 1000,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
