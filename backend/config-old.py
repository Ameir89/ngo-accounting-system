# backend/config.py - Enhanced Configuration with Security
import os
from datetime import timedelta
import secrets

class Config:
    """Base configuration class with enhanced security"""
    
    # Basic Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_HOURS', 8)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_DAYS', 30)))
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']
    JWT_ERROR_MESSAGE_KEY = 'message'
    
    # Database Configuration
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DB_POOL_SIZE', 10)),
        'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', 20)),
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 3600)),
        'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', 20))
    }
    
    # Security Configuration
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT') or secrets.token_hex(16)
    BCRYPT_LOG_ROUNDS = int(os.environ.get('BCRYPT_LOG_ROUNDS', 12))
    
    # Session Configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else ['http://localhost:3000']
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_MAX_AGE = 3600
    
    # Rate Limiting Configuration
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
    RATELIMIT_DEFAULT = os.environ.get('API_RATE_LIMIT', '1000 per hour')
    RATELIMIT_HEADERS_ENABLED = True
    
    # Organization settings
    ORG_NAME = os.environ.get('ORG_NAME', 'NGO Accounting System')
    ORG_NAME_AR = os.environ.get('ORG_NAME_AR', 'نظام محاسبة المنظمة')
    ORG_EMAIL = os.environ.get('ORG_EMAIL', 'contact@ngo.org')
    ORG_PHONE = os.environ.get('ORG_PHONE', '+1-234-567-8900')
    ORG_ADDRESS = os.environ.get('ORG_ADDRESS', '123 NGO Street, City, Country')
    
    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'localhost')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'false').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', ORG_EMAIL)
    MAIL_MAX_EMAILS = int(os.environ.get('MAIL_MAX_EMAILS', 100))
    
    # Redis settings
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
    
    # File upload settings
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', './uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'pdf', 'jpg', 'jpeg', 'png', 'gif'}
    
    # Backup settings
    BACKUP_FOLDER = os.environ.get('BACKUP_FOLDER', './backups')
    BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', 30))
    AUTO_BACKUP_ENABLED = os.environ.get('AUTO_BACKUP_ENABLED', 'true').lower() in ['true', 'on', '1']
    
    # Pagination
    DEFAULT_PAGE_SIZE = int(os.environ.get('DEFAULT_PAGE_SIZE', 20))
    MAX_PAGE_SIZE = int(os.environ.get('MAX_PAGE_SIZE', 100))
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_TO_STDOUT = os.environ.get('LOG_TO_STDOUT', 'false').lower() in ['true', 'on', '1']
    LOG_TO_FILE = os.environ.get('LOG_TO_FILE', 'true').lower() in ['true', 'on', '1']
    LOG_FILE_PATH = os.environ.get('LOG_FILE_PATH', 'logs/app.log')
    LOG_MAX_BYTES = int(os.environ.get('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 10))
    
    # API Configuration
    API_VERSION = os.environ.get('API_VERSION', 'v1')
    API_PREFIX = f'/api/{API_VERSION}'
    
    # Frontend Configuration
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
    
    # Two-Factor Authentication
    TOTP_ISSUER_NAME = ORG_NAME
    TOTP_INTERVAL = int(os.environ.get('TOTP_INTERVAL', 30))  # seconds
    
    # Account Security
    MAX_LOGIN_ATTEMPTS = int(os.environ.get('MAX_LOGIN_ATTEMPTS', 5))
    ACCOUNT_LOCKOUT_DURATION = int(os.environ.get('ACCOUNT_LOCKOUT_DURATION', 30))  # minutes
    PASSWORD_RESET_EXPIRY = int(os.environ.get('PASSWORD_RESET_EXPIRY', 60))  # minutes
    
    # Data Retention
    AUDIT_LOG_RETENTION_DAYS = int(os.environ.get('AUDIT_LOG_RETENTION_DAYS', 2555))  # 7 years
    SESSION_LOG_RETENTION_DAYS = int(os.environ.get('SESSION_LOG_RETENTION_DAYS', 90))
    
    # Feature Flags
    ENABLE_2FA = os.environ.get('ENABLE_2FA', 'true').lower() in ['true', 'on', '1']
    ENABLE_EMAIL_NOTIFICATIONS = os.environ.get('ENABLE_EMAIL_NOTIFICATIONS', 'true').lower() in ['true', 'on', '1']
    ENABLE_AUDIT_LOGGING = os.environ.get('ENABLE_AUDIT_LOGGING', 'true').lower() in ['true', 'on', '1']
    ENABLE_AUTOMATED_BACKUPS = os.environ.get('ENABLE_AUTOMATED_BACKUPS', 'true').lower() in ['true', 'on', '1']
    
    # Performance Monitoring
    ENABLE_MONITORING = os.environ.get('ENABLE_MONITORING', 'false').lower() in ['true', 'on', '1']
    MONITORING_SAMPLE_RATE = float(os.environ.get('MONITORING_SAMPLE_RATE', 0.1))
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Set up logging
        import logging
        from logging.handlers import RotatingFileHandler
        
        if app.config['LOG_TO_FILE']:
            if not os.path.exists(os.path.dirname(app.config['LOG_FILE_PATH'])):
                os.makedirs(os.path.dirname(app.config['LOG_FILE_PATH']))
            
            file_handler = RotatingFileHandler(
                app.config['LOG_FILE_PATH'],
                maxBytes=app.config['LOG_MAX_BYTES'],
                backupCount=app.config['LOG_BACKUP_COUNT']
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(getattr(logging, app.config['LOG_LEVEL']))
            app.logger.addHandler(file_handler)
        
        app.logger.setLevel(getattr(logging, app.config['LOG_LEVEL']))
        
        # Security headers middleware
        @app.after_request
        def add_security_headers(response):
            for header, value in app.config['SECURITY_HEADERS'].items():
                response.headers[header] = value
            return response

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///accounting_dev.db'
    SQLALCHEMY_ECHO = os.environ.get('SQLALCHEMY_ECHO', 'false').lower() in ['true', 'on', '1']
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Longer for development
    
    # Development-specific settings
    MAIL_SUPPRESS_SEND = True  # Don't send emails in development
    WTF_CSRF_ENABLED = False
    
    # CORS origins for development
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Development-specific initialization
        app.logger.info('NGO Accounting System - Development Mode')

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    
    # Disable rate limiting for tests
    RATELIMIT_ENABLED = False
    
    # Short token expiry for testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Disable external services
    MAIL_SUPPRESS_SEND = True
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    
    # In-memory storage for testing
    REDIS_URL = 'redis://localhost:6379/15'  # Use different DB for tests
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Test-specific initialization
        app.logger.info('NGO Accounting System - Testing Mode')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://user:pass@localhost/accounting_prod'
    
    # Production security settings
    SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    
    # Stricter rate limiting
    RATELIMIT_DEFAULT = '500 per hour'
    
    # Production logging
    LOG_TO_STDOUT = True
    
    # Email configuration (required in production)
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Production-specific initialization
        import logging
        from logging import StreamHandler
        
        if app.config['LOG_TO_STDOUT']:
            stream_handler = StreamHandler()
            stream_handler.setLevel(logging.INFO)
            app.logger.addHandler(stream_handler)
        
        # Validate required production settings
        required_settings = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'DATABASE_URL',
            'MAIL_SERVER',
            'MAIL_USERNAME',
            'MAIL_PASSWORD'
        ]
        
        missing_settings = []
        for setting in required_settings:
            if not os.environ.get(setting):
                missing_settings.append(setting)
        
        if missing_settings:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_settings)}")
        
        app.logger.info('NGO Accounting System - Production Mode')

class StagingConfig(ProductionConfig):
    """Staging configuration (similar to production but with some debug features)"""
    DEBUG = False
    TESTING = False
    
    # Use staging database
    SQLALCHEMY_DATABASE_URI = os.environ.get('STAGING_DATABASE_URL') or \
        'postgresql://user:pass@localhost/accounting_staging'
    
    # Less strict rate limiting
    RATELIMIT_DEFAULT = '1000 per hour'
    
    @classmethod
    def init_app(cls, app):
        ProductionConfig.init_app(app)
        app.logger.info('NGO Accounting System - Staging Mode')

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Environment-specific configuration loader
def get_config():
    """Get configuration based on environment"""
    config_name = os.environ.get('FLASK_ENV', 'development')
    return config.get(config_name, config['default'])