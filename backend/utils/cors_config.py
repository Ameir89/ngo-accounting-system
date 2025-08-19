# backend/utils/cors_config.py
from flask_cors import CORS

def setup_cors(app):
    """Setup CORS configuration"""
    
    if app.config.get('FLASK_ENV') == 'development':
        # Development CORS - more permissive
        CORS(app, 
             origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
             expose_headers=['X-Total-Count', 'X-Page-Count'],
             supports_credentials=True,
             max_age=86400)
    else:
        # Production CORS - restrictive
        allowed_origins = app.config.get('CORS_ORIGINS', [])
        CORS(app,
             origins=allowed_origins,
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
             allow_headers=['Content-Type', 'Authorization'],
             supports_credentials=True,
             max_age=3600)