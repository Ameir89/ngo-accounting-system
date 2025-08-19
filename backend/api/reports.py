# Financial reports API
# backend/api/reports.py
from flask import Blueprint, request, jsonify
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, date
from models import db, Account, AccountType, JournalEntry, JournalEntryLine
from utils.decorators import check_permission

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/trial-balance', methods=['GET'])
@check_permission('reports_read')
def trial_balance():
    """Generate trial balance report"""
    as_of_date = request.args.get('as_of_date', datetime.now().date().isoformat())
    as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
    
    # Get all accounts with their balances
    query = db.session.query(
        Account.id,
        Account.code,
        Account.name,
        Account.account_type,
        func.sum(JournalEntryLine.debit_amount).label('total_debit'),
        func.sum(JournalEntryLine.credit_amount).label('total_credit')
    ).outerjoin(
        JournalEntryLine, Account.id == JournalEntryLine.account_id
    ).outerjoin(
        JournalEntry, and_(
            JournalEntryLine.journal_entry_id == JournalEntry.id,
            JournalEntry.entry_date <= as_of_date,
            JournalEntry.is_posted == True
        )
    ).group_by(Account.id, Account.code, Account.name, Account.account_type)
    
    results = query.all()
    
    trial_balance_data = []
    total_debit = 0
    total_credit = 0
    
    for result in results:
        debit_balance = float(result.total_debit or 0)
        credit_balance = float(result.total_credit or 0)
        net_balance = debit_balance - credit_balance
        
        # Determine if balance should be shown as debit or credit
        if result.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
            if net_balance >= 0:
                debit_amount = net_balance
                credit_amount = 0
            else:
                debit_amount = 0
                credit_amount = abs(net_balance)
        else:  # LIABILITY, EQUITY, REVENUE
            if net_balance <= 0:
                credit_amount = abs(net_balance)
                debit_amount = 0
            else:
                debit_amount = net_balance
                credit_amount = 0
        
        total_debit += debit_amount
        total_credit += credit_amount
        
        trial_balance_data.append({
            'account_code': result.code,
            'account_name': result.name,
            'account_type': result.account_type.value,
            'debit_amount': debit_amount,
            'credit_amount': credit_amount
        })
    
    return jsonify({
        'as_of_date': as_of_date.isoformat(),
        'accounts': trial_balance_data,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'is_balanced': abs(total_debit - total_credit) < 0.01
    })

@reports_bp.route('/balance-sheet', methods=['GET'])
@check_permission('reports_read')
def balance_sheet():
    """Generate balance sheet report"""
    as_of_date = request.args.get('as_of_date', datetime.now().date().isoformat())
    as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
    
    # Get account balances grouped by type
    query = db.session.query(
        Account.account_type,
        Account.code,
        Account.name,
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('balance')
    ).join(
        JournalEntryLine, Account.id == JournalEntryLine.account_id
    ).join(
        JournalEntry, and_(
            JournalEntryLine.journal_entry_id == JournalEntry.id,
            JournalEntry.entry_date <= as_of_date,
            JournalEntry.is_posted == True
        )
    ).group_by(Account.account_type, Account.code, Account.name).all()
    
    balance_sheet_data = {
        'assets': [],
        'liabilities': [],
        'equity': [],
        'total_assets': 0,
        'total_liabilities': 0,
        'total_equity': 0
    }
    
    for result in query:
        balance = float(result.balance or 0)
        account_data = {
            'code': result.code,
            'name': result.name,
            'balance': balance
        }
        
        if result.account_type == AccountType.ASSET and balance != 0:
            balance_sheet_data['assets'].append(account_data)
            balance_sheet_data['total_assets'] += balance
        elif result.account_type == AccountType.LIABILITY and balance != 0:
            balance_sheet_data['liabilities'].append(account_data)
            balance_sheet_data['total_liabilities'] += abs(balance)
        elif result.account_type == AccountType.EQUITY and balance != 0:
            balance_sheet_data['equity'].append(account_data)
            balance_sheet_data['total_equity'] += abs(balance)
    
    balance_sheet_data['as_of_date'] = as_of_date.isoformat()
    
    return jsonify(balance_sheet_data)

@reports_bp.route('/income-statement', methods=['GET'])
@check_permission('reports_read')
def income_statement():
    """Generate income statement (statement of activities)"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'message': 'start_date and end_date are required'}), 400
    
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    # Get revenue accounts (AccountType.REVENUE)
    revenue_query = db.session.query(
        Account.id,
        Account.code,
        Account.name,
        func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount).label('amount')
    ).join(JournalEntryLine).join(JournalEntry).filter(
        Account.account_type == AccountType.REVENUE,
        JournalEntry.entry_date.between(start_date, end_date),
        JournalEntry.is_posted == True
    ).group_by(Account.id, Account.code, Account.name)
    
    # Get expense accounts (AccountType.EXPENSE)
    expense_query = db.session.query(
        Account.id,
        Account.code,
        Account.name,
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('amount')
    ).join(JournalEntryLine).join(JournalEntry).filter(
        Account.account_type == AccountType.EXPENSE,
        JournalEntry.entry_date.between(start_date, end_date),
        JournalEntry.is_posted == True
    ).group_by(Account.id, Account.code, Account.name)
    
    revenues = []
    total_revenue = 0
    for row in revenue_query:
        amount = float(row.amount or 0)
        total_revenue += amount
        revenues.append({
            'account_code': row.code,
            'account_name': row.name,
            'amount': amount
        })
    
    expenses = []
    total_expenses = 0
    for row in expense_query:
        amount = float(row.amount or 0)
        total_expenses += amount
        expenses.append({
            'account_code': row.code,
            'account_name': row.name,
            'amount': amount
        })
    
    net_income = total_revenue - total_expenses
    
    return jsonify({
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'revenues': revenues,
        'expenses': expenses,
        'totals': {
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'net_income': net_income
        }
    })