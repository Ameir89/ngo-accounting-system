# backend/api/dashboard.py - Dashboard Analytics API
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, date, timedelta
from sqlalchemy import func, extract, and_
from models import (
    db, Account, AccountType, JournalEntry, JournalEntryLine, 
    Grant, GrantStatus, Project, Supplier, FixedAsset, User
)
from utils.decorators import check_permission
from services.analytics_service import AdvancedAnalyticsService

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/overview', methods=['GET'])
@check_permission('dashboard_read')
def get_dashboard_overview():
    """Get comprehensive dashboard overview"""
    # Get date range (default to current month)
    end_date = request.args.get('end_date')
    start_date = request.args.get('start_date')
    
    if not end_date:
        end_date = date.today()
    else:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    if not start_date:
        start_date = end_date.replace(day=1)  # First day of month
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    
    # Use analytics service for comprehensive data
    analytics = AdvancedAnalyticsService()
    dashboard_data = analytics.get_financial_dashboard_data(start_date, end_date)
    
    # Add quick stats
    quick_stats = {
        'total_accounts': Account.query.filter_by(is_active=True).count(),
        'total_projects': Project.query.filter_by(is_active=True).count(),
        'active_grants': Grant.query.filter_by(status=GrantStatus.ACTIVE).count(),
        'total_suppliers': Supplier.query.filter_by(is_active=True).count(),
        'total_assets': FixedAsset.query.filter_by(is_active=True).count(),
        'total_users': User.query.filter_by(is_active=True).count()
    }
    
    dashboard_data['quick_stats'] = quick_stats
    
    return jsonify(dashboard_data)

@dashboard_bp.route('/financial-summary', methods=['GET'])
@check_permission('dashboard_read')
def get_financial_summary():
    """Get financial summary for the dashboard"""
    as_of_date = request.args.get('as_of_date')
    if not as_of_date:
        as_of_date = date.today()
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
    
    # Calculate account balances by type
    account_balances = db.session.query(
        Account.account_type,
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('balance')
    ).join(JournalEntryLine).join(JournalEntry).filter(
        JournalEntry.entry_date <= as_of_date,
        JournalEntry.is_posted == True
    ).group_by(Account.account_type).all()
    
    balances = {}
    for account_type, balance in account_balances:
        balances[account_type.value] = float(balance or 0)
    
    # Calculate key financial ratios
    total_assets = balances.get('asset', 0)
    total_liabilities = abs(balances.get('liability', 0))
    total_equity = abs(balances.get('equity', 0))
    
    # Current month revenue and expenses
    current_month_start = as_of_date.replace(day=1)
    
    current_revenue = db.session.query(
        func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount)
    ).join(JournalEntry).join(Account).filter(
        Account.account_type == AccountType.REVENUE,
        JournalEntry.entry_date.between(current_month_start, as_of_date),
        JournalEntry.is_posted == True
    ).scalar() or 0
    
    current_expenses = db.session.query(
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
    ).join(JournalEntry).join(Account).filter(
        Account.account_type == AccountType.EXPENSE,
        JournalEntry.entry_date.between(current_month_start, as_of_date),
        JournalEntry.is_posted == True
    ).scalar() or 0
    
    return jsonify({
        'as_of_date': as_of_date.isoformat(),
        'account_balances': balances,
        'financial_position': {
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'total_equity': total_equity,
            'debt_to_equity_ratio': (total_liabilities / total_equity) if total_equity > 0 else 0
        },
        'current_month_performance': {
            'revenue': float(current_revenue),
            'expenses': float(current_expenses),
            'net_income': float(current_revenue - current_expenses),
            'expense_ratio': (float(current_expenses) / float(current_revenue) * 100) if current_revenue > 0 else 0
        }
    })

@dashboard_bp.route('/charts/revenue-trend', methods=['GET'])
@check_permission('dashboard_read')
def get_revenue_trend_chart():
    """Get revenue trend data for charting"""
    months = int(request.args.get('months', 12))
    end_date = date.today()
    start_date = end_date - timedelta(days=30 * months)
    
    # Get monthly revenue
    monthly_revenue = db.session.query(
        extract('year', JournalEntry.entry_date).label('year'),
        extract('month', JournalEntry.entry_date).label('month'),
        func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount).label('revenue')
    ).join(Account).filter(
        Account.account_type == AccountType.REVENUE,
        JournalEntry.entry_date.between(start_date, end_date),
        JournalEntry.is_posted == True
    ).group_by(
        extract('year', JournalEntry.entry_date),
        extract('month', JournalEntry.entry_date)
    ).order_by('year', 'month').all()
    
    chart_data = []
    for row in monthly_revenue:
        chart_data.append({
            'period': f"{int(row.year)}-{int(row.month):02d}",
            'revenue': float(row.revenue or 0)
        })
    
    return jsonify({
        'chart_data': chart_data,
        'total_periods': len(chart_data),
        'total_revenue': sum(item['revenue'] for item in chart_data)
    })

@dashboard_bp.route('/charts/expense-breakdown', methods=['GET'])
@check_permission('dashboard_read')
def get_expense_breakdown_chart():
    """Get expense breakdown by functional classification"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not end_date:
        end_date = date.today()
    else:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    if not start_date:
        start_date = end_date.replace(month=1, day=1)  # Start of year
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    
    # Get expenses by account
    expenses = db.session.query(
        Account.name,
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('amount')
    ).join(JournalEntryLine).join(JournalEntry).filter(
        Account.account_type == AccountType.EXPENSE,
        JournalEntry.entry_date.between(start_date, end_date),
        JournalEntry.is_posted == True
    ).group_by(Account.name).all()
    
    # Categorize expenses
    expense_categories = {
        'program_services': 0,
        'administrative': 0,
        'fundraising': 0,
        'other': 0
    }
    
    detailed_expenses = []
    
    for expense in expenses:
        amount = float(expense.amount or 0)
        account_name = expense.name.lower()
        
        # Categorize based on account name
        if any(keyword in account_name for keyword in ['program', 'project', 'service', 'education', 'health']):
            category = 'program_services'
        elif any(keyword in account_name for keyword in ['admin', 'management', 'office', 'utilities']):
            category = 'administrative'
        elif any(keyword in account_name for keyword in ['fundraising', 'development', 'marketing']):
            category = 'fundraising'
        else:
            category = 'other'
        
        expense_categories[category] += amount
        
        detailed_expenses.append({
            'account_name': expense.name,
            'amount': amount,
            'category': category
        })
    
    total_expenses = sum(expense_categories.values())
    
    # Convert to percentages
    expense_percentages = {}
    for category, amount in expense_categories.items():
        expense_percentages[category] = (amount / total_expenses * 100) if total_expenses > 0 else 0
    
    return jsonify({
        'expense_categories': expense_categories,
        'expense_percentages': expense_percentages,
        'detailed_expenses': detailed_expenses,
        'total_expenses': total_expenses,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    })