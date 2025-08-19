# Chart of accounts API

# backend/api/accounts.py
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from models import db, Account, AccountType, User
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

accounts_bp = Blueprint('accounts', __name__)

@accounts_bp.route('', methods=['GET'])
@check_permission('account_read')
def get_accounts():
    """Get list of accounts with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    account_type = request.args.get('type')
    search = request.args.get('search')
    
    query = Account.query
    
    if account_type:
        query = query.filter(Account.account_type == account_type)
    
    if search:
        query = query.filter(or_(
            Account.name.contains(search),
            Account.code.contains(search),
            Account.name_ar.contains(search)
        ))
    
    accounts = query.order_by(Account.code).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    accounts_data = []
    for account in accounts.items:
        accounts_data.append({
            'id': account.id,
            'code': account.code,
            'name': account.name,
            'name_ar': account.name_ar,
            'account_type': account.account_type.value,
            'parent_id': account.parent_id,
            'parent_name': account.parent.name if account.parent else None,
            'level': account.level,
            'is_active': account.is_active,
            'children_count': len(account.children),
            'description': account.description,
            'created_at': account.created_at.isoformat()
        })
    
    return jsonify({
        'accounts': accounts_data,
        'total': accounts.total,
        'pages': accounts.pages,
        'current_page': page
    })

@accounts_bp.route('', methods=['POST'])
@check_permission('account_create')
def create_account():
    """Create a new account"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('code') or not data.get('name') or not data.get('account_type'):
        return jsonify({'message': 'Code, name, and account_type are required'}), 400
    
    # Check if account code already exists
    if Account.query.filter_by(code=data['code']).first():
        return jsonify({'message': 'Account code already exists'}), 400
    
    # Validate account type
    try:
        account_type = AccountType(data['account_type'])
    except ValueError:
        return jsonify({'message': 'Invalid account type'}), 400
    
    # Calculate level based on parent
    level = 0
    if data.get('parent_id'):
        parent = Account.query.get(data['parent_id'])
        if parent:
            level = parent.level + 1
        else:
            return jsonify({'message': 'Parent account not found'}), 400
    
    account = Account(
        code=data['code'],
        name=data['name'],
        name_ar=data.get('name_ar'),
        account_type=account_type,
        parent_id=data.get('parent_id'),
        level=level,
        description=data.get('description')
    )
    
    db.session.add(account)
    db.session.commit()
    
    log_audit_trail('accounts', account.id, 'INSERT', new_values={
        'code': account.code,
        'name': account.name,
        'account_type': account.account_type.value
    })
    
    return jsonify({
        'id': account.id,
        'code': account.code,
        'name': account.name,
        'account_type': account.account_type.value,
        'level': account.level,
        'message': 'Account created successfully'
    }), 201

@accounts_bp.route('/<int:account_id>', methods=['PUT'])
@check_permission('account_update')
def update_account(account_id):
    """Update an existing account"""
    account = Account.query.get_or_404(account_id)
    old_values = {
        'name': account.name,
        'name_ar': account.name_ar,
        'description': account.description,
        'is_active': account.is_active
    }
    
    data = request.get_json()
    
    # Update fields
    if 'name' in data:
        account.name = data['name']
    if 'name_ar' in data:
        account.name_ar = data['name_ar']
    if 'description' in data:
        account.description = data['description']
    if 'is_active' in data:
        account.is_active = data['is_active']
    
    db.session.commit()
    
    new_values = {
        'name': account.name,
        'name_ar': account.name_ar,
        'description': account.description,
        'is_active': account.is_active
    }
    
    log_audit_trail('accounts', account.id, 'UPDATE', old_values=old_values, new_values=new_values)
    
    return jsonify({
        'id': account.id,
        'code': account.code,
        'name': account.name,
        'message': 'Account updated successfully'
    })

@accounts_bp.route('/<int:account_id>', methods=['DELETE'])
@check_permission('account_delete')
def delete_account(account_id):
    """Delete an account (soft delete)"""
    account = Account.query.get_or_404(account_id)
    
    # Check if account has children
    if account.children:
        return jsonify({'message': 'Cannot delete account with child accounts'}), 400
    
    # Check if account has journal entries
    if account.journal_entry_lines:
        return jsonify({'message': 'Cannot delete account with journal entries'}), 400
    
    old_values = {
        'code': account.code,
        'name': account.name,
        'is_active': account.is_active
    }
    
    # Soft delete
    account.is_active = False
    db.session.commit()
    
    log_audit_trail('accounts', account.id, 'DELETE', old_values=old_values)
    
    return jsonify({'message': 'Account deleted successfully'})

@accounts_bp.route('/hierarchy', methods=['GET'])
@check_permission('account_read')
def get_accounts_hierarchy():
    """Get accounts in hierarchical structure"""
    def build_hierarchy(parent_id=None):
        accounts = Account.query.filter_by(parent_id=parent_id, is_active=True).order_by(Account.code).all()
        result = []
        for account in accounts:
            account_data = {
                'id': account.id,
                'code': account.code,
                'name': account.name,
                'name_ar': account.name_ar,
                'account_type': account.account_type.value,
                'level': account.level,
                'children': build_hierarchy(account.id)
            }
            result.append(account_data)
        return result
    
    hierarchy = build_hierarchy()
    return jsonify(hierarchy)