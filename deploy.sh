#!/bin/bash
set -e

# WoW Public Site Deployment Script
# Usage: ./deploy.sh [--pull] [--deps] [--migrate] [--cleanup]

# Configuration
PROJECT_DIR="/home/acore/projects/wow-public-server"
RELEASES_DIR="/srv/releases/public"
SHARED_ENV="/srv/shared/public/.env"
CURRENT_LINK="/srv/current/public"
SERVICE_NAME="wow-public-site"
KEEP_RELEASES=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments (all opt-in)
GIT_PULL=false
INSTALL_DEPS=false
RUN_MIGRATIONS=false
CLEANUP=false

for arg in "$@"; do
    case $arg in
        --pull)
            GIT_PULL=true
            ;;
        --deps)
            INSTALL_DEPS=true
            ;;
        --migrate)
            RUN_MIGRATIONS=true
            ;;
        --cleanup)
            CLEANUP=true
            ;;
        --help|-h)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --pull      Pull latest code from git"
            echo "  --deps      Run npm install"
            echo "  --migrate   Run database migrations (db:push)"
            echo "  --cleanup   Clean up old releases after deploy (keeps last $KEEP_RELEASES)"
            echo "  --help, -h  Show this help message"
            echo ""
            echo "Default behavior: build, create release, switch symlink, restart service"
            exit 0
            ;;
    esac
done

# Helper functions
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

# Generate release directory name
RELEASE_DIR="$RELEASES_DIR/$(date -u +%Y-%m-%dT%H-%M-%S)"

echo ""
echo "========================================"
echo "  WoW Public Site Deployment"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

# Optional: Pull latest code
if [ "$GIT_PULL" = true ]; then
    log_info "Pulling latest code from git..."
    git pull origin master
    log_success "Code updated"
fi

# Optional: Install dependencies
if [ "$INSTALL_DEPS" = true ]; then
    log_info "Installing dependencies..."
    npm install
    log_success "Dependencies installed"
fi

# Optional: Run database migrations
if [ "$RUN_MIGRATIONS" = true ]; then
    log_info "Running database migrations..."
    npm run db:push
    log_success "Database migrations complete"
fi

# Build the application
log_info "Building application..."
npm run build
log_success "Build complete"

# Create release directory
log_info "Creating release directory: $RELEASE_DIR"
sudo mkdir -p "$RELEASE_DIR"

# Copy build output
log_info "Copying build output..."
sudo cp -r .output/* "$RELEASE_DIR/"
log_success "Build output copied"

# Copy and link shared environment
log_info "Copying .env.local to shared location..."
sudo mkdir -p "$(dirname "$SHARED_ENV")"
sudo cp "$PROJECT_DIR/.env.local" "$SHARED_ENV"
log_success "Environment file copied"

log_info "Linking shared environment file..."
sudo ln -sf "$SHARED_ENV" "$RELEASE_DIR/.env"
log_success "Environment file linked"

# Switch to new release
log_info "Switching to new release..."
sudo ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
log_success "Symlink updated"

# Restart the service
log_info "Restarting service..."
sudo systemctl restart "$SERVICE_NAME"
log_success "Service restarted"

# Verify deployment
log_info "Verifying deployment..."
sleep 2

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    log_success "Service is running"
else
    log_error "Service failed to start!"
    log_info "Checking logs..."
    journalctl -u "$SERVICE_NAME" --since "1 min ago" --no-pager
    exit 1
fi

# Optional: Cleanup old releases
if [ "$CLEANUP" = true ]; then
    log_info "Cleaning up old releases (keeping last $KEEP_RELEASES)..."
    cd "$RELEASES_DIR"
    RELEASE_COUNT=$(ls -1 | wc -l)
    if [ "$RELEASE_COUNT" -gt "$KEEP_RELEASES" ]; then
        ls -t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
        log_success "Old releases cleaned up"
    else
        log_info "No releases to clean up ($RELEASE_COUNT releases exist)"
    fi
fi

echo ""
echo "========================================"
log_success "Deployment complete!"
echo "========================================"
echo ""
echo "Release: $RELEASE_DIR"
echo "Current: $(readlink -f $CURRENT_LINK)"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status $SERVICE_NAME     # Check status"
echo "  journalctl -u $SERVICE_NAME -f          # Follow logs"
echo ""
