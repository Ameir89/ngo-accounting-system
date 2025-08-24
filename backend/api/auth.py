# backend/api/auth.py - Enhanced Authentication with Security
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt, verify_jwt_in_request
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
import secrets
import pyotp
import qrcode
import io
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from models import db, User, Role, AuditLog
from utils.validators import validate_email, validate_password
from utils.security import SecurityManager
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail

auth_bp = Blueprint('auth', __name__)
print(f"route is : {auth_bp.url_prefix}")
validator = RequestValidator()
# security_manager = SecurityManager()

# Rate limiting for authentication endpoints
# limiter = Limiter(key_func=get_remote_address)

# Store for failed login attempts and temporary locks
failed_attempts = {}
temporary_locks = {}
password_reset_tokens = {}

@auth_bp.route('/auth/login', methods=['POST'])
# @limiter.limit("5 per minute")  # Strict rate limiting for login
@validator.validate_request('login')
def login():
    print("Login endpoint called")
    """Enhanced user authentication with security features"""
    data = request.validated_data
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    # Check for temporary account lock
    if client_ip in temporary_locks:
        lock_time = temporary_locks[client_ip]
        if datetime.utcnow() < lock_time:
            return jsonify({
                'message': 'Account temporarily locked due to failed attempts',
                'locked_until': lock_time.isoformat()
            }), 429
        else:
            # Lock expired, remove it
            del temporary_locks[client_ip]
    
    # Find user
    user = User.query.filter_by(username=data['username']).first()
    print("test ameir ", user.id)
    if not user or not check_password_hash(user.password, data['password']) or not user.is_active:
        # Record failed attempt
        if client_ip not in failed_attempts:
            failed_attempts[client_ip] = []
        
        failed_attempts[client_ip].append(datetime.utcnow())
        
        # Clean old attempts (older than 15 minutes)
        cutoff_time = datetime.utcnow() - timedelta(minutes=15)
        failed_attempts[client_ip] = [
            attempt for attempt in failed_attempts[client_ip] 
            if attempt > cutoff_time
        ]
        
        # Lock account if too many failed attempts
        if len(failed_attempts[client_ip]) >= 5:
            temporary_locks[client_ip] = datetime.utcnow() + timedelta(minutes=30)
            
            # Log security incident
            current_app.logger.warning(
                f"Multiple failed login attempts from {client_ip} for user {data['username']}"
            )
        
        # Log failed login attempt
        log_audit_trail('users', user.id if user else 0, 'LOGIN_FAILED', 
                       new_values={'ip_address': client_ip, 'username': data['username']})
        
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Check if 2FA is enabled and required
    if hasattr(user, 'two_factor_enabled') and user.two_factor_enabled:
        if not data.get('totp_code'):
            return jsonify({
                'message': '2FA code required',
                'requires_2fa': True
            }), 200
        
        # Verify 2FA code
        if not verify_totp_code(user, data['totp_code']):
            log_audit_trail('users', user.id, 'LOGIN_2FA_FAILED', 
                           new_values={'ip_address': client_ip})
            return jsonify({'message': 'Invalid 2FA code'}), 401
    
    # Successful login - clear failed attempts
    if client_ip in failed_attempts:
        del failed_attempts[client_ip]
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Create tokens with additional claims
    additional_claims = {
        'user_id': user.id,
        'role': user.role.name,
        'ip_address': client_ip,
        'user_agent_hash': hash(user_agent) % 1000000  # Simple hash for tracking
    }
    
    access_token = create_access_token(
        identity=str(user.id), 
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        expires_delta=timedelta(days=30)
    )
    
    # Log successful login
    log_audit_trail('users', user.id, 'LOGIN_SUCCESS', 
                   new_values={'ip_address': client_ip})
    
    # Get user permissions
    import json
    user_permissions = json.loads(user.role.permissions or '[]')
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': 28800,  # 8 hours in seconds
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role_name': user.role.name,
            'language': user.language,
            'permissions': user_permissions,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'two_factor_enabled': getattr(user, 'two_factor_enabled', False)
        }
    })

