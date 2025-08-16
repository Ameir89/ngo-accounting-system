# Authentication routes
# backend/api/auth.py
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
from models import db, User, Role
from utils.validators import validate_email, validate_password
from services.audit_service import log_audit_trail

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """User authentication endpoint"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password, data['password']) and user.is_active:
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Log successful login
        log_audit_trail('users', user.id, 'LOGIN', ip_address=request.remote_addr)
        
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role_name': user.role.name,
                'language': user.language
            }
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    """User registration endpoint (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Check if current user has admin privileges
    if not current_user or current_user.role.name != 'Administrator':
        return jsonify({'message': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Validate email format
    if not validate_email(data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    
    # Validate password strength
    if not validate_password(data['password']):
        return jsonify({'message': 'Password must be at least 8 characters with mixed case, numbers and symbols'}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone'),
        role_id=data['role_id'],
        language=data.get('language', 'en')
    )
    
    db.session.add(user)
    db.session.commit()
    
    log_audit_trail('users', user.id, 'INSERT', new_values={
        'username': user.username,
        'email': user.email,
        'role_id': user.role_id
    })
    
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role_name': user.role.name
        }
    }), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user information"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role_name': user.role.name,
        'language': user.language,
        'last_login': user.last_login.isoformat() if user.last_login else None
    })

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    data = request.get_json()
    
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current and new passwords required'}), 400
    
    # Verify current password
    if not check_password_hash(user.password, data['current_password']):
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    # Validate new password
    if not validate_password(data['new_password']):
        return jsonify({'message': 'New password does not meet requirements'}), 400
    
    # Update password
    user.password = generate_password_hash(data['new_password'])
    db.session.commit()
    
    log_audit_trail('users', user.id, 'UPDATE', old_values={'action': 'password_change'})
    
    return jsonify({'message': 'Password changed successfully'})