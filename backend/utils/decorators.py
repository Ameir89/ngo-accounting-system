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
            try:
                # Log the raw Authorization header
                auth_header = request.headers.get("Authorization", None)
                print("Authorization header:", auth_header)

                # Get current user identity from JWT
                current_user_id = get_jwt_identity()
                print("Decoded JWT identity (user id):", current_user_id)

                if not current_user_id:
                    print("JWT did not contain a valid identity")
                    return jsonify({'message': 'Invalid token identity'}), 401

                # Fetch user
                user = User.query.get(int(current_user_id))
                if not user:
                    print(f"User not found for ID {current_user_id}")
                    return jsonify({'message': 'User not found'}), 401
                if not user.is_active:
                    print(f"User {current_user_id} is inactive")
                    return jsonify({'message': 'User inactive'}), 401

                # Check permissions
                try:
                    user_permissions = json.loads(user.role.permissions or '[]')
                    print("User permissions:", user_permissions)
                except Exception as e:
                    print("Error parsing permissions JSON:", str(e))
                    return jsonify({'message': 'Permission parsing error'}), 500

                if permission not in user_permissions and '*' not in user_permissions:
                    print(f"Permission '{permission}' denied for user {current_user_id}")
                    return jsonify({'message': 'Insufficient permissions'}), 403

                # Attach user to global context
                g.current_user = user
                return f(*args, **kwargs)

            except Exception as e:
                print("Unexpected error in check_permission:", str(e))
                return jsonify({'message': 'Authentication/permission check failed', 'error': str(e)}), 500

        return decorated_function
    return decorator

# def check_permission(permission):
#     """Decorator to check user permissions"""
#     def decorator(f):
#         @wraps(f)
#         @jwt_required()
#         def decorated_function(*args, **kwargs):
#             current_user_id = get_jwt_identity()
#             print("Current user ID:", current_user_id)  # Debugging line
#             user = User.query.get(current_user_id)
#             if not user or not user.is_active:
#                 print("User not found or inactive")
#                 return jsonify({'message': 'User not found or inactive'}), 401
            
#             try:
#                 user_permissions = json.loads(user.role.permissions or '[]')
#                 if permission not in user_permissions and '*' not in user_permissions:
#                     return jsonify({'message': 'Insufficient permissions'}), 403
#             except:
#                 print("Permission error")
#                 return jsonify({'message': 'Permission error'}), 403
            
#             g.current_user = user
#             return f(*args, **kwargs)
#         return decorated_function
#     return decorator

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