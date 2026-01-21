#!/bin/bash

# HookedLee Backend Update Script
# This script pulls latest code and restarts the service

set -e

echo "=================================="
echo "HookedLee Backend Update"
echo "=================================="
echo ""

# Configuration
SERVICE_NAME="hookedlee-backend"
BACKEND_DIR="/data/hookedli/backend"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

cd "$BACKEND_DIR"

# Backup current version
echo "💾 Backing up current version..."
BACKUP_DIR="/data/hookedli/backend.backup.$(date +%Y%m%d_%H%M%S)"
cp -r "$BACKEND_DIR" "$BACKUP_DIR"
echo "  Backup: $BACKUP_DIR"

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Restart service
echo "🔄 Restarting service..."
systemctl restart "$SERVICE_NAME"

# Wait and check status
sleep 2
echo ""
echo "📊 Service Status:"
systemctl status "$SERVICE_NAME" --no-pager -l || true

echo ""
echo "=================================="
echo "✅ Update Complete!"
echo "=================================="
echo ""
echo "If something went wrong, restore from:"
echo "  $BACKUP_DIR"
echo ""
