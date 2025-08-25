# backend/api/organization.py - Organization Settings Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from datetime import datetime, date, timedelta
from decimal import Decimal
from models import db, OrganizationSettings, Currency
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail
import os
from werkzeug.utils import secure_filename

organization_bp = Blueprint('organization', __name__)
validator = RequestValidator()

# Allowed file extensions for logo upload
ALLOWED_LOGO_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB

def allowed_logo_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_LOGO_EXTENSIONS

@organization_bp.route('/settings', methods=['GET'])
@check_permission('organization_read')
def get_organization_settings():
    """Get organization settings and configuration"""
    settings = OrganizationSettings.query.first()
    
    if not settings:
        return jsonify({'message': 'Organization settings not found'}), 404
    
    # Get base currency information
    base_currency = Currency.query.get(settings.base_currency_id) if settings.base_currency_id else None
    
    # Get available currencies
    available_currencies = Currency.query.filter_by(is_active=True).order_by(Currency.code).all()
    currencies_data = []
    for currency in available_currencies:
        currencies_data.append({
            'id': currency.id,
            'code': currency.code,
            'name': currency.name,
            'symbol': currency.symbol,
            'is_base_currency': currency.is_base_currency
        })
    
    settings_data = {
        'organization_info': {
            'id': settings.id,
            'organization_name': settings.organization_name,
            'organization_name_ar': settings.organization_name_ar,
            'logo_url': settings.logo_url,
            'address': settings.address,
            'phone': settings.phone,
            'email': settings.email,
            'website': settings.website,
            'tax_number': settings.tax_number
        },
        'financial_settings': {
            'base_currency': {
                'id': base_currency.id,
                'code': base_currency.code,
                'name': base_currency.name,
                'symbol': base_currency.symbol
            } if base_currency else None,
            'fiscal_year_start': settings.fiscal_year_start.isoformat() if settings.fiscal_year_start else None,
            'fiscal_year_end': settings.fiscal_year_end.isoformat() if settings.fiscal_year_end else None
        },
        'system_settings': {
            'default_language': settings.default_language,
            'date_format': settings.date_format,
            'time_zone': settings.time_zone
        },
        'metadata': {
            'created_at': settings.created_at.isoformat(),
            'updated_at': settings.updated_at.isoformat()
        },
        'available_options': {
            'currencies': currencies_data,
            'languages': [
                {'code': 'en', 'name': 'English'},
                {'code': 'ar', 'name': 'العربية'}
            ],
            'date_formats': [
                {'code': 'DD/MM/YYYY', 'name': 'DD/MM/YYYY (31/12/2024)'},
                {'code': 'MM/DD/YYYY', 'name': 'MM/DD/YYYY (12/31/2024)'},
                {'code': 'YYYY-MM-DD', 'name': 'YYYY-MM-DD (2024-12-31)'}
            ],
            'time_zones': [
                {'code': 'UTC', 'name': 'UTC'},
                {'code': 'Asia/Dubai', 'name': 'Asia/Dubai (UAE)'},
                {'code': 'Asia/Riyadh', 'name': 'Asia/Riyadh (Saudi Arabia)'},
                {'code': 'Africa/Cairo', 'name': 'Africa/Cairo (Egypt)'},
                {'code': 'Asia/Amman', 'name': 'Asia/Amman (Jordan)'}
            ]
        }
    }
    
    return jsonify(settings_data)

