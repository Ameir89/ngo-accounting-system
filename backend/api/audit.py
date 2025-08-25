# backend/api/audit.py - Audit Trail Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func, and_, desc
from datetime import datetime, date, timedelta
from models import db, AuditLog, User
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
import json

audit_bp = Blueprint('audit', __name__)
validator = RequestValidator()

@audit_bp.route('/logs', methods=['GET'])
@check_permission('audit_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    user_id={'type': int, 'min': 1},
    action={'type': str},
    table_name={'type': str},
    start_date={'type': str},
    end_date={'type': str},
    ip_address={'type': str}
)
def get_audit_logs():
    """Get comprehensive audit trail with advanced filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    table_name = request.args.get('table_name')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    ip_address = request.args.get('ip_address')
    
    # Build optimized query with joins
    query = AuditLog.query.join(User, AuditLog.user_id == User.id, isouter=True)
    
    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action.ilike(f'%{action}%'))
    
    if table_name:
        query = query.filter(AuditLog.table_name.ilike(f'%{table_name}%'))
    
    if ip_address:
        query = query.filter(AuditLog.ip_address.ilike(f'%{ip_address}%'))
    
    # Date filtering
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(AuditLog.timestamp >= start_date)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)  # Include the entire end day
            query = query.filter(AuditLog.timestamp < end_date)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Execute query with pagination
    audit_logs = query.order_by(desc(AuditLog.timestamp)).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    logs_data = []
    for log in audit_logs.items:
        # Parse JSON values safely
        old_values = None
        new_values = None
        
        try:
            if log.old_values:
                old_values = json.loads(log.old_values)
        except (json.JSONDecodeError, TypeError):
            old_values = log.old_values
        
        try:
            if log.new_values:
                new_values = json.loads(log.new_values)
        except (json.JSONDecodeError, TypeError):
            new_values = log.new_values
        
        # Determine action category
        action_category = 'other'
        if log.action in ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT']:
            action_category = 'authentication'
        elif log.action in ['INSERT', 'UPDATE', 'DELETE']:
            action_category = 'data_modification'
        elif log.action.endswith('_FAILED'):
            action_category = 'security'
        elif 'PASSWORD' in log.action:
            action_category = 'security'
        
        # Determine risk level
        risk_level = 'low'
        if log.action in ['DELETE', 'PASSWORD_RESET', 'ROLE_CHANGED'] or 'ADMIN' in log.action:
            risk_level = 'high'
        elif log.action in ['UPDATE', 'PASSWORD_CHANGED'] or 'FAILED' in log.action:
            risk_level = 'medium'
        
        logs_data.append({
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'user': {
                'id': log.user.id if log.user else None,
                'username': log.user.username if log.user else 'System',
                'full_name': f"{log.user.first_name} {log.user.last_name}" if log.user else 'System User'
            },
            'action_info': {
                'action': log.action,
                'category': action_category,
                'risk_level': risk_level
            },
            'target': {
                'table_name': log.table_name,
                'record_id': log.record_id
            },
            'changes': {
                'old_values': old_values,
                'new_values': new_values
            },
            'session_info': {
                'ip_address': log.ip_address,
                'user_agent': log.user_agent[:100] if log.user_agent else None  # Truncate for display
            }
        })
    
    return jsonify({
        'audit_logs': logs_data,
        'pagination': {
            'total': audit_logs.total,
            'pages': audit_logs.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': audit_logs.has_next,
            'has_prev': audit_logs.has_prev
        },
        'filters_applied': {
            'user_id': user_id,
            'action': action,
            'table_name': table_name,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'ip_address': ip_address
        }
    })

@audit_bp.route('/logs/<int:log_id>', methods=['GET'])
@check_permission('audit_read')
def get_audit_log_detail(log_id):
    """Get detailed information about a specific audit log entry"""
    audit_log = AuditLog.query.get_or_404(log_id)
    
    # Parse JSON values
    old_values = None
    new_values = None
    
    try:
        if audit_log.old_values:
            old_values = json.loads(audit_log.old_values)
    except (json.JSONDecodeError, TypeError):
        old_values = audit_log.old_values
    
    try:
        if audit_log.new_values:
            new_values = json.loads(audit_log.new_values)
    except (json.JSONDecodeError, TypeError):
        new_values = audit_log.new_values
    
    # Get related audit entries (same user, similar timeframe)
    related_entries = AuditLog.query.filter(
        and_(
            AuditLog.user_id == audit_log.user_id,
            AuditLog.timestamp.between(
                audit_log.timestamp - timedelta(minutes=10),
                audit_log.timestamp + timedelta(minutes=10)
            ),
            AuditLog.id != audit_log.id
        )
    ).order_by(AuditLog.timestamp).limit(5).all()
    
    related_data = []
    for entry in related_entries:
        related_data.append({
            'id': entry.id,
            'timestamp': entry.timestamp.isoformat(),
            'action': entry.action,
            'table_name': entry.table_name,
            'record_id': entry.record_id
        })
    
    # Analyze the changes if it's an UPDATE action
    change_analysis = None
    if audit_log.action == 'UPDATE' and old_values and new_values:
        changes = {}
        if isinstance(old_values, dict) and isinstance(new_values, dict):
            for key in set(old_values.keys()) | set(new_values.keys()):
                old_val = old_values.get(key)
                new_val = new_values.get(key)
                
                if old_val != new_val:
                    changes[key] = {
                        'old': old_val,
                        'new': new_val,
                        'change_type': 'modified' if key in old_values and key in new_values else 
                                     'added' if key not in old_values else 'removed'
                    }
        
        change_analysis = {
            'fields_changed': len(changes),
            'changes': changes
        }
    
    return jsonify({
        'audit_log': {
            'id': audit_log.id,
            'timestamp': audit_log.timestamp.isoformat(),
            'user': {
                'id': audit_log.user.id if audit_log.user else None,
                'username': audit_log.user.username if audit_log.user else 'System',
                'full_name': f"{audit_log.user.first_name} {audit_log.user.last_name}" if audit_log.user else 'System User',
                'role_name': audit_log.user.role.name if audit_log.user and audit_log.user.role else None
            },
            'action': audit_log.action,
            'table_name': audit_log.table_name,
            'record_id': audit_log.record_id,
            'old_values': old_values,
            'new_values': new_values,
            'ip_address': audit_log.ip_address,
            'user_agent': audit_log.user_agent
        },
        'change_analysis': change_analysis,
        'related_entries': related_data
    })

@audit_bp.route('/analytics', methods=['GET'])
@check_permission('audit_read')
@validator.validate_query_params(
    days={'type': int, 'min': 1, 'max': 365}
)
def get_audit_analytics():
    """Get comprehensive audit trail analytics"""
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Overall activity statistics
    total_actions = AuditLog.query.filter(AuditLog.timestamp >= start_date).count()
    unique_users = db.session.query(func.count(func.distinct(AuditLog.user_id))).filter(
        AuditLog.timestamp >= start_date
    ).scalar() or 0
    
    # Actions by type
    actions_by_type = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.action).order_by(desc(func.count(AuditLog.id))).limit(10).all()
    
    # Activity by table
    activity_by_table = db.session.query(
        AuditLog.table_name,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.table_name).order_by(desc(func.count(AuditLog.id))).limit(10).all()
    
    # Top users by activity
    top_users = db.session.query(
        AuditLog.user_id,
        User.username,
        func.concat(User.first_name, ' ', User.last_name).label('full_name'),
        func.count(AuditLog.id).label('activity_count')
    ).join(User, AuditLog.user_id == User.id, isouter=True).filter(
        AuditLog.timestamp >= start_date
    ).group_by(
        AuditLog.user_id, User.username, User.first_name, User.last_name
    ).order_by(desc(func.count(AuditLog.id))).limit(10).all()
    
    # Daily activity trend
    daily_activity = db.session.query(
        func.date(AuditLog.timestamp).label('date'),
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(func.date(AuditLog.timestamp)).order_by(func.date(AuditLog.timestamp)).all()
    
    # Security events
    security_events = AuditLog.query.filter(
        and_(
            AuditLog.timestamp >= start_date,
            or_(
                AuditLog.action.like('%FAILED%'),
                AuditLog.action.like('%PASSWORD%'),
                AuditLog.action.like('%DELETE%'),
                AuditLog.action == 'ROLE_CHANGED'
            )
        )
    ).count()
    
    # Failed login attempts by IP
    failed_logins_by_ip = db.session.query(
        AuditLog.ip_address,
        func.count(AuditLog.id).label('attempts')
    ).filter(
        and_(
            AuditLog.timestamp >= start_date,
            AuditLog.action == 'LOGIN_FAILED'
        )
    ).group_by(AuditLog.ip_address).order_by(desc(func.count(AuditLog.id))).limit(10).all()
    
    return jsonify({
        'period_info': {
            'days': days,
            'start_date': start_date.isoformat(),
            'end_date': datetime.utcnow().isoformat()
        },
        'overview': {
            'total_actions': total_actions,
            'unique_users': unique_users,
            'security_events': security_events,
            'average_daily_activity': round(total_actions / days, 2) if days > 0 else 0
        },
        'activity_breakdown': {
            'actions_by_type': [
                {'action': action.action, 'count': action.count}
                for action in actions_by_type
            ],
            'activity_by_table': [
                {'table_name': table.table_name, 'count': table.count}
                for table in activity_by_table
            ],
            'top_users': [
                {
                    'user_id': user.user_id,
                    'username': user.username or 'Unknown',
                    'full_name': user.full_name or 'Unknown User',
                    'activity_count': user.activity_count
                }
                for user in top_users
            ]
        },
        'trends': {
            'daily_activity': [
                {
                    'date': day.date.isoformat(),
                    'count': day.count
                }
                for day in daily_activity
            ]
        },
        'security_analysis': {
            'total_security_events': security_events,
            'failed_logins_by_ip': [
                {
                    'ip_address': login.ip_address,
                    'failed_attempts': login.attempts
                }
                for login in failed_logins_by_ip
            ]
        },
        'generated_at': datetime.utcnow().isoformat()
    })

@audit_bp.route('/user-activity/<int:user_id>', methods=['GET'])
@check_permission('audit_read')
@validator.validate_query_params(
    days={'type': int, 'min': 1, 'max': 365},
    summary_only={'type': bool}
)
def get_user_activity_summary(user_id):
    """Get detailed activity summary for a specific user"""
    user = User.query.get_or_404(user_id)
    days = request.args.get('days', 30, type=int)
    summary_only = request.args.get('summary_only', False)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Basic activity statistics
    total_actions = AuditLog.query.filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date
        )
    ).count()
    
    # Login statistics
    login_stats = {
        'successful_logins': AuditLog.query.filter(
            and_(
                AuditLog.user_id == user_id,
                AuditLog.action == 'LOGIN_SUCCESS',
                AuditLog.timestamp >= start_date
            )
        ).count(),
        'failed_logins': AuditLog.query.filter(
            and_(
                AuditLog.user_id == user_id,
                AuditLog.action == 'LOGIN_FAILED',
                AuditLog.timestamp >= start_date
            )
        ).count()
    }
    
    # Actions by type
    actions_by_type = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date
        )
    ).group_by(AuditLog.action).order_by(desc(func.count(AuditLog.id))).all()
    
    # Tables accessed
    tables_accessed = db.session.query(
        AuditLog.table_name,
        func.count(AuditLog.id).label('access_count'),
        func.max(AuditLog.timestamp).label('last_access')
    ).filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date
        )
    ).group_by(AuditLog.table_name).order_by(desc(func.count(AuditLog.id))).all()
    
    # Daily activity pattern
    daily_activity = db.session.query(
        func.date(AuditLog.timestamp).label('date'),
        func.count(AuditLog.id).label('count')
    ).filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date
        )
    ).group_by(func.date(AuditLog.timestamp)).order_by(func.date(AuditLog.timestamp)).all()
    
    # Recent security-related actions
    security_actions = AuditLog.query.filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_date,
            or_(
                AuditLog.action.like('%PASSWORD%'),
                AuditLog.action.like('%ROLE%'),
                AuditLog.action.like('%PERMISSION%')
            )
        )
    ).order_by(desc(AuditLog.timestamp)).limit(10).all()
    
    summary_data = {
        'user_info': {
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}",
            'role_name': user.role.name if user.role else None
        },
        'period_info': {
            'days': days,
            'start_date': start_date.isoformat(),
            'end_date': datetime.utcnow().isoformat()
        },
        'activity_summary': {
            'total_actions': total_actions,
            'daily_average': round(total_actions / days, 2) if days > 0 else 0,
            'login_statistics': login_stats,
            'most_active_day': max(daily_activity, key=lambda x: x.count).date.isoformat() if daily_activity else None
        },
        'activity_breakdown': {
            'actions_by_type': [
                {'action': action.action, 'count': action.count}
                for action in actions_by_type
            ],
            'tables_accessed': [
                {
                    'table_name': table.table_name,
                    'access_count': table.access_count,
                    'last_access': table.last_access.isoformat()
                }
                for table in tables_accessed
            ]
        },
        'security_events': [
            {
                'id': event.id,
                'action': event.action,
                'timestamp': event.timestamp.isoformat(),
                'table_name': event.table_name
            }
            for event in security_actions
        ]
    }
    
    if not summary_only:
        summary_data['daily_activity'] = [
            {
                'date': day.date.isoformat(),
                'count': day.count
            }
            for day in daily_activity
        ]
    
    return jsonify(summary_data)

@audit_bp.route('/security-alerts', methods=['GET'])
@check_permission('audit_read')
def get_security_alerts():
    """Get security alerts based on audit trail analysis"""
    # Define time periods for analysis
    last_hour = datetime.utcnow() - timedelta(hours=1)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    last_week = datetime.utcnow() - timedelta(days=7)
    
    alerts = []
    
    # Multiple failed login attempts from same IP
    failed_login_ips = db.session.query(
        AuditLog.ip_address,
        func.count(AuditLog.id).label('attempts')
    ).filter(
        and_(
            AuditLog.action == 'LOGIN_FAILED',
            AuditLog.timestamp >= last_hour
        )
    ).group_by(AuditLog.ip_address).having(func.count(AuditLog.id) >= 5).all()
    
    for ip_alert in failed_login_ips:
        alerts.append({
            'type': 'brute_force_attempt',
            'severity': 'high',
            'title': 'Multiple Failed Login Attempts',
            'description': f"IP {ip_alert.ip_address} has {ip_alert.attempts} failed login attempts in the last hour",
            'details': {
                'ip_address': ip_alert.ip_address,
                'attempt_count': ip_alert.attempts,
                'timeframe': 'last_hour'
            }
        })
    
    # Unusual admin activity
    admin_actions_24h = AuditLog.query.join(User).filter(
        and_(
            AuditLog.timestamp >= last_24h,
            AuditLog.action.in_(['DELETE', 'ROLE_CHANGED', 'USER_CREATED', 'USER_DELETED']),
            User.role.has(name='Administrator')
        )
    ).count()
    
    if admin_actions_24h > 10:  # Threshold for unusual admin activity
        alerts.append({
            'type': 'unusual_admin_activity',
            'severity': 'medium',
            'title': 'High Administrative Activity',
            'description': f"Unusually high number of administrative actions ({admin_actions_24h}) in the last 24 hours",
            'details': {
                'action_count': admin_actions_24h,
                'timeframe': 'last_24_hours'
            }
        })
    
    # Password changes by multiple users
    password_changes = db.session.query(
        func.count(func.distinct(AuditLog.user_id))
    ).filter(
        and_(
            AuditLog.action.like('%PASSWORD%'),
            AuditLog.timestamp >= last_24h
        )
    ).scalar() or 0
    
    if password_changes > 5:  # Multiple users changing passwords might indicate security concern
        alerts.append({
            'type': 'multiple_password_changes',
            'severity': 'medium',
            'title': 'Multiple Password Changes',
            'description': f"{password_changes} users changed their passwords in the last 24 hours",
            'details': {
                'user_count': password_changes,
                'timeframe': 'last_24_hours'
            }
        })
    
    # Unusual deletion activity
    deletions_today = AuditLog.query.filter(
        and_(
            AuditLog.action == 'DELETE',
            AuditLog.timestamp >= last_24h
        )
    ).count()
    
    if deletions_today > 20:  # High number of deletions
        alerts.append({
            'type': 'high_deletion_activity',
            'severity': 'high',
            'title': 'High Deletion Activity',
            'description': f"{deletions_today} records deleted in the last 24 hours",
            'details': {
                'deletion_count': deletions_today,
                'timeframe': 'last_24_hours'
            }
        })
    
    # Users active outside business hours (assuming 9-17 UTC)
    after_hours_activity = db.session.query(
        func.count(func.distinct(AuditLog.user_id))
    ).filter(
        and_(
            AuditLog.timestamp >= last_week,
            or_(
                func.extract('hour', AuditLog.timestamp) < 9,
                func.extract('hour', AuditLog.timestamp) > 17
            )
        )
    ).scalar() or 0
    
    if after_hours_activity > 3:
        alerts.append({
            'type': 'after_hours_activity',
            'severity': 'low',
            'title': 'After Hours Activity',
            'description': f"{after_hours_activity} users active outside business hours this week",
            'details': {
                'user_count': after_hours_activity,
                'timeframe': 'last_week'
            }
        })
    
    return jsonify({
        'security_alerts': alerts,
        'alert_count': len(alerts),
        'severity_breakdown': {
            'high': len([a for a in alerts if a['severity'] == 'high']),
            'medium': len([a for a in alerts if a['severity'] == 'medium']),
            'low': len([a for a in alerts if a['severity'] == 'low'])
        },
        'generated_at': datetime.utcnow().isoformat()
    })

@audit_bp.route('/export', methods=['GET'])
@check_permission('audit_read')
@validator.validate_query_params(
    format={'type': str, 'choices': ['csv', 'json'], 'required': True},
    start_date={'type': str, 'required': True},
    end_date={'type': str, 'required': True}
)
def export_audit_logs():
    """Export audit logs in specified format"""
    export_format = request.args.get('format')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get audit logs for the specified period
    audit_logs = AuditLog.query.join(User, AuditLog.user_id == User.id, isouter=True).filter(
        and_(
            AuditLog.timestamp >= start_date,
            AuditLog.timestamp < end_date
        )
    ).order_by(AuditLog.timestamp).all()
    
    if export_format == 'csv':
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Timestamp', 'Username', 'Action', 'Table Name', 
            'Record ID', 'IP Address', 'Old Values', 'New Values'
        ])
        
        # Write data
        for log in audit_logs:
            writer.writerow([
                log.id,
                log.timestamp.isoformat(),
                log.user.username if log.user else 'System',
                log.action,
                log.table_name,
                log.record_id,
                log.ip_address,
                log.old_values or '',
                log.new_values or ''
            ])
        
        output.seek(0)
        
        # Return as downloadable file
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=audit_logs_{start_date_str}_{end_date_str}.csv'
            }
        )
    
    elif export_format == 'json':
        # Prepare JSON data
        export_data = []
        for log in audit_logs:
            # Parse JSON values
            old_values = None
            new_values = None
            
            try:
                if log.old_values:
                    old_values = json.loads(log.old_values)
            except:
                old_values = log.old_values
            
            try:
                if log.new_values:
                    new_values = json.loads(log.new_values)
            except:
                new_values = log.new_values
            
            export_data.append({
                'id': log.id,
                'timestamp': log.timestamp.isoformat(),
                'user': {
                    'id': log.user.id if log.user else None,
                    'username': log.user.username if log.user else 'System'
                },
                'action': log.action,
                'table_name': log.table_name,
                'record_id': log.record_id,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'old_values': old_values,
                'new_values': new_values
            })
        
        from flask import Response
        return Response(
            json.dumps({
                'export_info': {
                    'period': f"{start_date_str} to {end_date_str}",
                    'total_records': len(export_data),
                    'exported_at': datetime.utcnow().isoformat()
                },
                'audit_logs': export_data
            }, indent=2),
            mimetype='application/json',
            headers={
                'Content-Disposition': f'attachment; filename=audit_logs_{start_date_str}_{end_date_str}.json'
            }
        )