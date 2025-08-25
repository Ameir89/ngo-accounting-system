# backend/api/auth.py - Enhanced Authentication API with Security
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt, verify_jwt_in_request
)
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
import secrets
import pyotp
import qrcode
import io
import base64
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import smtplib
import json
import ipaddress
from collections import defaultdict
import time

from models import db, User, Role, AuditLog
from utils.validators import validate_email, validate_password
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail

auth_bp = Blueprint('auth', __name__)
validator = RequestValidator()

# In-memory storage for security tracking (use Redis in production)
failed_attempts = defaultdict(list)
temporary_locks = {}
password_reset_tokens = {}
active_sessions = defaultdict(set)

# Security configuration
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 30  # minutes
PASSWORD_RESET_EXPIRY = 60  # minutes
MAX_SESSIONS_PER_USER = 3

def is_ip_blocked(ip_address):
    """Check if IP is temporarily blocked"""
    if ip_address in temporary_locks:
        if datetime.utcnow() < temporary_locks[ip_address]:
            return True
        else:
            del temporary_locks[ip_address]
    return False

def record_failed_attempt(ip_address, username=None):
    """Record a failed login attempt"""
    current_time = datetime.utcnow()
    
    # Clean old attempts (older than 15 minutes)
    cutoff_time = current_time - timedelta(minutes=15)
    failed_attempts[ip_address] = [
        attempt for attempt in failed_attempts[ip_address] 
        if attempt['time'] > cutoff_time
    ]
    
    # Add new attempt
    failed_attempts[ip_address].append({
        'time': current_time,
        'username': username
    })
    
    # Check if should be locked
    if len(failed_attempts[ip_address]) >= MAX_LOGIN_ATTEMPTS:
        temporary_locks[ip_address] = current_time + timedelta(minutes=LOCKOUT_DURATION)
        current_app.logger.warning(f"IP {ip_address} locked due to {MAX_LOGIN_ATTEMPTS} failed attempts")

def clear_failed_attempts(ip_address):
    """Clear failed attempts for IP on successful login"""
    if ip_address in failed_attempts:
        del failed_attempts[ip_address]
    if ip_address in temporary_locks:
        del temporary_locks[ip_address]

def get_client_info(request):
    """Extract client information from request"""
    # Get real IP address considering proxies
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if client_ip and ',' in client_ip:
        client_ip = client_ip.split(',')[0].strip()
    
    user_agent = request.headers.get('User-Agent', '')[:200]  # Truncate long user agents
    
    return {
        'ip_address': client_ip,
        'user_agent': user_agent,
        'timestamp': datetime.utcnow()
    }

