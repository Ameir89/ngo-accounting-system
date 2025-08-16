# Audit trail management
# backend/services/audit_service.py
from models import db, AuditLog
from flask import request, g
import json

def log_audit_trail(table_name, record_id, action, old_values=None, new_values=None, ip_address=None):
    """Log audit trail for database operations"""
    if hasattr(g, 'current_user') and g.current_user:
        audit_log = AuditLog(
            user_id=g.current_user.id,
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address=ip_address or request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:200]
        )
        db.session.add(audit_log)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Audit log error: {e}")