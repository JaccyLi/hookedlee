#!/bin/bash

###############################################################################
# JWT Secret Rotation Script
#
# Usage:
#   ./rotate-jwt.sh              # Interactive mode
#   ./rotate-jwt.sh --force      # Skip confirmation
#   ./rotate-jwt.sh --dry-run    # Show what would happen without making changes
#
# This script:
# 1. Generates a new JWT secret
# 2. Adds it to the FRONT of JWT_SECRET in .env file
# 3. Backs up the old .env file
# 4. Restarts the backend service (optional)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="$(dirname "$0")/.env"
ENV_BACKUP_DIR="$(dirname "$0")/.env.backups"
SERVICE_NAME="hookedlee-backend"

# Flags
DRY_RUN=false
FORCE=false
NO_RESTART=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --no-restart)
      NO_RESTART=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run      Show what would happen without making changes"
      echo "  --force        Skip confirmation prompts"
      echo "  --no-restart   Don't restart the backend service"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

generate_secret() {
  openssl rand -base64 32
}

backup_env() {
  local timestamp=$(date +"%Y%m%d_%H%M%S")
  local backup_file="$ENV_BACKUP_DIR/env.backup_$timestamp"

  mkdir -p "$ENV_BACKUP_DIR"
  cp "$ENV_FILE" "$backup_file"

  log_info "Backup created: $backup_file"
}

get_current_jwt_secret() {
  grep -E "^JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2- || echo ""
}

update_jwt_secret() {
  local current_secret="$1"
  local new_secret="$2"

  if [ -z "$current_secret" ] || [ "$current_secret" = "change-this-to-a-strong-random-string-in-production" ]; then
    # No existing secret or default placeholder
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$new_secret|" "$ENV_FILE"
  else
    # Append new secret to front of existing secrets
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$new_secret,$current_secret|" "$ENV_FILE"
  fi
}

restart_backend() {
  if [ "$NO_RESTART" = true ]; then
    log_warning "Skipping backend restart (--no-restart flag set)"
    log_warning "Remember to restart manually: systemctl restart $SERVICE_NAME"
    return
  fi

  log_info "Restarting backend service..."

  if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet "$SERVICE_NAME"; then
      systemctl restart "$SERVICE_NAME"
      log_success "Backend service restarted"
    else
      log_warning "Service $SERVICE_NAME is not running"
    fi
  else
    log_warning "systemctl not found - cannot restart service automatically"
    log_warning "Please restart manually: systemctl restart $SERVICE_NAME"
  fi
}

# Main script
main() {
  log_info "JWT Secret Rotation Script"
  echo "================================"

  # Check if .env file exists
  if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found at: $ENV_FILE"
    exit 1
  fi

  # Get current JWT secret
  current_secret=$(get_current_jwt_secret)

  if [ -z "$current_secret" ]; then
    log_warning "No JWT_SECRET found in .env file"
    log_warning "A new entry will be created"
  else
    # Count how many secrets (comma-separated)
    secret_count=$(echo "$current_secret" | tr ',' '\n' | wc -l)
    log_info "Current JWT_SECRET has $secret_count secret(s)"
    echo "Current (truncated): ${current_secret:0:20}..."
  fi

  # Generate new secret
  log_info "Generating new JWT secret..."
  new_secret=$(generate_secret)
  log_success "New secret generated: ${new_secret:0:20}... (truncated)"

  # Show what will happen
  echo ""
  echo "Changes to be made:"
  echo "  File: $ENV_FILE"
  echo "  New JWT_SECRET: $new_secret,$current_secret"
  echo ""

  # Dry run mode
  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN MODE - No changes will be made"
    echo ""
    echo "The file would be updated to:"
    echo "JWT_SECRET=$new_secret,$current_secret"
    exit 0
  fi

  # Confirmation prompt
  if [ "$FORCE" = false ]; then
    read -p "Continue with these changes? (yes/no): " confirm
    if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ]; then
      log_info "Operation cancelled"
      exit 0
    fi
  fi

  # Backup .env file
  backup_env

  # Update .env file
  log_info "Updating $ENV_FILE..."
  update_jwt_secret "$current_secret" "$new_secret"
  log_success "JWT_SECRET updated in .env file"

  # Show updated content
  echo ""
  log_info "Updated JWT_SECRET:"
  grep "^JWT_SECRET=" "$ENV_FILE"

  # Restart backend
  echo ""
  restart_backend

  # Success message
  echo ""
  log_success "JWT Secret Rotation Complete!"
  echo ""
  echo "Next steps:"
  echo "  1. Monitor backend logs: journalctl -u $SERVICE_NAME -f"
  echo "  2. Wait 30 days for all old tokens to expire"
  echo "  3. Then remove old secrets from JWT_SECRET in .env"
  echo ""
  echo "Backup location: $ENV_BACKUP_DIR"
  echo "To restore old .env: cp $ENV_BACKUP_DIR/env.backup_<timestamp> $ENV_FILE"
}

# Run main function
main