@auth_bp.route('/login', methods=['POST'])
@validator.validate_request('login')
def login():
    """Enhanced user authentication with comprehensive security"""
    data = request.validated_data
    client_info = get_client_info(request)
    
    # Check IP blocking
    if is_ip_blocked(client_info['ip_address']):
        lock_time = temporary_locks.get(client_info['ip_address'])
        return jsonify({
            'message': 'IP temporarily blocked due to multiple failed attempts',
            'locked_until': lock_time.isoformat() if lock_time else None,
            'retry_after_minutes': LOCKOUT_DURATION
        }), 429
    
    # Find and validate user
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.is_active:
        record_failed_attempt(client_info['ip_address'], data['username'])
        log_audit_trail('users', user.id if user else 0, 'LOGIN_FAILED', 
                       new_values={
                           'username': data['username'], 
                           'reason': 'user_not_found_or_inactive',
                           **client_info
                       })
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Verify password
    if not check_password_hash(user.password, data['password']):
        record_failed_attempt(client_info['ip_address'], data['username'])
        log_audit_trail('users', user.id, 'LOGIN_FAILED', 
                       new_values={
                           'username': data['username'], 
                           'reason': 'incorrect_password',
                           **client_info
                       })
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Check for 2FA requirement
    if getattr(user, 'two_factor_enabled', False):
        if not data.get('totp_code'):
            return jsonify({
                'message': '2FA code required',
                'requires_2fa': True,
                'user_id': user.id  # For 2FA verification
            }), 200
        
        # Verify 2FA code
        if not verify_totp_code(user, data['totp_code']):
            record_failed_attempt(client_info['ip_address'], data['username'])
            log_audit_trail('users', user.id, 'LOGIN_2FA_FAILED', 
                           new_values={'username': data['username'], **client_info})
            return jsonify({'message': 'Invalid 2FA code'}), 401
    
    # Check concurrent sessions limit
    user_sessions = active_sessions[user.id]
    if len(user_sessions) >= MAX_SESSIONS_PER_USER:
        # Remove oldest session
        oldest_session = min(user_sessions)
        user_sessions.remove(oldest_session)
    
    # Successful authentication
    clear_failed_attempts(client_info['ip_address'])
    
    # Update user login info
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Create session ID and tokens
    session_id = secrets.token_urlsafe(32)
    active_sessions[user.id].add(session_id)
    
    # Create JWT tokens with additional claims
    additional_claims = {
        'user_id': user.id,
        'role': user.role.name,
        'session_id': session_id,
        'ip_address': client_info['ip_address'],
        'user_agent_hash': abs(hash(client_info['user_agent'])) % 1000000
    }
    
    access_token = create_access_token(
        identity=str(user.id), 
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )
    
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={'session_id': session_id},
        expires_delta=timedelta(days=30)
    )
    
    # Log successful login
    log_audit_trail('users', user.id, 'LOGIN_SUCCESS', 
                   new_values={
                       'session_id': session_id,
                       **client_info
                   })
    
    # Get user permissions
    try:
        user_permissions = json.loads(user.role.permissions or '[]')
    except:
        user_permissions = []
    
    return jsonify({
        'success': True,
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'expires_in': 28800,  # 8 hours in seconds
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}",
            'role': {
                'id': user.role.id,
                'name': user.role.name,
                'description': user.role.description
            },
            'language': user.language,
            'permissions': user_permissions,
            'last_login': user.last_login.isoformat(),
            'two_factor_enabled': getattr(user, 'two_factor_enabled', False)
        },
        'session_info': {
            'session_id': session_id,
            'expires_at': (datetime.utcnow() + timedelta(hours=8)).isoformat(),
            'created_at': datetime.utcnow().isoformat()
        }
    })

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token with security validation"""
    current_user_id = get_jwt_identity()
    jwt_claims = get_jwt()
    session_id = jwt_claims.get('session_id')
    
    # Validate user exists and is active
    user = User.query.get(current_user_id)
    if not user or not user.is_active:
        return jsonify({'message': 'User not found or inactive'}), 401
    
    # Validate session is still active
    if session_id not in active_sessions.get(int(current_user_id), set()):
        return jsonify({'message': 'Session expired or invalid'}), 401
    
    client_info = get_client_info(request)
    
    # Create new access token
    additional_claims = {
        'user_id': user.id,
        'role': user.role.name,
        'session_id': session_id,
        'ip_address': client_info['ip_address'],
        'user_agent_hash': abs(hash(client_info['user_agent'])) % 1000000
    }
    
    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=8)
    )
    
    log_audit_trail('users', user.id, 'TOKEN_REFRESHED', 
                   new_values={'session_id': session_id, **client_info})
    
    return jsonify({
        'access_token': new_access_token,
        'token_type': 'Bearer',
        'expires_in': 28800,
        'refreshed_at': datetime.utcnow().isoformat()
    })

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Enhanced logout with session management"""
    current_user_id = get_jwt_identity()
    jwt_claims = get_jwt()
    session_id = jwt_claims.get('session_id')
    
    # Remove session from active sessions
    if session_id and int(current_user_id) in active_sessions:
        active_sessions[int(current_user_id)].discard(session_id)
    
    client_info = get_client_info(request)
    
    log_audit_trail('users', current_user_id, 'LOGOUT', 
                   new_values={'session_id': session_id, **client_info})
    
    return jsonify({
        'message': 'Logged out successfully',
        'logged_out_at': datetime.utcnow().isoformat()
    })