@organization_bp.route('/settings', methods=['PUT'])
@check_permission('organization_update')
def update_organization_settings():
    """Update organization settings"""
    settings = OrganizationSettings.query.first()
    
    if not settings:
        return jsonify({'message': 'Organization settings not found'}), 404
    
    old_values = {
        'organization_name': settings.organization_name,
        'organization_name_ar': settings.organization_name_ar,
        'address': settings.address,
        'phone': settings.phone,
        'email': settings.email,
        'website': settings.website,
        'base_currency_id': settings.base_currency_id,
        'default_language': settings.default_language,
        'date_format': settings.date_format,
        'time_zone': settings.time_zone
    }
    
    data = request.get_json()
    
    # Update organization information
    if 'organization_name' in data:
        if not data['organization_name'] or len(data['organization_name'].strip()) == 0:
            return jsonify({'message': 'Organization name cannot be empty'}), 400
        settings.organization_name = data['organization_name'].strip()
    
    if 'organization_name_ar' in data:
        settings.organization_name_ar = data['organization_name_ar'].strip() if data['organization_name_ar'] else None
    
    if 'address' in data:
        settings.address = data['address'].strip() if data['address'] else None
    
    if 'phone' in data:
        phone = data['phone'].strip() if data['phone'] else None
        if phone and len(phone) > 20:
            return jsonify({'message': 'Phone number must be less than 20 characters'}), 400
        settings.phone = phone
    
    if 'email' in data:
        email = data['email'].strip() if data['email'] else None
        if email:
            # Basic email validation
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, email):
                return jsonify({'message': 'Invalid email format'}), 400
        settings.email = email
    
    if 'website' in data:
        website = data['website'].strip() if data['website'] else None
        if website and not website.startswith(('http://', 'https://')):
            website = 'https://' + website
        settings.website = website
    
    if 'tax_number' in data:
        settings.tax_number = data['tax_number'].strip() if data['tax_number'] else None
    
    # Update financial settings
    if 'base_currency_id' in data:
        currency = Currency.query.get(data['base_currency_id'])
        if not currency or not currency.is_active:
            return jsonify({'message': 'Invalid base currency'}), 400
        
        # Update the old base currency flag
        old_base_currency = Currency.query.filter_by(is_base_currency=True).first()
        if old_base_currency and old_base_currency.id != currency.id:
            old_base_currency.is_base_currency = False
        
        currency.is_base_currency = True
        settings.base_currency_id = currency.id
    
    if 'fiscal_year_start' in data:
        if data['fiscal_year_start']:
            try:
                fiscal_start = datetime.strptime(data['fiscal_year_start'], '%Y-%m-%d').date()
                settings.fiscal_year_start = fiscal_start
            except ValueError:
                return jsonify({'message': 'Invalid fiscal year start date format. Use YYYY-MM-DD'}), 400
    
    if 'fiscal_year_end' in data:
        if data['fiscal_year_end']:
            try:
                fiscal_end = datetime.strptime(data['fiscal_year_end'], '%Y-%m-%d').date()
                # Validate that fiscal year end is after fiscal year start
                if settings.fiscal_year_start and fiscal_end <= settings.fiscal_year_start:
                    return jsonify({'message': 'Fiscal year end must be after fiscal year start'}), 400
                settings.fiscal_year_end = fiscal_end
            except ValueError:
                return jsonify({'message': 'Invalid fiscal year end date format. Use YYYY-MM-DD'}), 400
    
    # Update system settings
    if 'default_language' in data:
        if data['default_language'] not in ['en', 'ar']:
            return jsonify({'message': 'Invalid default language. Must be "en" or "ar"'}), 400
        settings.default_language = data['default_language']
    
    if 'date_format' in data:
        valid_formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
        if data['date_format'] not in valid_formats:
            return jsonify({
                'message': 'Invalid date format',
                'valid_formats': valid_formats
            }), 400
        settings.date_format = data['date_format']
    
    if 'time_zone' in data:
        # Basic timezone validation - in production, use pytz for comprehensive validation
        valid_timezones = ['UTC', 'Asia/Dubai', 'Asia/Riyadh', 'Africa/Cairo', 'Asia/Amman']
        if data['time_zone'] not in valid_timezones:
            return jsonify({
                'message': 'Invalid time zone',
                'valid_timezones': valid_timezones
            }), 400
        settings.time_zone = data['time_zone']
    
    try:
        settings.updated_at = datetime.utcnow()
        db.session.commit()
        
        new_values = {
            'organization_name': settings.organization_name,
            'organization_name_ar': settings.organization_name_ar,
            'address': settings.address,
            'phone': settings.phone,
            'email': settings.email,
            'website': settings.website,
            'base_currency_id': settings.base_currency_id,
            'default_language': settings.default_language,
            'date_format': settings.date_format,
            'time_zone': settings.time_zone
        }
        
        log_audit_trail('organization_settings', settings.id, 'UPDATE', 
                       old_values=old_values, new_values=new_values)
        
        return jsonify({
            'message': 'Organization settings updated successfully',
            'updated_at': settings.updated_at.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update organization settings',
            'error': str(e)
        }), 500

