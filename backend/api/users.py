# backend/api/users.py - Complete User Management API
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, func, and_
from datetime import datetime, date, timedelta
from models import db, User, Role, AuditLog
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from utils.validators import validate_email, validate_password
from services.audit_service import log_audit_trail
import secrets
import json

users_bp = Blueprint('users', __name__)
validator = RequestValidator()

@users_bp.route('', methods=['GET'])
@check_permission('user_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    search={'type': str},
    role_id={'type': int, 'min': 1},
    is_active={'type': bool}
)
def get_users():
    """Get list of users with comprehensive filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    role_id = request.args.get('role_id', type=int)
    is_active = request.args.get('is_active')
    
    # Optimized query with joins to avoid N+1 queries
    query = User.query.join(Role)
    
    # Apply filters
    if search:
        query = query.filter(or_(
            User.username.ilike(f'%{search}%'),
            User.email.ilike(f'%{search}%'),
            User.first_name.ilike(f'%{search}%'),
            User.last_name.ilike(f'%{search}%'),
            func.concat(User.first_name, ' ', User.last_name).ilike(f'%{search}%')
        ))
    
    if role_id:
        query = query.filter(User.role_id == role_id)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.order_by(User.first_name, User.last_name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    users_data = []
    for user in users.items:
        # Get user activity statistics
        login_count = AuditLog.query.filter(
            and_(
                AuditLog.user_id == user.id,
                AuditLog.action == 'LOGIN_SUCCESS',
                AuditLog.timestamp >= datetime.utcnow() - timedelta(days=30)
            )
        ).count()
        
        # Parse user permissions
        try:
            user_permissions = json.loads(user.role.permissions or '[]')
        except:
            user_permissions = []
        
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'personal_info': {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}",
                'phone': user.phone
            },
            'account_info': {
                'role': {
                    'id': user.role.id,
                    'name': user.role.name,
                    'description': user.role.description
                },
                'language': user.language,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            },
            'statistics': {
                'login_count_30d': login_count,
                'permission_count': len(user_permissions),
                'has_admin_access': '*' in user_permissions or user.role.name == 'Administrator'
            }
        })
    
    return jsonify({
        'users': users_data,
        'pagination': {
            'total': users.total,
            'pages': users.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': users.has_next,
            'has_prev': users.has_prev
        },
        'summary': {
            'total_users': users.total,
            'active_users': User.query.filter_by(is_active=True).count(),
            'inactive_users': User.query.filter_by(is_active=False).count()
        }
    })

@users_bp.route('', methods=['POST'])
@check_permission('user_create')
def create_user():
    """Create a new user with comprehensive validation"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role_id']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate username format and uniqueness
    username = data['username'].strip().lower()
    if len(username) < 3 or len(username) > 50:
        return jsonify({'message': 'Username must be between 3 and 50 characters'}), 400
    
    if not username.replace('_', '').replace('-', '').isalnum():
        return jsonify({'message': 'Username can only contain letters, numbers, underscores, and hyphens'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 400
    
    # Validate email
    email = data['email'].strip().lower()
    if not validate_email(email):
        return jsonify({'message': 'Invalid email format'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    # Validate password strength
    if not validate_password(data['password']):
        return jsonify({
            'message': 'Password does not meet security requirements',
            'requirements': [
                'At least 8 characters long',
                'Contains uppercase and lowercase letters',
                'Contains at least one number',
                'Contains at least one special character (!@#$%^&*(),.?":{}|<>)'
            ]
        }), 400
    
    # Validate role exists and is active
    role = Role.query.get(data['role_id'])
    if not role:
        return jsonify({'message': 'Invalid role specified'}), 400
    
    # Validate names
    first_name = data['first_name'].strip()
    last_name = data['last_name'].strip()
    if not first_name or not last_name:
        return jsonify({'message': 'First name and last name are required'}), 400
    
    if len(first_name) > 50 or len(last_name) > 50:
        return jsonify({'message': 'Names must be less than 50 characters'}), 400
    
    # Validate optional fields
    phone = data.get('phone', '').strip()
    if phone and len(phone) > 20:
        return jsonify({'message': 'Phone number must be less than 20 characters'}), 400
    
    language = data.get('language', 'en')
    if language not in ['en', 'ar']:
        return jsonify({'message': 'Language must be "en" or "ar"'}), 400
    
    try:
        # Create user
        user = User(
            username=username,
            email=email,
            password=generate_password_hash(data['password']),
            first_name=first_name,
            last_name=last_name,
            phone=phone if phone else None,
            role_id=data['role_id'],
            language=language,
            is_active=True
        )
        
        db.session.add(user)
        db.session.commit()
        
        log_audit_trail('users', user.id, 'INSERT', new_values={
            'username': user.username,
            'email': user.email,
            'role_name': role.name,
            'created_by': g.current_user.username
        })
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f"{user.first_name} {user.last_name}",
            'role_name': role.name,
            'is_active': user.is_active,
            'message': 'User created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create user',
            'error': str(e)
        }), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@check_permission('user_read')
def get_user(user_id):
    """Get detailed user information"""
    user = User.query.get_or_404(user_id)
    
    # Get user activity history
    recent_activities = AuditLog.query.filter_by(user_id=user.id).order_by(
        AuditLog.timestamp.desc()
    ).limit(10).all()
    
    activity_data = []
    for activity in recent_activities:
        activity_data.append({
            'id': activity.id,
            'action': activity.action,
            'table_name': activity.table_name,
            'timestamp': activity.timestamp.isoformat(),
            'ip_address': activity.ip_address
        })
    
    # Get login statistics
    login_stats = {
        'last_30_days': AuditLog.query.filter(
            and_(
                AuditLog.user_id == user.id,
                AuditLog.action == 'LOGIN_SUCCESS',
                AuditLog.timestamp >= datetime.utcnow() - timedelta(days=30)
            )
        ).count(),
        'last_7_days': AuditLog.query.filter(
            and_(
                AuditLog.user_id == user.id,
                AuditLog.action == 'LOGIN_SUCCESS',
                AuditLog.timestamp >= datetime.utcnow() - timedelta(days=7)
            )
        ).count()
    }
    
    # Parse permissions
    try:
        user_permissions = json.loads(user.role.permissions or '[]')
    except:
        user_permissions = []
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'personal_info': {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}",
                'phone': user.phone
            },
            'account_info': {
                'role': {
                    'id': user.role.id,
                    'name': user.role.name,
                    'description': user.role.description,
                    'permissions': user_permissions
                },
                'language': user.language,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        },
        'activity': {
            'login_statistics': login_stats,
            'recent_activities': activity_data
        }
    })

