# Deployment script
# 7. Production Deployment Script
# scripts/deploy.sh

#!/bin/bash

set -e

# Configuration
REPO_URL="https://github.com/your-org/ngo-accounting-system.git"
DEPLOY_DIR="/opt/ngo-accounting"
BACKUP_DIR="/opt/backups"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
fi

log "Starting deployment..."

# Create directories
sudo mkdir -p $DEPLOY_DIR $BACKUP_DIR
sudo chown $(whoami):$(whoami) $DEPLOY_DIR $BACKUP_DIR

# Backup current deployment if exists
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Creating backup of current deployment..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    cp -r $DEPLOY_DIR $BACKUP_DIR/$BACKUP_NAME
    log "Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# Clone or update repository
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Updating repository..."
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    log "Cloning repository..."
    git clone -b $BRANCH $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log "Creating .env file from example..."
        cp .env.example .env
        warn "Please update .env file with production values"
    else
        error ".env.example file not found"
    fi
fi

# Generate strong secrets if they don't exist
if ! grep -q "SECRET_KEY=.*[a-zA-Z0-9]" .env; then
    log "Generating SECRET_KEY..."
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
fi

if ! grep -q "JWT_SECRET_KEY=.*[a-zA-Z0-9]" .env; then
    log "Generating JWT_SECRET_KEY..."
    JWT_SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET_KEY/" .env
fi

# Stop existing containers
log "Stopping existing containers..."
docker-compose down --remove-orphans

# Pull latest images
log "Pulling latest images..."
docker-compose pull

# Build and start services
log "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Check if services are healthy
for service in postgres redis backend frontend; do
    if docker-compose ps $service | grep -q "Up"; then
        log "$service is running"
    else
        error "$service failed to start"
    fi
done

# Run database migrations if needed
log "Running database setup..."
docker-compose exec backend python database_setup.py create

# Run health check
log "Running health check..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$BACKEND_HEALTH" = "200" ]; then
    log "Backend health check passed"
else
    error "Backend health check failed (HTTP $BACKEND_HEALTH)"
fi

if [ "$FRONTEND_HEALTH" = "200" ]; then
    log "Frontend health check passed"
else
    error "Frontend health check failed (HTTP $FRONTEND_HEALTH)"
fi

# Setup log rotation
log "Setting up log rotation..."
sudo tee /etc/logrotate.d/ngo-accounting > /dev/null <<EOF
$DEPLOY_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        docker-compose -f $DEPLOY_DIR/docker-compose.yml restart backend
    endscript
}
EOF

# Setup backup cron job
log "Setting up backup cron job..."
CRON_JOB="0 2 * * * cd $DEPLOY_DIR && docker-compose exec -T backend python -c 'from services.automated_tasks import AutomatedTaskService; AutomatedTaskService.daily_backup()'"
(crontab -l 2>/dev/null | grep -v "daily_backup"; echo "$CRON_JOB") | crontab -

log "Deployment completed successfully!"
log "Application is available at: http://localhost:3000"
log "API is available at: http://localhost:5000"
log "Default login: admin / admin123"

# Cleanup old backups (keep last 10)
log "Cleaning up old backups..."
cd $BACKUP_DIR
ls -t | tail -n +11 | xargs -r rm -rf

log "Deployment script finished."