@organization_bp.route('/settings/logo', methods=['POST'])
@check_permission('organization_update')
def upload_organization_logo():
    """Upload organization logo"""
    if 'logo' not in request.files:
        return jsonify({'message': 'No logo file provided'}), 400
    
    file = request.files['logo']
    
    if file.filename == '':
        return jsonify({'message': 'No logo file selected'}), 400
    
    if not allowed_logo_file(file.filename):
        return jsonify({
            'message': 'Invalid file type',
            'allowed_types': list(ALLOWED_LOGO_EXTENSIONS)
        }), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_LOGO_SIZE:
        return jsonify({
            'message': 'File too large',
            'max_size_mb': MAX_LOGO_SIZE / (1024 * 1024)
        }), 400
    
    settings = OrganizationSettings.query.first()
    if not settings:
        return jsonify({'message': 'Organization settings not found'}), 404
    
    try:
        # Create uploads directory if it doesn't exist
        upload_folder = os.path.join(os.getcwd(), 'uploads', 'logos')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Generate secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"logo_{timestamp}_{filename}"
        file_path = os.path.join(upload_folder, filename)
        
        # Save file
        file.save(file_path)
        
        # Update settings with logo URL
        old_logo_url = settings.logo_url
        settings.logo_url = f"/uploads/logos/{filename}"
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_audit_trail('organization_settings', settings.id, 'LOGO_UPDATED', 
                       old_values={'logo_url': old_logo_url}, 
                       new_values={'logo_url': settings.logo_url})
        
        # Delete old logo file if it exists
        if old_logo_url:
            old_file_path = os.path.join(os.getcwd(), old_logo_url.lstrip('/'))
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except:
                    pass  # Ignore file deletion errors
        
        return jsonify({
            'message': 'Logo uploaded successfully',
            'logo_url': settings.logo_url,
            'file_size': file_size,
            'uploaded_at': settings.updated_at.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to upload logo',
            'error': str(e)
        }), 500

@organization_bp.route('/settings/logo', methods=['DELETE'])
@check_permission('organization_update')
def delete_organization_logo():
    """Delete organization logo"""
    settings = OrganizationSettings.query.first()
    if not settings:
        return jsonify({'message': 'Organization settings not found'}), 404
    
    if not settings.logo_url:
        return jsonify({'message': 'No logo to delete'}), 404
    
    try:
        old_logo_url = settings.logo_url
        
        # Delete file from filesystem
        file_path = os.path.join(os.getcwd(), old_logo_url.lstrip('/'))
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Update settings
        settings.logo_url = None
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_audit_trail('organization_settings', settings.id, 'LOGO_DELETED', 
                       old_values={'logo_url': old_logo_url})
        
        return jsonify({
            'message': 'Logo deleted successfully',
            'deleted_at': settings.updated_at.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to delete logo',
            'error': str(e)
        }), 500