@users_bp.route('/<int:user_id>', methods=['PUT'])
@check_permission('user_update')
def update_user(user_id):
    """Update user information with security checks"""
    user = User.query.get_or_404(user_id)
    current_user = g.current_user
    
    # Security check: users can only update their own profile unless they're admin
    if user.id != current_user.id and not ('*' in json.loads(current_user.role.permissions or '[]')):
        return jsonify({'message': 'Insufficient permissions to update this user'}), 403
    
    old_values = {
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': user.phone,
        'role_id': user.role_id,
        'is_active': user.is_active
    }
    
    data = request.get_json()
    
    # Validate email if being updated
    if 'email' in data and data['email'] != user.email:
        email = data['email'].strip().lower()
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Check for duplicate email
        existing_user = User.query.filter(
            User.email == email,
            User.id != user_id
        ).first()
        if existing_user:
            return jsonify({'message': 'Email already exists'}), 400
        
        user.email = email
    
    # Update basic info
    if 'first_name' in data:
        first_name = data['first_name'].strip()
        if not first_name or len(first_name) > 50:
            return jsonify({'message': 'Invalid first name'}), 400
        user.first_name = first_name
    
    if 'last_name' in data:
        last_name = data['last_name'].strip()
        if not last_name or len(last_name) > 50:
            return jsonify({'message': 'Invalid last name'}), 400
        user.last_name = last_name
    
    if 'phone' in data:
        phone = data['phone'].strip() if data['phone'] else None
        if phone and len(phone) > 20:
            return jsonify({'message': 'Phone number too long'}), 400
        user.phone = phone
    
    if 'language' in data:
        if data['language'] not in ['en', 'ar']:
            return jsonify({'message': 'Invalid language'}), 400
        user.language = data['language']
    
    # Admin-only updates
    is_admin = '*' in json.loads(current_user.role.permissions or '[]')
    
    if 'role_id' in data and is_admin:
        role = Role.query.get(data['role_id'])
        if not role:
            return jsonify({'message': 'Invalid role'}), 400
        user.role_id = data['role_id']
    elif 'role_id' in data and not is_admin:
        return jsonify({'message': 'Insufficient permissions to change role'}), 403
    
    if 'is_active' in data and is_admin:
        # Prevent admin from deactivating themselves
        if user.id == current_user.id and not data['is_active']:
            return jsonify({'message': 'Cannot deactivate your own account'}), 400
        user.is_active = data['is_active']
    elif 'is_active' in data and not is_admin:
        return jsonify({'message': 'Insufficient permissions to change account status'}), 403
    
    try:
        db.session.commit()
        
        new_values = {
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'role_id': user.role_id,
            'is_active': user.is_active
        }
        
        log_audit_trail('users', user.id, 'UPDATE', 
                       old_values=old_values, new_values=new_values)
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f"{user.first_name} {user.last_name}",
            'role_name': user.role.name,
            'is_active': user.is_active,
            'message': 'User updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update user',
            'error': str(e)
        }), 500

