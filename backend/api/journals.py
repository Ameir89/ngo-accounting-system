# Journal entries API
# backend/api/journals.py
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import extract, and_
from sqlalchemy.orm import joinedload
from datetime import datetime, date
from decimal import Decimal
from models import db, JournalEntry, JournalEntryLine, JournalEntryType, Account, User
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

journals_bp = Blueprint('journals', __name__)

@journals_bp.route('', methods=['GET'])
@check_permission('journal_read')
def get_journal_entries():
    """Get list of journal entries with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    entry_type = request.args.get('entry_type')
    is_posted = request.args.get('is_posted')
    
    query = JournalEntry.query.options(joinedload(JournalEntry.lines))
    
    if start_date:
        query = query.filter(JournalEntry.entry_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(JournalEntry.entry_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if entry_type:
        query = query.filter(JournalEntry.entry_type == entry_type)
    if is_posted is not None:
        posted_bool = is_posted.lower() == 'true'
        query = query.filter(JournalEntry.is_posted == posted_bool)
    
    entries = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.entry_number.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    entries_data = []
    for entry in entries.items:
        lines_data = []
        for line in entry.lines:
            lines_data.append({
                'id': line.id,
                'account_id': line.account_id,
                'account_name': line.account.name,
                'cost_center_id': line.cost_center_id,
                'cost_center_name': line.cost_center.name if line.cost_center else None,
                'project_id': line.project_id,
                'project_name': line.project.name if line.project else None,
                'description': line.description,
                'debit_amount': float(line.debit_amount),
                'credit_amount': float(line.credit_amount),
                'line_number': line.line_number
            })
        
        entries_data.append({
            'id': entry.id,
            'entry_number': entry.entry_number,
            'entry_date': entry.entry_date.isoformat(),
            'description': entry.description,
            'entry_type': entry.entry_type.value,
            'reference_number': entry.reference_number,
            'total_debit': float(entry.total_debit),
            'total_credit': float(entry.total_credit),
            'currency_code': entry.currency.code,
            'exchange_rate': float(entry.exchange_rate),
            'is_posted': entry.is_posted,
            'created_by_name': f"{entry.created_by_user.first_name} {entry.created_by_user.last_name}",
            'created_at': entry.created_at.isoformat(),
            'posted_at': entry.posted_at.isoformat() if entry.posted_at else None,
            'lines': lines_data
        })
    
    return jsonify({
        'entries': entries_data,
        'total': entries.total,
        'pages': entries.pages,
        'current_page': page
    })

@journals_bp.route('', methods=['POST'])
@check_permission('journal_create')
def create_journal_entry():
    """Create a new journal entry"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('entry_date') or not data.get('description') or not data.get('lines'):
        return jsonify({'message': 'Entry date, description, and lines are required'}), 400
    
    if len(data['lines']) < 2:
        return jsonify({'message': 'Journal entry must have at least 2 lines'}), 400
    
    # Validate that debits equal credits
    total_debit = sum(Decimal(str(line.get('debit_amount', 0))) for line in data['lines'])
    total_credit = sum(Decimal(str(line.get('credit_amount', 0))) for line in data['lines'])
    
    if total_debit != total_credit:
        return jsonify({'message': 'Total debits must equal total credits'}), 400
    
    if total_debit == 0:
        return jsonify({'message': 'Journal entry cannot have zero amounts'}), 400
    
    # Generate entry number
    entry_date = datetime.strptime(data['entry_date'], '%Y-%m-%d').date()
    entry_count = JournalEntry.query.filter(
        extract('year', JournalEntry.entry_date) == entry_date.year,
        extract('month', JournalEntry.entry_date) == entry_date.month
    ).count()
    entry_number = f"JE{entry_date.strftime('%Y%m')}{entry_count + 1:04d}"
    
    # Get currency and exchange rate
    currency_id = data.get('currency_id', 1)  # Default to base currency
    exchange_rate = Decimal(str(data.get('exchange_rate', 1)))
    
    # Create journal entry
    journal_entry = JournalEntry(
        entry_number=entry_number,
        entry_date=entry_date,
        description=data['description'],
        entry_type=JournalEntryType(data.get('entry_type', 'manual')),
        reference_number=data.get('reference_number'),
        total_debit=total_debit,
        total_credit=total_credit,
        currency_id=currency_id,
        exchange_rate=exchange_rate,
        created_by=g.current_user.id
    )
    
    db.session.add(journal_entry)
    db.session.flush()  # Get the ID
    
    # Create journal entry lines
    for line_data in data['lines']:
        # Validate account exists
        account = Account.query.get(line_data['account_id'])
        if not account:
            return jsonify({'message': f'Account {line_data["account_id"]} not found'}), 400
        
        line = JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_id=line_data['account_id'],
            cost_center_id=line_data.get('cost_center_id'),
            project_id=line_data.get('project_id'),
            description=line_data.get('description'),
            debit_amount=Decimal(str(line_data.get('debit_amount', 0))),
            credit_amount=Decimal(str(line_data.get('credit_amount', 0))),
            line_number=line_data.get('line_number', 1)
        )
        db.session.add(line)
    
    db.session.commit()
    
    log_audit_trail('journal_entries', journal_entry.id, 'INSERT', new_values={
        'entry_number': journal_entry.entry_number,
        'description': journal_entry.description,
        'total_debit': float(journal_entry.total_debit),
        'lines_count': len(data['lines'])
    })
    
    # Return full entry data
    lines_data = []
    for line in journal_entry.lines:
        lines_data.append({
            'id': line.id,
            'account_id': line.account_id,
            'account_name': line.account.name,
            'debit_amount': float(line.debit_amount),
            'credit_amount': float(line.credit_amount),
            'line_number': line.line_number
        })
    
    return jsonify({
        'id': journal_entry.id,
        'entry_number': journal_entry.entry_number,
        'entry_date': journal_entry.entry_date.isoformat(),
        'description': journal_entry.description,
        'total_debit': float(journal_entry.total_debit),
        'total_credit': float(journal_entry.total_credit),
        'is_posted': journal_entry.is_posted,
        'lines': lines_data,
        'message': 'Journal entry created successfully'
    }), 201