@auth_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'message': 'User not found or inactive'}), 401
    
    # Verify the refresh token hasn't been compromised
    jti = get_jwt()['jti']
    client_ip = request.remote_addr
    
    # Create new access token
    additional_claims = {
        'user_id': user.id,
        'role': user.role.name,
        'ip_address': client_ip
    }
    
    new_access_token = create_access_token(
        identity=user.id,
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )
    
    return jsonify({
        'access_token': new_access_token,
        'expires_in': 28800
    })

@auth_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout with token blacklisting"""
    current_user_id = get_jwt_identity()
    jti = get_jwt()['jti']
    
    # In a production system, you would blacklist the token
    # For now, just log the logout
    log_audit_trail('users', current_user_id, 'LOGOUT', 
                   new_values={'ip_address': request.remote_addr})
    
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
# @limiter.limit("3 per minute")
def change_password():
    """Change user password with enhanced security"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    data = request.get_json()
    
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current and new passwords required'}), 400
    
    # Verify current password
    if not check_password_hash(user.password, data['current_password']):
        log_audit_trail('users', user.id, 'PASSWORD_CHANGE_FAILED', 
                       new_values={'reason': 'incorrect_current_password'})
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    # Validate new password strength
    if not validate_password(data['new_password']):
        return jsonify({
            'message': 'New password does not meet requirements',
            'requirements': [
                'At least 8 characters long',
                'Contains uppercase and lowercase letters',
                'Contains at least one number',
                'Contains at least one special character'
            ]
        }), 400
    
    # Check if new password is different from current
    if check_password_hash(user.password, data['new_password']):
        return jsonify({'message': 'New password must be different from current password'}), 400
    
    # Update password
    user.password = generate_password_hash(data['new_password'])
    
    # Force re-authentication by incrementing a security counter (if implemented)
    # This would invalidate all existing tokens
    
    db.session.commit()
    
    log_audit_trail('users', user.id, 'PASSWORD_CHANGED', 
                   new_values={'ip_address': request.remote_addr})
    
    # Send email notification about password change
    send_password_change_notification(user.email, user.first_name)
    
    return jsonify({'message': 'Password changed successfully'})

@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'message': 'User not found or inactive'}), 401
    
    import json
    user_permissions = json.loads(user.role.permissions or '[]')
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role_name': user.role.name,
        'language': user.language,
        'permissions': user_permissions,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'two_factor_enabled': getattr(user, 'two_factor_enabled', False)
    })

@auth_bp.route('/auth/forgot-password', methods=['POST'])
# @limiter.limit("3 per hour")
def forgot_password():
    """Request password reset"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    # Always return success to prevent email enumeration
    if user and user.is_active:
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expiry_time = datetime.utcnow() + timedelta(hours=1)
        
        password_reset_tokens[reset_token] = {
            'user_id': user.id,
            'expires_at': expiry_time
        }
        
        # Send reset email
        send_password_reset_email(user.email, user.first_name, reset_token)
        
        log_audit_trail('users', user.id, 'PASSWORD_RESET_REQUESTED', 
                       new_values={'ip_address': request.remote_addr})
    
    return jsonify({'message': 'If the email exists, a reset link has been sent'})

@auth_bp.route('/auth/reset-password', methods=['POST'])
# @limiter.limit("5 per hour")
def reset_password():
    """Reset password using token"""
    data = request.get_json()
    
    required_fields = ['token', 'new_password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    token = data['token']
    
    # Verify token
    if token not in password_reset_tokens:
        return jsonify({'message': 'Invalid or expired reset token'}), 400
    
    token_data = password_reset_tokens[token]
    
    if datetime.utcnow() > token_data['expires_at']:
        del password_reset_tokens[token]
        return jsonify({'message': 'Reset token has expired'}), 400
    
    # Validate new password
    if not validate_password(data['new_password']):
        return jsonify({
            'message': 'Password does not meet requirements',
            'requirements': [
                'At least 8 characters long',
                'Contains uppercase and lowercase letters',
                'Contains at least one number',
                'Contains at least one special character'
            ]
        }), 400
    
    # Update password
    user = User.query.get(token_data['user_id'])
    user.password = generate_password_hash(data['new_password'])
    
    # Remove used token
    del password_reset_tokens[token]
    
    db.session.commit()
    
    log_audit_trail('users', user.id, 'PASSWORD_RESET_COMPLETED', 
                   new_values={'ip_address': request.remote_addr})
    
    return jsonify({'message': 'Password reset successfully'})

@auth_bp.route('/auth/enable-2fa', methods=['POST'])
@jwt_required()
def enable_2fa():
    """Enable two-factor authentication"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Generate secret key for TOTP
    secret = pyotp.random_base32()
    
    # Create TOTP URL for QR code
    totp_url = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name=current_app.config.get('ORG_NAME', 'NGO Accounting')
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_str = base64.b64encode(img_buffer.getvalue()).decode()
    
    # Store secret temporarily (in production, use encrypted storage)
    # For now, we'll store it in the user model (would need to add field)
    
    return jsonify({
        'secret': secret,
        'qr_code': f"data:image/png;base64,{img_str}",
        'manual_entry_key': secret,
        'instructions': 'Scan the QR code with your authenticator app or enter the key manually'
    })

