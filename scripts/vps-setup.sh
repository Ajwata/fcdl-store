#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Installing system packages"
sudo apt update
sudo apt install -y curl git nginx

echo "[2/6] Installing Node.js 20 LTS"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "[3/6] Installing PM2"
sudo npm install -g pm2

echo "[4/6] Creating app directory"
sudo mkdir -p /var/www/football
sudo chown -R "$USER":"$USER" /var/www/football

echo "[5/6] Copy your project to /var/www/football and run build"
echo "cd /var/www/football"
echo "npm ci"
echo "npm run build"

echo "[6/6] Start app with PM2"
echo "pm2 start ecosystem.config.cjs"
echo "pm2 save"
echo "pm2 startup"

echo "Done. Configure Nginx using deploy/nginx-football.conf"