@journals_bp.route('/<int:entry_id>/post', methods=['POST'])
@check_permission('journal_post')
def post_journal_entry(entry_id):
    """Post a journal entry to make it final"""
    entry = JournalEntry.query.get_or_404(entry_id)
    
    if entry.is_posted:
        return jsonify({'message': 'Journal entry already posted'}), 400
    
    entry.is_posted = True
    entry.posted_at = datetime.utcnow()
    
    db.session.commit()
    
    log_audit_trail('journal_entries', entry.id, 'UPDATE', 
                   old_values={'is_posted': False}, 
                   new_values={'is_posted': True, 'posted_at': entry.posted_at.isoformat()})
    
    return jsonify({'message': 'Journal entry posted successfully'})

@journals_bp.route('/<int:entry_id>/unpost', methods=['POST'])
@check_permission('journal_post')
def unpost_journal_entry(entry_id):
    """Unpost a journal entry (admin only)"""
    current_user = g.current_user
    if current_user.role.name != 'Administrator':
        return jsonify({'message': 'Only administrators can unpost entries'}), 403
    
    entry = JournalEntry.query.get_or_404(entry_id)
    
    if not entry.is_posted:
        return jsonify({'message': 'Journal entry is not posted'}), 400
    
    entry.is_posted = False
    entry.posted_at = None
    
    db.session.commit()
    
    log_audit_trail('journal_entries', entry.id, 'UPDATE', 
                   old_values={'is_posted': True}, 
                   new_values={'is_posted': False, 'unposted_by': current_user.username})
    
    return jsonify({'message': 'Journal entry unposted successfully'})

@journals_bp.route('/<int:entry_id>', methods=['DELETE'])
@check_permission('journal_delete')
def delete_journal_entry(entry_id):
    """Delete a journal entry (only if not posted)"""
    entry = JournalEntry.query.get_or_404(entry_id)
    
    if entry.is_posted:
        return jsonify({'message': 'Cannot delete posted journal entry'}), 400
    
    old_values = {
        'entry_number': entry.entry_number,
        'description': entry.description,
        'total_debit': float(entry.total_debit)
    }
    
    # Delete lines first (cascade should handle this, but explicit is better)
    JournalEntryLine.query.filter_by(journal_entry_id=entry.id).delete()
    
    db.session.delete(entry)
    db.session.commit()
    
    log_audit_trail('journal_entries', entry_id, 'DELETE', old_values=old_values)
    
    return jsonify({'message': 'Journal entry deleted successfully'})