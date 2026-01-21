#!/bin/bash

# HookedLee Backend Deployment Script
# This script installs the backend as a systemd service

set -e

echo "=================================="
echo "HookedLee Backend Deployment"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Configuration
SERVICE_NAME="hookedlee-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
BACKEND_DIR="/data/hookedli/backend"
NODE_PATH="$(which node 2>/dev/null || echo '/root/.nvm/versions/node/v24.13.0/bin/node')"

echo "📋 Configuration:"
echo "  Service Name: $SERVICE_NAME"
echo "  Backend Dir: $BACKEND_DIR"
echo "  Node Path: $NODE_PATH"
echo ""

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Please create .env with your API keys:"
    echo "   BIGMODEL_API_KEY=your_key_here"
    echo "   DEEPSEEK_API_KEY=your_key_here"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
cd "$BACKEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
fi

# Copy systemd service file
echo "🔧 Installing systemd service..."
sed "s|ExecStart=.*|ExecStart=$NODE_PATH $BACKEND_DIR/server.js|" \
    hookedlee-backend.service > "$SERVICE_FILE"

# Set ownership
chown root:root "$SERVICE_FILE"
chmod 644 "$SERVICE_FILE"

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable service
echo "✅ Enabling service..."
systemctl enable "$SERVICE_NAME"

# Start service
echo "🚀 Starting service..."
systemctl restart "$SERVICE_NAME"

# Wait a moment
sleep 2

# Check status
echo ""
echo "📊 Service Status:"
systemctl status "$SERVICE_NAME" --no-pager || true

echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "Service Commands:"
echo "  Status:   systemctl status $SERVICE_NAME"
echo "  Restart:  systemctl restart $SERVICE_NAME"
echo "  Stop:     systemctl stop $SERVICE_NAME"
echo "  Start:    systemctl start $SERVICE_NAME"
echo "  Logs:     journalctl -u $SERVICE_NAME -f"
echo ""
echo "Service URLs:"
echo "  HTTP:  http://localhost:3000"
echo "  HTTPS: https://localhost:3443"
echo ""
