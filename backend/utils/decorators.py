# Custom decorators
# backend/utils/decorators.py
from functools import wraps
from flask import g, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
import json

def check_permission(permission):
    """Decorator to check user permissions"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            if not user or not user.is_active:
                return jsonify({'message': 'User not found or inactive'}), 401
            
            try:
                user_permissions = json.loads(user.role.permissions or '[]')
                if permission not in user_permissions and '*' not in user_permissions:
                    return jsonify({'message': 'Insufficient permissions'}), 403
            except:
                return jsonify({'message': 'Permission error'}), 403
            
            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit(requests_per_hour=1000):
    """Simple rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple implementation - in production use Redis
            # This is a placeholder for rate limiting logic
            return f(*args, **kwargs)
        return decorated_function
    return decorator