@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required()
def logout_all_sessions():
    """Logout from all active sessions"""
    current_user_id = get_jwt_identity()
    
    # Clear all sessions for the user
    if int(current_user_id) in active_sessions:
        session_count = len(active_sessions[int(current_user_id)])
        active_sessions[int(current_user_id)].clear()
    else:
        session_count = 0
    
    client_info = get_client_info(request)
    
    log_audit_trail('users', current_user_id, 'LOGOUT_ALL_SESSIONS', 
                   new_values={'sessions_terminated': session_count, **client_info})
    
    return jsonify({
        'message': 'All sessions logged out successfully',
        'sessions_terminated': session_count,
        'logged_out_at': datetime.utcnow().isoformat()
    })

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Enhanced password change with security validation"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current password and new password are required'}), 400
    
    # Verify current password
    if not check_password_hash(user.password, data['current_password']):
        client_info = get_client_info(request)
        log_audit_trail('users', user.id, 'PASSWORD_CHANGE_FAILED', 
                       new_values={'reason': 'incorrect_current_password', **client_info})
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    # Validate new password strength
    if not validate_password(data['new_password']):
        return jsonify({
            'message': 'New password does not meet security requirements',
            'requirements': [
                'At least 8 characters long',
                'Contains uppercase and lowercase letters',
                'Contains at least one number',
                'Contains at least one special character (!@#$%^&*(),.?":{}|<>)'
            ]
        }), 400
    
    # Check if new password is different from current
    if check_password_hash(user.password, data['new_password']):
        return jsonify({'message': 'New password must be different from current password'}), 400
    
    # Update password
    user.password = generate_password_hash(data['new_password'])
    db.session.commit()
    
    # Terminate all sessions except current one (force re-login)
    jwt_claims = get_jwt()
    current_session = jwt_claims.get('session_id')
    if int(current_user_id) in active_sessions:
        old_sessions = active_sessions[int(current_user_id)].copy()
        active_sessions[int(current_user_id)].clear()
        if current_session:
            active_sessions[int(current_user_id)].add(current_session)
    
    client_info = get_client_info(request)
    log_audit_trail('users', user.id, 'PASSWORD_CHANGED', 
                   new_values={**client_info})
    
    # Send email notification (if configured)
    send_password_change_notification(user.email, user.first_name)
    
    return jsonify({
        'message': 'Password changed successfully',
        'sessions_terminated': len(old_sessions) - 1 if current_session in old_sessions else len(old_sessions),
        'changed_at': datetime.utcnow().isoformat()
    })

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset with rate limiting"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400
    
    client_info = get_client_info(request)
    
    # Rate limiting check
    reset_attempts_key = f"reset_{client_info['ip_address']}"
    if reset_attempts_key in failed_attempts:
        recent_attempts = [
            attempt for attempt in failed_attempts[reset_attempts_key]
            if attempt['time'] > datetime.utcnow() - timedelta(hours=1)
        ]
        if len(recent_attempts) >= 3:  # Max 3 reset attempts per hour
            return jsonify({
                'message': 'Too many password reset attempts. Please try again later.',
                'retry_after_minutes': 60
            }), 429
    
    user = User.query.filter_by(email=data['email']).first()
    
    # Always return success to prevent email enumeration
    if user and user.is_active:
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expiry_time = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRY)
        
        password_reset_tokens[reset_token] = {
            'user_id': user.id,
            'email': user.email,
            'expires_at': expiry_time,
            'ip_address': client_info['ip_address']
        }
        
        # Send reset email
        if send_password_reset_email(user.email, user.first_name, reset_token):
            email_sent = True
        else:
            email_sent = False
        
        log_audit_trail('users', user.id, 'PASSWORD_RESET_REQUESTED', 
                       new_values={'email_sent': email_sent, **client_info})
    
    # Record attempt
    if reset_attempts_key not in failed_attempts:
        failed_attempts[reset_attempts_key] = []
    failed_attempts[reset_attempts_key].append({'time': datetime.utcnow()})
    
    return jsonify({
        'message': 'If the email exists in our system, a password reset link has been sent',
        'instructions': 'Check your email for reset instructions. The link will expire in 60 minutes.'
    })

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token with enhanced validation"""
    data = request.get_json()
    
    required_fields = ['token', 'new_password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    token = data['token']
    client_info = get_client_info(request)
    
    # Verify token exists and is valid
    if token not in password_reset_tokens:
        log_audit_trail('users', 0, 'PASSWORD_RESET_FAILED', 
                       new_values={'reason': 'invalid_token', **client_info})
        return jsonify({'message': 'Invalid or expired reset token'}), 400
    
    token_data = password_reset_tokens[token]
    
    # Check token expiration
    if datetime.utcnow() > token_data['expires_at']:
        del password_reset_tokens[token]
        log_audit_trail('users', token_data['user_id'], 'PASSWORD_RESET_FAILED', 
                       new_values={'reason': 'token_expired', **client_info})
        return jsonify({'message': 'Reset token has expired'}), 400
    
    # Validate new password
    if not validate_password(data['new_password']):
        return jsonify({
            'message': 'Password does not meet security requirements',
            'requirements': [
                'At least 8 characters long',
                'Contains uppercase and lowercase letters',
                'Contains at least one number',
                'Contains at least one special character'
            ]
        }), 400
    
    # Update password
    user = User.query.get(token_data['user_id'])
    if not user or not user.is_active:
        del password_reset_tokens[token]
        return jsonify({'message': 'User not found or inactive'}), 400
    
    # Check if new password is different from current
    if check_password_hash(user.password, data['new_password']):
        return jsonify({'message': 'New password must be different from current password'}), 400
    
    user.password = generate_password_hash(data['new_password'])
    db.session.commit()
    
    # Clear all active sessions for security
    if user.id in active_sessions:
        active_sessions[user.id].clear()
    
    # Remove used token
    del password_reset_tokens[token]
    
    log_audit_trail('users', user.id, 'PASSWORD_RESET_COMPLETED', 
                   new_values={**client_info})
    
    # Send confirmation email
    send_password_reset_confirmation(user.email, user.first_name)
    
    return jsonify({
        'message': 'Password reset successfully',
        'instructions': 'Please log in with your new password. All existing sessions have been terminated.',
        'reset_at': datetime.utcnow().isoformat()
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information with session details"""
    current_user_id = get_jwt_identity()
    jwt_claims = get_jwt()
    session_id = jwt_claims.get('session_id')
    
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'message': 'User not found or inactive'}), 401
    
    try:
        user_permissions = json.loads(user.role.permissions or '[]')
    except:
        user_permissions = []
    
    # Get active sessions count
    active_session_count = len(active_sessions.get(user.id, set()))
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}",
            'phone': user.phone,
            'language': user.language,
            'role': {
                'id': user.role.id,
                'name': user.role.name,
                'description': user.role.description,
                'permissions': user_permissions
            },
            'account_info': {
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'two_factor_enabled': getattr(user, 'two_factor_enabled', False)
            }
        },
        'session_info': {
            'current_session_id': session_id,
            'active_sessions': active_session_count,
            'token_issued_at': jwt_claims.get('iat'),
            'token_expires_at': jwt_claims.get('exp')
        }
    })

