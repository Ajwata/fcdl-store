module.exports = {
  apps: [
    {
      name: "football-app",
      cwd: "/var/www/football",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
