# Enhanced Flask application with comprehensive security
# backend/app.py
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_marshmallow import Marshmallow
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from datetime import datetime, timedelta
import os
from functools import wraps
import json
import logging
from sqlalchemy import text
from werkzeug.middleware.proxy_fix import ProxyFix

from utils.cors_config import setup_cors
from config import config
from models import db, User, Role
from utils.security import SecurityManager
from utils.request_validator import RequestValidator
from utils.error_handlers import setup_error_handlers

# Import API blueprints
from api.auth import auth_bp
from api.accounts import accounts_bp
from api.journals import journals_bp
from api.reports import reports_bp
from api.grants import grants_bp
from api.suppliers import suppliers_bp
from api.assets import assets_bp
from api.projects import projects_bp
from api.cost_centers import cost_centers_bp
from api.donors import donors_bp
from api.budgets import budgets_bp
from api.currencies import currencies_bp
from api.dashboard import dashboard_bp
from api.data_exchange import data_exchange_bp

def create_app(config_name=None):
    """Application factory pattern with enhanced security"""
    app = Flask(__name__)
    
    
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Security headers and HTTPS enforcement
    if not app.debug:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
        Talisman(app, force_https=True, strict_transport_security=True)
    
    # Initialize extensions
    db.init_app(app)
    ma = Marshmallow(app)
    
    # Enhanced JWT configuration
    jwt = JWTManager(app)
    jwt.init_app(app)
    
    # Rate limiting
    limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "100 per hour"]
    )
    
    # Enhanced CORS configuration
    # Load configuration
    app.config.from_object(config['development'])
    
    # Setup CORS
    setup_cors(app)
    # CORS(app, 
    #      origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
    #      allow_headers=["Content-Type", "Authorization"],
    #      methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    #      supports_credentials=True,
    #      max_age=3600)
    
    # Security manager
    security_manager = SecurityManager(app)
    
    # Request validator
    request_validator = RequestValidator()
    
    # Setup logging
    setup_logging(app)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'message': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'message': 'Authorization token required'}), 401
    
    # Request preprocessing
    @app.before_request
    def before_request():
        # Security checks
        if not security_manager.is_request_allowed(request):
            return jsonify({'message': 'Request blocked by security policy'}), 403
        
        # Rate limiting for sensitive endpoints
        if request.endpoint and any(sensitive in request.endpoint for sensitive in ['auth', 'admin']):
            # Apply stricter rate limiting
            pass
        
        # Log requests for audit
        if request.method in ['POST', 'PUT', 'DELETE']:
            app.logger.info(f"API Request: {request.method} {request.path} from {request.remote_addr}")
    
    # Register blueprints with version prefix
    api_prefix = '/api/v1'
    
    app.register_blueprint(auth_bp, url_prefix=api_prefix)
    app.register_blueprint(accounts_bp, url_prefix=api_prefix)
    app.register_blueprint(journals_bp, url_prefix=api_prefix)
    app.register_blueprint(reports_bp, url_prefix=api_prefix)
    app.register_blueprint(grants_bp, url_prefix=api_prefix)
    app.register_blueprint(suppliers_bp, url_prefix=api_prefix)
    app.register_blueprint(assets_bp, url_prefix=api_prefix)
    app.register_blueprint(projects_bp, url_prefix=api_prefix)
    app.register_blueprint(cost_centers_bp, url_prefix=api_prefix)
    app.register_blueprint(donors_bp, url_prefix=api_prefix)
    app.register_blueprint(budgets_bp, url_prefix=api_prefix)
    app.register_blueprint(currencies_bp, url_prefix=api_prefix)
    app.register_blueprint(dashboard_bp, url_prefix=api_prefix)
    app.register_blueprint(data_exchange_bp, url_prefix=api_prefix)
    
    # Enhanced health check endpoint
    @app.route('/health')
    @limiter.limit("10 per minute")
    def health_check():
        try:
            # Check database connection
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            
            # Check system resources
            import psutil
            cpu_percent = psutil.cpu_percent()
            memory_percent = psutil.virtual_memory().percent
            
            health_status = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': app.config.get('VERSION', '1.0.0'),
                'database': 'connected',
                'system': {
                    'cpu_usage': f"{cpu_percent}%",
                    'memory_usage': f"{memory_percent}%"
                }
            }
            
            # Warning if resources are high
            if cpu_percent > 80 or memory_percent > 85:
                health_status['status'] = 'warning'
                health_status['alerts'] = []
                if cpu_percent > 80:
                    health_status['alerts'].append(f"High CPU usage: {cpu_percent}%")
                if memory_percent > 85:
                    health_status['alerts'].append(f"High memory usage: {memory_percent}%")
            
            return jsonify(health_status)
            
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
    
    # API documentation endpoint
    @app.route('/api/docs')
    def api_docs():
        return jsonify({
            'api_version': 'v1',
            'endpoints': {
                'authentication': f'{api_prefix}/auth',
                'accounts': f'{api_prefix}/accounts',
                'journal_entries': f'{api_prefix}/journal-entries',
                'reports': f'{api_prefix}/reports',
                'grants': f'{api_prefix}/grants',
                'suppliers': f'{api_prefix}/suppliers',
                'assets': f'{api_prefix}/assets',
                'projects': f'{api_prefix}/projects',
                'cost_centers': f'{api_prefix}/cost-centers',
                'donors': f'{api_prefix}/donors',
                'budgets': f'{api_prefix}/budgets',
                'currencies': f'{api_prefix}/currencies',
                'dashboard': f'{api_prefix}/dashboard',
                'data_exchange': f'{api_prefix}/data-exchange'
            },
            'documentation': 'https://docs.your-ngo-system.org/api'
        })
    
    # Setup error handlers
    setup_error_handlers(app)
    
    return app

def setup_logging(app):
    """Setup comprehensive logging"""
    if not app.debug:
        # Production logging
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        file_handler = RotatingFileHandler('logs/ngo_accounting.log', maxBytes=10240000, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('NGO Accounting System startup')

# Create app instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)