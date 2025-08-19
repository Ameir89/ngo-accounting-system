# Grant management API
# backend/api/grants.py

from flask import Blueprint, request, jsonify
from models import Account, db, Grant, Donor, Project, Currency, JournalEntryLine, JournalEntry
from sqlalchemy import func, and_
from datetime import datetime, date
from utils.decorators import check_permission

grants_bp = Blueprint('grants', __name__)

@grants_bp.route('', methods=['GET'])
@check_permission('grant_read')
def get_grants():
    """Get list of grants with filters"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    donor_id = request.args.get('donor_id', type=int)
    
    query = Grant.query.join(Donor).join(Project, Grant.project_id == Project.id, isouter=True)
    
    if status:
        query = query.filter(Grant.status == status)
    if donor_id:
        query = query.filter(Grant.donor_id == donor_id)
    
    grants = query.order_by(Grant.start_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    grants_data = []
    for grant in grants.items:
        # Calculate utilization
        total_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            JournalEntryLine.project_id == grant.project_id,
            JournalEntry.is_posted == True
        ).scalar() or 0
        
        utilization_percentage = (float(total_expenses) / float(grant.amount) * 100) if grant.amount > 0 else 0
        
        grants_data.append({
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'title_ar': grant.title_ar,
            'donor_name': grant.donor.name,
            'project_name': grant.project.name if grant.project else None,
            'amount': float(grant.amount),
            'currency_code': grant.currency.code,
            'start_date': grant.start_date.isoformat(),
            'end_date': grant.end_date.isoformat(),
            'status': grant.status.value,
            'utilization_percentage': round(utilization_percentage, 2),
            'remaining_amount': float(grant.amount - total_expenses),
            'days_remaining': (grant.end_date - date.today()).days
        })
    
    return jsonify({
        'grants': grants_data,
        'total': grants.total,
        'pages': grants.pages,
        'current_page': page
    })

@grants_bp.route('/<int:grant_id>/utilization', methods=['GET'])
@check_permission('grant_read')
def get_grant_utilization(grant_id):
    """Get detailed grant utilization report"""
    grant = Grant.query.get_or_404(grant_id)
    
    # Get all expenses for this grant's project
    expenses_query = db.session.query(
        JournalEntryLine.account_id,
        func.sum(JournalEntryLine.debit_amount).label('total_amount')
    ).join(JournalEntry).filter(
        JournalEntryLine.project_id == grant.project_id,
        JournalEntry.is_posted == True
    ).group_by(JournalEntryLine.account_id)
    
    expenses_by_account = []
    total_expenses = 0
    
    for expense in expenses_query:
        account = Account.query.get(expense.account_id)
        amount = float(expense.total_amount)
        total_expenses += amount
        
        expenses_by_account.append({
            'account_code': account.code,
            'account_name': account.name,
            'amount': amount,
            'percentage': (amount / float(grant.amount) * 100) if grant.amount > 0 else 0
        })
    
    return jsonify({
        'grant': {
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'amount': float(grant.amount),
            'currency_code': grant.currency.code,
            'start_date': grant.start_date.isoformat(),
            'end_date': grant.end_date.isoformat()
        },
        'utilization': {
            'total_expenses': total_expenses,
            'remaining_balance': float(grant.amount) - total_expenses,
            'utilization_percentage': (total_expenses / float(grant.amount) * 100) if grant.amount > 0 else 0,
            'expenses_by_account': expenses_by_account
        }
    })