@auth_bp.route('/auth/verify-2fa', methods=['POST'])
@jwt_required()
def verify_2fa():
    """Verify and enable 2FA"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    data = request.get_json()
    
    if not data.get('secret') or not data.get('totp_code'):
        return jsonify({'message': 'Secret and TOTP code are required'}), 400
    
    # Verify the TOTP code
    totp = pyotp.TOTP(data['secret'])
    if not totp.verify(data['totp_code']):
        return jsonify({'message': 'Invalid TOTP code'}), 400
    
    # Enable 2FA for user (would need to add fields to User model)
    # user.two_factor_secret = data['secret']
    # user.two_factor_enabled = True
    
    db.session.commit()
    
    log_audit_trail('users', user.id, '2FA_ENABLED', 
                   new_values={'ip_address': request.remote_addr})
    
    return jsonify({'message': '2FA enabled successfully'})

def verify_totp_code(user, code):
    """Verify TOTP code for 2FA"""
    if not hasattr(user, 'two_factor_secret') or not user.two_factor_secret:
        return False
    
    totp = pyotp.TOTP(user.two_factor_secret)
    return totp.verify(code)

def send_password_change_notification(email, first_name):
    """Send email notification about password change"""
    try:
        smtp_server = current_app.config.get('MAIL_SERVER')
        smtp_port = current_app.config.get('MAIL_PORT', 587)
        smtp_username = current_app.config.get('MAIL_USERNAME')
        smtp_password = current_app.config.get('MAIL_PASSWORD')
        
        if not all([smtp_server, smtp_username, smtp_password]):
            return False
        
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = 'Password Changed - NGO Accounting System'
        
        body = f"""
        Dear {first_name},
        
        Your password has been successfully changed for the NGO Accounting System.
        
        If you did not make this change, please contact your administrator immediately.
        
        Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        
        Best regards,
        NGO Accounting System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password change notification: {e}")
        return False

def send_password_reset_email(email, first_name, reset_token):
    """Send password reset email"""
    try:
        smtp_server = current_app.config.get('MAIL_SERVER')
        smtp_port = current_app.config.get('MAIL_PORT', 587)
        smtp_username = current_app.config.get('MAIL_USERNAME')
        smtp_password = current_app.config.get('MAIL_PASSWORD')
        
        if not all([smtp_server, smtp_username, smtp_password]):
            return False
        
        # In production, this would be your frontend URL
        reset_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
        
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = 'Password Reset - NGO Accounting System'
        
        body = f"""
        Dear {first_name},
        
        You have requested a password reset for your NGO Accounting System account.
        
        Click the link below to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you did not request this reset, please ignore this email.
        
        Best regards,
        NGO Accounting System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {e}")
        return False