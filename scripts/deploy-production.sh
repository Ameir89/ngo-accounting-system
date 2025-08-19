#!/bin/bash
# scripts/deploy-production.sh

set -euo pipefail

# Configuration
REPO_URL="https://github.com/your-org/ngo-accounting-system.git"
DEPLOY_DIR="/opt/ngo-accounting"
BACKUP_DIR="/opt/backups"
BRANCH="main"
DOMAIN="your-domain.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Pre-deployment checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as non-root
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        error "User $USER is not in docker group"
    fi
    
    # Check disk space (need at least 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [ $available_space -lt 5242880 ]; then  # 5GB in KB
        error "Insufficient disk space. Need at least 5GB available."
    fi
    
    log "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    if [ -d "$DEPLOY_DIR" ]; then
        log "Creating backup of current deployment..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        
        mkdir -p "$BACKUP_DIR"
        
        # Stop services before backup
        cd "$DEPLOY_DIR"
        docker-compose down
        
        # Create backup
        cp -r "$DEPLOY_DIR" "$BACKUP_PATH"
        
        # Backup database
        docker-compose up -d postgres
        sleep 10
        docker-compose exec -T postgres pg_dump -U ngo_user ngo_accounting > "$BACKUP_PATH/database_backup.sql"
        docker-compose down
        
        log "Backup created: $BACKUP_PATH"
        
        # Cleanup old backups (keep last 5)
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Create deploy directory
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown $(whoami):$(whoami) "$DEPLOY_DIR"
    
    # Clone or update repository
    if [ -d "$DEPLOY_DIR/.git" ]; then
        log "Updating repository..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
    else
        log "Cloning repository..."
        git clone -b $BRANCH $REPO_URL $DEPLOY_DIR
        cd $DEPLOY_DIR
    fi
    
    # Copy production environment file
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            log "Copied production environment file"
        else
            error "Production environment file (.env.production) not found"
        fi
    fi
    
    # Build and deploy
    log "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    log "Running database setup..."
    docker-compose -f docker-compose.prod.yml exec -T backend python database_setup.py create
    
    log "Application deployed successfully"
}

# Health checks
run_health_checks() {
    log "Running health checks..."
    
    # Check if all services are running
    services=("nginx" "backend" "postgres" "redis" "celery")
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
            log "$service is running"
        else
            error "$service failed to start"
        fi
    done
    
    # Test database connection
    if docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ngo_user -d ngo_accounting -c "SELECT 1;" > /dev/null; then
        log "Database connection test passed"
    else
        error "Database connection test failed"
    fi
    
    # Test Redis connection
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        log "Redis connection test passed"
    else
        error "Redis connection test failed"
    fi
    
    # Test web application
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost/health > /dev/null; then
            log "Web application health check passed"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                error "Web application health check failed after $max_attempts attempts"
            fi
            info "Attempt $attempt/$max_attempts: Web application not ready yet, waiting..."
            sleep 10
            ((attempt++))
        fi
    done
    
    # Test API endpoint
    if curl -f -s http://localhost/api/health > /dev/null; then
        log "API health check passed"
    else
        error "API health check failed"
    fi
    
    log "All health checks passed"
}

# Setup SSL certificate (using Let's Encrypt)
setup_ssl() {
    if [ "$DOMAIN" != "your-domain.com" ]; then
        log "Setting up SSL certificate for $DOMAIN..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Stop nginx temporarily
        docker-compose -f docker-compose.prod.yml stop nginx
        
        # Get certificate
        sudo certbot certonly --standalone \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        # Copy certificates to nginx directory
        sudo mkdir -p nginx/ssl
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
        sudo chown $(whoami):$(whoami) nginx/ssl/*
        
        # Start nginx again
        docker-compose -f docker-compose.prod.yml start nginx
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml restart nginx'") | crontab -
        
        log "SSL certificate setup completed"
    else
        warn "Skipping SSL setup - update DOMAIN variable in script"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create prometheus config
    mkdir -p monitoring
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
  
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'
EOF
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/ngo-accounting > /dev/null << EOF
$DEPLOY_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        docker-compose -f $DEPLOY_DIR/docker-compose.prod.yml restart backend
    endscript
}
EOF
    
    log "Monitoring setup completed"
}

# Setup system service
setup_system_service() {
    log "Setting up system service..."
    
    sudo tee /etc/systemd/system/ngo-accounting.service > /dev/null << EOF
[Unit]
Description=NGO Accounting System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable ngo-accounting.service
    
    log "System service setup completed"
}

# Main deployment function
main() {
    log "Starting production deployment..."
    
    check_prerequisites
    backup_current_deployment
    deploy_application
    run_health_checks
    setup_ssl
    setup_monitoring
    setup_system_service
    
    log "Production deployment completed successfully!"
    info "Application is available at: https://$DOMAIN"
    info "Monitoring is available at: http://$DOMAIN:9090"
    
    echo ""
    echo "Next steps:"
    echo "1. Update DNS records to point to this server"
    echo "2. Configure email settings in .env file"
    echo "3. Create initial admin user"
    echo "4. Setup automated backups"
    echo "5. Configure monitoring alerts"
}

# Run main function
main "$@"