@users_bp.route('/<int:user_id>/change-password', methods=['POST'])
@check_permission('user_update')
def change_user_password(user_id):
    """Change user password with security validation"""
    user = User.query.get_or_404(user_id)
    current_user = g.current_user
    data = request.get_json()
    
    # Security check: users can only change their own password unless they're admin
    is_admin = '*' in json.loads(current_user.role.permissions or '[]')
    if user.id != current_user.id and not is_admin:
        return jsonify({'message': 'Insufficient permissions to change this user\'s password'}), 403
    
    # For self-password change, require current password
    if user.id == current_user.id:
        if not data.get('current_password'):
            return jsonify({'message': 'Current password is required'}), 400
        
        if not check_password_hash(user.password, data['current_password']):
            log_audit_trail('users', user.id, 'PASSWORD_CHANGE_FAILED', 
                           new_values={'reason': 'incorrect_current_password'})
            return jsonify({'message': 'Current password is incorrect'}), 400
    
    # Validate new password
    if not data.get('new_password'):
        return jsonify({'message': 'New password is required'}), 400
    
    if not validate_password(data['new_password']):
        return jsonify({
            'message': 'New password does not meet security requirements',
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
    
    try:
        # Update password
        user.password = generate_password_hash(data['new_password'])
        db.session.commit()
        
        log_audit_trail('users', user.id, 'PASSWORD_CHANGED', 
                       new_values={'changed_by': current_user.username})
        
        # Send password change notification email (if email service configured)
        # This would be implemented in a production system
        
        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to change password',
            'error': str(e)
        }), 500

@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@check_permission('user_admin')  # Admin only
def reset_user_password(user_id):
    """Reset user password (admin function)"""
    user = User.query.get_or_404(user_id)
    current_user = g.current_user
    
    # Generate temporary password
    temp_password = secrets.token_urlsafe(12)
    
    try:
        # Update password
        user.password = generate_password_hash(temp_password)
        db.session.commit()
        
        log_audit_trail('users', user.id, 'PASSWORD_RESET', 
                       new_values={'reset_by': current_user.username})
        
        return jsonify({
            'message': 'Password reset successfully',
            'temporary_password': temp_password,
            'instructions': 'User must change this password on next login'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to reset password',
            'error': str(e)
        }), 500

