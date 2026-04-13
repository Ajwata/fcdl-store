# Football Booking App

Next.js 16 project with SMS-based client authentication.

## Local Development

```bash
npm install
npm run dev
```

App will start on http://localhost:3000.

By default, auth data is stored in JSON files (local mode):

- `USE_DATABASE=false`

Switch to MySQL by setting `USE_DATABASE=true` and `DATABASE_URL`.

## Production Deploy on ukraine.com.ua VPS

This project is prepared for VPS deploy (Node.js + Nginx + PM2).

### 1. Server requirements

- Ubuntu 22.04+
- Node.js 20 LTS
- Nginx
- PM2

### 2. Install base software

Run on VPS:

```bash
chmod +x scripts/vps-setup.sh
./scripts/vps-setup.sh
```

### 3. Upload project and configure environment

Copy project to `/var/www/football`, then create `.env.local` in project root:

```dotenv
ALPHASMS_API_KEY=your-real-key
USE_DATABASE=true
DATABASE_URL="mysql://user:password@127.0.0.1:3306/football"
```

For first deploy with DB, run migrations:

```bash
npm run db:generate
npm run db:deploy
```

### 4. Build and start app

```bash
cd /var/www/football
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Health check:

```bash
curl http://127.0.0.1:3000
```

### 5. Configure Nginx reverse proxy

Use config template from `deploy/nginx-football.conf`:

```bash
sudo cp deploy/nginx-football.conf /etc/nginx/sites-available/football
sudo nano /etc/nginx/sites-available/football
```

Change `server_name` to your real domain, then enable config:

```bash
sudo ln -s /etc/nginx/sites-available/football /etc/nginx/sites-enabled/football
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Enable SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7. Update releases

```bash
cd /var/www/football
git pull
npm ci
npm run build
pm2 restart football-app
```

## Useful Commands

```bash
pm2 status
pm2 logs football-app
pm2 restart football-app
sudo systemctl status nginx
```