@auth_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    """Get information about active sessions"""
    current_user_id = get_jwt_identity()
    jwt_claims = get_jwt()
    current_session_id = jwt_claims.get('session_id')
    
    user_sessions = active_sessions.get(int(current_user_id), set())
    
    # In a production system, you'd store session metadata in database/Redis
    sessions_info = []
    for session in user_sessions:
        sessions_info.append({
            'session_id': session,
            'is_current': session == current_session_id,
            'created_at': datetime.utcnow().isoformat(),  # This would be actual creation time
            'last_activity': datetime.utcnow().isoformat(),  # This would be actual last activity
            'user_agent': 'Unknown',  # This would be stored session data
            'ip_address': 'Unknown'  # This would be stored session data
        })
    
    return jsonify({
        'active_sessions': sessions_info,
        'total_sessions': len(sessions_info),
        'current_session_id': current_session_id
    })

@auth_bp.route('/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def terminate_session(session_id):
    """Terminate a specific session"""
    current_user_id = get_jwt_identity()
    jwt_claims = get_jwt()
    current_session_id = jwt_claims.get('session_id')
    
    if session_id == current_session_id:
        return jsonify({'message': 'Cannot terminate current session. Use logout instead.'}), 400
    
    # Remove session
    user_sessions = active_sessions.get(int(current_user_id), set())
    if session_id in user_sessions:
        user_sessions.remove(session_id)
        
        client_info = get_client_info(request)
        log_audit_trail('users', current_user_id, 'SESSION_TERMINATED', 
                       new_values={'terminated_session_id': session_id, **client_info})
        
        return jsonify({
            'message': 'Session terminated successfully',
            'terminated_session_id': session_id
        })
    else:
        return jsonify({'message': 'Session not found'}), 404

# Helper functions
def verify_totp_code(user, code):
    """Verify TOTP code for 2FA (placeholder implementation)"""
    # This would integrate with actual 2FA implementation
    if not hasattr(user, 'two_factor_secret') or not user.two_factor_secret:
        return False
    
    totp = pyotp.TOTP(user.two_factor_secret)
    return totp.verify(code, valid_window=1)

def send_password_change_notification(email, first_name):
    """Send password change notification email"""
    try:
        smtp_config = {
            'server': current_app.config.get('MAIL_SERVER'),
            'port': current_app.config.get('MAIL_PORT', 587),
            'username': current_app.config.get('MAIL_USERNAME'),
            'password': current_app.config.get('MAIL_PASSWORD')
        }
        
        if not all(smtp_config.values()):
            current_app.logger.warning("Email configuration incomplete")
            return False
        
        msg = MimeMultipart()
        msg['From'] = smtp_config['username']
        msg['To'] = email
        msg['Subject'] = f'{current_app.config.get("ORG_NAME", "NGO Accounting")} - Password Changed'
        
        body = f"""
        Dear {first_name},
        
        Your password has been successfully changed for your {current_app.config.get('ORG_NAME', 'NGO Accounting')} account.
        
        If you did not make this change, please contact your administrator immediately.
        
        Security Details:
        - Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        - All other sessions have been terminated for security
        
        Best regards,
        {current_app.config.get('ORG_NAME', 'NGO Accounting')} Security Team
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_config['server'], smtp_config['port'])
        server.starttls()
        server.login(smtp_config['username'], smtp_config['password'])
        server.sendmail(smtp_config['username'], email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password change notification: {e}")
        return False

def send_password_reset_email(email, first_name, reset_token):
    """Send password reset email"""
    try:
        smtp_config = {
            'server': current_app.config.get('MAIL_SERVER'),
            'port': current_app.config.get('MAIL_PORT', 587),
            'username': current_app.config.get('MAIL_USERNAME'),
            'password': current_app.config.get('MAIL_PASSWORD')
        }
        
        if not all(smtp_config.values()):
            return False
        
        reset_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
        
        msg = MimeMultipart()
        msg['From'] = smtp_config['username']
        msg['To'] = email
        msg['Subject'] = f'{current_app.config.get("ORG_NAME", "NGO Accounting")} - Password Reset'
        
        body = f"""
        Dear {first_name},
        
        You have requested a password reset for your {current_app.config.get('ORG_NAME', 'NGO Accounting')} account.
        
        Click the link below to reset your password:
        {reset_url}
        
        This link will expire in {PASSWORD_RESET_EXPIRY} minutes for security reasons.
        
        If you did not request this reset, please ignore this email and contact your administrator if you have concerns.
        
        Best regards,
        {current_app.config.get('ORG_NAME', 'NGO Accounting')} Team
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_config['server'], smtp_config['port'])
        server.starttls()
        server.login(smtp_config['username'], smtp_config['password'])
        server.sendmail(smtp_config['username'], email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {e}")
        return False

def send_password_reset_confirmation(email, first_name):
    """Send password reset confirmation email"""
    try:
        smtp_config = {
            'server': current_app.config.get('MAIL_SERVER'),
            'port': current_app.config.get('MAIL_PORT', 587),
            'username': current_app.config.get('MAIL_USERNAME'),
            'password': current_app.config.get('MAIL_PASSWORD')
        }
        
        if not all(smtp_config.values()):
            return False
        
        msg = MimeMultipart()
        msg['From'] = smtp_config['username']
        msg['To'] = email
        msg['Subject'] = f'{current_app.config.get("ORG_NAME", "NGO Accounting")} - Password Reset Completed'
        
        body = f"""
        Dear {first_name},
        
        Your password has been successfully reset for your {current_app.config.get('ORG_NAME', 'NGO Accounting')} account.
        
        Security Details:
        - Reset completed: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        - All existing sessions have been terminated
        
        You can now log in with your new password.
        
        If you did not perform this reset, please contact your administrator immediately.
        
        Best regards,
        {current_app.config.get('ORG_NAME', 'NGO Accounting')} Security Team
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_config['server'], smtp_config['port'])
        server.starttls()
        server.login(smtp_config['username'], smtp_config['password'])
        server.sendmail(smtp_config['username'], email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset confirmation: {e}")
        return False