@users_bp.route('/<int:user_id>/activity', methods=['GET'])
@check_permission('user_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    action_type={'type': str},
    start_date={'type': str},
    end_date={'type': str}
)
def get_user_activity(user_id):
    """Get detailed user activity log"""
    user = User.query.get_or_404(user_id)
    current_user = g.current_user
    
    # Security check: users can only view their own activity unless they're admin
    is_admin = '*' in json.loads(current_user.role.permissions or '[]')
    if user.id != current_user.id and not is_admin:
        return jsonify({'message': 'Insufficient permissions to view this user\'s activity'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    action_type = request.args.get('action_type')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Build query
    query = AuditLog.query.filter_by(user_id=user_id)
    
    # Apply filters
    if action_type:
        query = query.filter(AuditLog.action.ilike(f'%{action_type}%'))
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(AuditLog.timestamp >= start_date)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            query = query.filter(AuditLog.timestamp <= end_date)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    activities = query.order_by(AuditLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    activities_data = []
    for activity in activities.items:
        # Parse old and new values if they exist
        old_values = None
        new_values = None
        
        try:
            if activity.old_values:
                old_values = json.loads(activity.old_values)
        except:
            pass
        
        try:
            if activity.new_values:
                new_values = json.loads(activity.new_values)
        except:
            pass
        
        activities_data.append({
            'id': activity.id,
            'action': activity.action,
            'table_name': activity.table_name,
            'record_id': activity.record_id,
            'timestamp': activity.timestamp.isoformat(),
            'ip_address': activity.ip_address,
            'user_agent': activity.user_agent,
            'old_values': old_values,
            'new_values': new_values
        })
    
    # Activity summary
    activity_summary = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter_by(user_id=user_id).group_by(AuditLog.action).all()
    
    summary_data = {action: count for action, count in activity_summary}
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}"
        },
        'activities': activities_data,
        'pagination': {
            'total': activities.total,
            'pages': activities.pages,
            'current_page': page,
            'per_page': per_page
        },
        'summary': {
            'activity_counts': summary_data,
            'total_activities': activities.total
        }
    })

@users_bp.route('/<int:user_id>/permissions', methods=['GET'])
@check_permission('user_read')
def get_user_permissions(user_id):
    """Get detailed user permissions breakdown"""
    user = User.query.get_or_404(user_id)
    
    try:
        user_permissions = json.loads(user.role.permissions or '[]')
    except:
        user_permissions = []
    
    # Define all possible permissions with descriptions
    all_permissions = {
        # Account permissions
        'account_create': 'Create new accounts',
        'account_read': 'View accounts',
        'account_update': 'Update account information',
        'account_delete': 'Delete accounts',
        
        # Journal permissions
        'journal_create': 'Create journal entries',
        'journal_read': 'View journal entries',
        'journal_update': 'Update journal entries',
        'journal_delete': 'Delete journal entries',
        'journal_post': 'Post journal entries',
        
        # Report permissions
        'reports_read': 'View financial reports',
        'reports_export': 'Export reports',
        
        # User management
        'user_create': 'Create new users',
        'user_read': 'View user information',
        'user_update': 'Update user information',
        'user_delete': 'Delete users',
        'user_admin': 'Full user administration',
        
        # Grant management
        'grant_create': 'Create grants',
        'grant_read': 'View grants',
        'grant_update': 'Update grants',
        'grant_delete': 'Delete grants',
        
        # Other permissions
        'dashboard_read': 'Access dashboard',
        'audit_read': 'View audit logs',
        'system_admin': 'System administration',
        '*': 'Full system access (Administrator)'
    }
    
    # Determine effective permissions
    if '*' in user_permissions:
        effective_permissions = list(all_permissions.keys())
    else:
        effective_permissions = user_permissions
    
    permissions_breakdown = []
    for perm in effective_permissions:
        permissions_breakdown.append({
            'permission': perm,
            'description': all_permissions.get(perm, 'Custom permission'),
            'granted_directly': perm in user_permissions,
            'granted_via_admin': '*' in user_permissions and perm != '*'
        })
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'role_name': user.role.name
        },
        'permissions': {
            'role_permissions': user_permissions,
            'effective_permissions': effective_permissions,
            'permissions_breakdown': permissions_breakdown,
            'is_admin': '*' in user_permissions,
            'total_permissions': len(effective_permissions)
        }
    })

# ============================================================================
# ROLE MANAGEMENT ENDPOINTS
# ============================================================================

