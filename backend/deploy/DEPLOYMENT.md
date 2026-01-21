# HookedLee Backend Deployment Guide

This directory contains deployment scripts and configuration for running the HookedLee backend as a systemd service.

## Files

- `hookedlee-backend.service` - Systemd service configuration
- `install.sh` - Installation script
- `uninstall.sh` - Uninstallation script
- `update.sh` - Update script (pulls latest code and restarts)

## Quick Start

### 1. Initial Setup

```bash
cd /data/hookedli/backend/deploy
sudo ./install.sh
```

This will:
- Install dependencies (if needed)
- Create systemd service
- Enable auto-start on boot
- Start the service

### 2. Verify Installation

```bash
# Check service status
sudo systemctl status hookedlee-backend

# View logs
sudo journalctl -u hookedlee-backend -f

# Test health endpoint
curl https://suosuoli.com:3443/api/health
```

## Service Management

### Start/Stop/Restart

```bash
# Start service
sudo systemctl start hookedlee-backend

# Stop service
sudo systemctl stop hookedlee-backend

# Restart service
sudo systemctl restart hookedlee-backend

# Check status
sudo systemctl status hookedlee-backend
```

### View Logs

```bash
# Follow logs in real-time
sudo journalctl -u hookedlee-backend -f

# View last 100 lines
sudo journalctl -u hookedlee-backend -n 100

# View logs since today
sudo journalctl -u hookedlee-backend --since today

# View error logs only
sudo journalctl -u hookedlee-backend -p err
```

### Enable/Disable Auto-start

```bash
# Enable auto-start on boot
sudo systemctl enable hookedlee-backend

# Disable auto-start on boot
sudo systemctl disable hookedlee-backend
```

## Updates

### Update to Latest Code

```bash
cd /data/hookedli/backend/deploy
sudo ./update.sh
```

This will:
- Create a backup of the current version
- Pull latest code from git
- Install dependencies
- Restart the service

### Manual Update

```bash
cd /data/hookedli/backend
sudo git pull origin main
sudo npm install
sudo systemctl restart hookedlee-backend
```

## Uninstall

```bash
cd /data/hookedli/backend/deploy
sudo ./uninstall.sh
```

This will:
- Stop the service
- Disable auto-start
- Remove systemd service file
- Keep backend files intact

## Configuration

### Environment Variables

Edit `/data/hookedli/backend/.env`:

```env
# Server Configuration
NODE_ENV=production
HTTP_PORT=3000
HTTPS_PORT=3443

# SSL Certificate Paths (Let's Encrypt)
SSL_KEY_PATH=/etc/letsencrypt/live/suosuoli.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/suosuoli.com/fullchain.pem
SSL_CA_PATH=/etc/letsencrypt/live/suosuoli.com/chain.pem

# API Keys
BIGMODEL_API_KEY=your_bigmodel_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
```

After changing `.env`, restart the service:

```bash
sudo systemctl restart hookedlee-backend
```

### Modify Service Configuration

Edit `/etc/systemd/system/hookedlee-backend.service`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart hookedlee-backend
```

## Troubleshooting

### Service Won't Start

1. Check logs:
   ```bash
   sudo journalctl -u hookedlee-backend -n 50
   ```

2. Check if ports are in use:
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :3443
   ```

3. Verify `.env` file exists and has correct keys

4. Check Node.js installation:
   ```bash
   which node
   node --version
   ```

### HTTPS Not Working

1. Verify SSL certificates exist:
   ```bash
   ls -la /etc/letsencrypt/live/suosuoli.com/
   ```

2. Check certificate permissions:
   ```bash
   sudo chmod 644 /etc/letsencrypt/live/suosuoli.com/*.pem
   ```

3. Restart service after certificate changes

### API Errors

1. Check API keys are valid in `.env`
2. Verify API quota/billing at:
   - BigModel: https://open.bigmodel.cn/dashboard
   - DeepSeek: https://platform.deepseek.com/user_info

### High Memory/CPU Usage

1. Check service status:
   ```bash
   sudo systemctl status hookedlee-backend
   ```

2. View resource usage:
   ```bash
   sudo systemctl status hookedlee-backend -l
   top -p $(pgrep -f "server.js")
   ```

3. Restart if needed:
   ```bash
   sudo systemctl restart hookedlee-backend
   ```

## URLs

- **HTTP:** `http://suosuoli.com:3000` (redirects to HTTPS)
- **HTTPS:** `https://suosuoli.com:3443`
- **Health Check:** `https://suosuoli.com:3443/api/health`

## Security Notes

1. **API Keys:** Never commit `.env` to version control
2. **SSL Certificates:** Use Let's Encrypt for production
3. **Firewall:** Ensure ports 3000 and 3443 are accessible
4. **Updates:** Keep Node.js and dependencies updated
5. **Logs:** Monitor logs regularly for suspicious activity

## Backup

### Backup Configuration

```bash
# Backup .env file
sudo cp /data/hookedli/backend/.env /data/hookedli/backend/.env.backup

# Backup entire backend
sudo tar -czf /data/hookedli-backend-backup-$(date +%Y%m%d).tar.gz /data/hookedli/backend
```

### Restore from Backup

```bash
# Restore .env
sudo cp /data/hookedli/backend/.env.backup /data/hookedli/backend/.env

# Extract backup
sudo tar -xzf /data/hookedli-backend-backup-YYYYMMDD.tar.gz -C /
sudo systemctl restart hookedlee-backend
```

## Monitoring

### Health Check Script

Create `/usr/local/bin/check-backend.sh`:

```bash
#!/bin/bash
HEALTH_URL="https://suosuoli.com:3443/api/health"
RESPONSE=$(curl -s $HEALTH_URL)

if echo $RESPONSE | grep -q '"status":"ok"'; then
    echo "✓ Backend is healthy"
    exit 0
else
    echo "✗ Backend is down!"
    # Send alert (email, Slack, etc.)
    exit 1
fi
```

Make it executable and add to crontab:

```bash
sudo chmod +x /usr/local/bin/check-backend.sh

# Add to crontab to check every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-backend.sh") | crontab -
```

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u hookedlee-backend -n 100`
2. Review this guide's troubleshooting section
3. Check main project README
