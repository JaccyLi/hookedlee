#!/bin/bash

# HookedLee Backend Uninstall Script
# This script removes the systemd service

set -e

echo "=================================="
echo "HookedLee Backend Uninstall"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

SERVICE_NAME="hookedlee-backend"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Check if service exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "⚠️  Service not found: $SERVICE_NAME"
    exit 0
fi

# Stop service
echo "🛑 Stopping service..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# Disable service
echo "🔓 Disabling service..."
systemctl disable "$SERVICE_NAME" 2>/dev/null || true

# Remove service file
echo "🗑️  Removing service file..."
rm -f "$SERVICE_FILE"

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

echo ""
echo "=================================="
echo "✅ Uninstall Complete!"
echo "=================================="
echo ""
echo "Service '$SERVICE_NAME' has been removed."
echo "Note: Backend files in /data/hookedli/backend were kept."
echo ""