@users_bp.route('/roles', methods=['GET'])
@check_permission('user_read')
def get_roles():
    """Get list of all roles"""
    roles = Role.query.order_by(Role.name).all()
    
    roles_data = []
    for role in roles:
        try:
            role_permissions = json.loads(role.permissions or '[]')
        except:
            role_permissions = []
        
        # Count users with this role
        user_count = User.query.filter_by(role_id=role.id).count()
        
        roles_data.append({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'permissions': role_permissions,
            'permission_count': len(role_permissions),
            'user_count': user_count,
            'is_admin_role': '*' in role_permissions,
            'created_at': role.created_at.isoformat()
        })
    
    return jsonify({
        'roles': roles_data,
        'total_roles': len(roles_data)
    })

@users_bp.route('/roles', methods=['POST'])
@check_permission('user_admin')
def create_role():
    """Create a new role"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'message': 'Role name is required'}), 400
    
    # Check for duplicate role name
    if Role.query.filter_by(name=data['name']).first():
        return jsonify({'message': 'Role name already exists'}), 400
    
    # Validate permissions
    permissions = data.get('permissions', [])
    if not isinstance(permissions, list):
        return jsonify({'message': 'Permissions must be a list'}), 400
    
    try:
        role = Role(
            name=data['name'],
            description=data.get('description', ''),
            permissions=json.dumps(permissions)
        )
        
        db.session.add(role)
        db.session.commit()
        
        log_audit_trail('roles', role.id, 'INSERT', new_values={
            'name': role.name,
            'permissions_count': len(permissions)
        })
        
        return jsonify({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'permissions': permissions,
            'message': 'Role created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create role',
            'error': str(e)
        }), 500

@users_bp.route('/roles/<int:role_id>', methods=['PUT'])
@check_permission('user_admin')
def update_role(role_id):
    """Update role information"""
    role = Role.query.get_or_404(role_id)
    
    # Prevent modification of default Administrator role
    if role.name == 'Administrator':
        return jsonify({'message': 'Cannot modify the default Administrator role'}), 400
    
    old_values = {
        'name': role.name,
        'description': role.description,
        'permissions': role.permissions
    }
    
    data = request.get_json()
    
    # Update fields
    if 'name' in data:
        # Check for duplicate name
        existing_role = Role.query.filter(
            Role.name == data['name'],
            Role.id != role_id
        ).first()
        if existing_role:
            return jsonify({'message': 'Role name already exists'}), 400
        role.name = data['name']
    
    if 'description' in data:
        role.description = data['description']
    
    if 'permissions' in data:
        permissions = data['permissions']
        if not isinstance(permissions, list):
            return jsonify({'message': 'Permissions must be a list'}), 400
        role.permissions = json.dumps(permissions)
    
    try:
        db.session.commit()
        
        new_values = {
            'name': role.name,
            'description': role.description,
            'permissions': role.permissions
        }
        
        log_audit_trail('roles', role.id, 'UPDATE', 
                       old_values=old_values, new_values=new_values)
        
        return jsonify({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'permissions': json.loads(role.permissions or '[]'),
            'message': 'Role updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update role',
            'error': str(e)
        }), 500

@users_bp.route('/analytics', methods=['GET'])
@check_permission('user_read')
def get_user_analytics():
    """Get user management analytics"""
    
    # Overall statistics
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    inactive_users = total_users - active_users
    
    # Users by role
    users_by_role = db.session.query(
        Role.name,
        func.count(User.id).label('user_count')
    ).join(User).group_by(Role.name).all()
    
    # Recent registrations (last 30 days)
    recent_registrations = User.query.filter(
        User.created_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    
    # Login activity (last 30 days)
    active_users_30d = db.session.query(func.count(func.distinct(AuditLog.user_id))).filter(
        and_(
            AuditLog.action == 'LOGIN_SUCCESS',
            AuditLog.timestamp >= datetime.utcnow() - timedelta(days=30)
        )
    ).scalar() or 0
    
    return jsonify({
        'overview': {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'activity_rate': (active_users_30d / total_users * 100) if total_users > 0 else 0
        },
        'users_by_role': [
            {'role_name': role.name, 'user_count': role.user_count}
            for role in users_by_role
        ],
        'recent_activity': {
            'registrations_30d': recent_registrations,
            'active_users_30d': active_users_30d
        },
        'generated_at': datetime.utcnow().isoformat()
    })