@organization_bp.route('/fiscal-year', methods=['GET'])
@check_permission('organization_read')
def get_fiscal_year_info():
    """Get current fiscal year information and periods"""
    settings = OrganizationSettings.query.first()
    
    if not settings or not settings.fiscal_year_start or not settings.fiscal_year_end:
        return jsonify({
            'message': 'Fiscal year not configured',
            'current_date': date.today().isoformat()
        })
    
    current_date = date.today()
    fiscal_start = settings.fiscal_year_start
    fiscal_end = settings.fiscal_year_end
    
    # Determine current fiscal year
    if current_date >= fiscal_start.replace(year=current_date.year):
        current_fiscal_start = fiscal_start.replace(year=current_date.year)
        current_fiscal_end = fiscal_end.replace(year=current_date.year)
        if current_fiscal_end <= current_fiscal_start:
            current_fiscal_end = fiscal_end.replace(year=current_date.year + 1)
    else:
        current_fiscal_start = fiscal_start.replace(year=current_date.year - 1)
        current_fiscal_end = fiscal_end.replace(year=current_date.year)
    
    # Calculate fiscal periods (quarters and months)
    fiscal_year_days = (current_fiscal_end - current_fiscal_start).days
    days_elapsed = (current_date - current_fiscal_start).days if current_date >= current_fiscal_start else 0
    days_remaining = (current_fiscal_end - current_date).days if current_date <= current_fiscal_end else 0
    
    # Generate quarterly periods
    quarters = []
    for i in range(4):
        quarter_start = current_fiscal_start + timedelta(days=int(fiscal_year_days * i / 4))
        quarter_end = current_fiscal_start + timedelta(days=int(fiscal_year_days * (i + 1) / 4)) - timedelta(days=1)
        
        quarters.append({
            'quarter': i + 1,
            'start_date': quarter_start.isoformat(),
            'end_date': quarter_end.isoformat(),
            'is_current': quarter_start <= current_date <= quarter_end,
            'days': (quarter_end - quarter_start + timedelta(days=1)).days
        })
    
    # Generate monthly periods (simplified to 12 equal periods)
    months = []
    for i in range(12):
        month_start = current_fiscal_start + timedelta(days=int(fiscal_year_days * i / 12))
        month_end = current_fiscal_start + timedelta(days=int(fiscal_year_days * (i + 1) / 12)) - timedelta(days=1)
        
        months.append({
            'period': i + 1,
            'start_date': month_start.isoformat(),
            'end_date': month_end.isoformat(),
            'is_current': month_start <= current_date <= month_end,
            'days': (month_end - month_start + timedelta(days=1)).days
        })
    
    return jsonify({
        'fiscal_year': {
            'start_date': current_fiscal_start.isoformat(),
            'end_date': current_fiscal_end.isoformat(),
            'total_days': fiscal_year_days,
            'days_elapsed': max(0, days_elapsed),
            'days_remaining': max(0, days_remaining),
            'percentage_complete': (days_elapsed / fiscal_year_days * 100) if fiscal_year_days > 0 and days_elapsed >= 0 else 0
        },
        'current_period': {
            'date': current_date.isoformat(),
            'is_within_fiscal_year': current_fiscal_start <= current_date <= current_fiscal_end,
            'current_quarter': next((q['quarter'] for q in quarters if q['is_current']), None),
            'current_month': next((m['period'] for m in months if m['is_current']), None)
        },
        'periods': {
            'quarters': quarters,
            'months': months
        }
    })

@organization_bp.route('/backup-settings', methods=['GET'])
@check_permission('system_admin')
def get_backup_settings():
    """Get backup and system settings"""
    # These would typically be stored in environment variables or config files
    backup_settings = {
        'automatic_backup': {
            'enabled': os.environ.get('AUTO_BACKUP_ENABLED', 'true').lower() == 'true',
            'frequency': os.environ.get('BACKUP_FREQUENCY', 'daily'),
            'retention_days': int(os.environ.get('BACKUP_RETENTION_DAYS', 30)),
            'backup_location': os.environ.get('BACKUP_FOLDER', './backups')
        },
        'email_notifications': {
            'enabled': os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'true').lower() == 'true',
            'smtp_configured': bool(os.environ.get('MAIL_SERVER')),
            'admin_email': os.environ.get('ADMIN_EMAIL', '')
        },
        'security_settings': {
            'password_policy': {
                'min_length': 8,
                'require_uppercase': True,
                'require_lowercase': True,
                'require_numbers': True,
                'require_special_chars': True
            },
            'session_timeout': int(os.environ.get('SESSION_TIMEOUT_HOURS', 8)),
            'max_login_attempts': int(os.environ.get('MAX_LOGIN_ATTEMPTS', 5)),
            'lockout_duration': int(os.environ.get('LOCKOUT_DURATION_MINUTES', 30))
        },
        'audit_settings': {
            'audit_retention_days': int(os.environ.get('AUDIT_RETENTION_DAYS', 2555)),  # 7 years
            'log_all_actions': True,
            'include_ip_addresses': True
        }
    }
    
    # Check backup status
    backup_folder = backup_settings['automatic_backup']['backup_location']
    backup_status = {
        'last_backup': None,
        'backup_count': 0,
        'total_backup_size': 0
    }
    
    if os.path.exists(backup_folder):
        backup_files = [f for f in os.listdir(backup_folder) if f.endswith(('.sql', '.db', '.backup'))]
        backup_status['backup_count'] = len(backup_files)
        
        if backup_files:
            # Get most recent backup
            backup_files.sort()
            latest_backup = backup_files[-1]
            backup_path = os.path.join(backup_folder, latest_backup)
            
            if os.path.exists(backup_path):
                backup_status['last_backup'] = {
                    'filename': latest_backup,
                    'created_at': datetime.fromtimestamp(os.path.getmtime(backup_path)).isoformat(),
                    'size_bytes': os.path.getsize(backup_path)
                }
            
            # Calculate total size
            total_size = sum(
                os.path.getsize(os.path.join(backup_folder, f))
                for f in backup_files
                if os.path.exists(os.path.join(backup_folder, f))
            )
            backup_status['total_backup_size'] = total_size
    
    return jsonify({
        'backup_settings': backup_settings,
        'backup_status': backup_status,
        'system_info': {
            'database_url': bool(os.environ.get('DATABASE_URL')),
            'redis_configured': bool(os.environ.get('REDIS_URL')),
            'environment': os.environ.get('FLASK_ENV', 'production')
        }
    })

@organization_bp.route('/system-health', methods=['GET'])
@check_permission('system_admin')
def get_system_health():
    """Get system health status"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        database_status = 'healthy'
        database_error = None
    except Exception as e:
        database_status = 'unhealthy'
        database_error = str(e)
    
    # Check disk space
    import shutil
    disk_usage = shutil.disk_usage('.')
    disk_free_gb = disk_usage.free / (1024**3)
    disk_total_gb = disk_usage.total / (1024**3)
    disk_used_percent = ((disk_usage.total - disk_usage.free) / disk_usage.total) * 100
    
    # Get basic system stats
    health_status = {
        'database': {
            'status': database_status,
            'error': database_error,
            'total_tables': len(db.metadata.tables) if database_status == 'healthy' else 0
        },
        'storage': {
            'disk_free_gb': round(disk_free_gb, 2),
            'disk_total_gb': round(disk_total_gb, 2),
            'disk_used_percent': round(disk_used_percent, 2),
            'status': 'healthy' if disk_used_percent < 85 else 'warning' if disk_used_percent < 95 else 'critical'
        },
        'application': {
            'status': 'healthy',
            'version': '1.0.0',  # This would come from your app configuration
            'uptime_check': datetime.utcnow().isoformat()
        }
    }
    
    # Overall health determination
    overall_status = 'healthy'
    if database_status != 'healthy':
        overall_status = 'unhealthy'
    elif health_status['storage']['status'] in ['warning', 'critical']:
        overall_status = 'warning'
    
    return jsonify({
        'overall_status': overall_status,
        'health_checks': health_status,
        'checked_at': datetime.utcnow().isoformat()
    })