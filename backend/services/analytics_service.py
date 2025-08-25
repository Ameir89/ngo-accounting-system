
# backend/services/analytics_service.py

from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import func, extract, and_, or_, case
from models import (
    GrantStatus, db, Account, JournalEntry, JournalEntryLine, AccountType, 
    Grant, Project, Donor, Budget, BudgetLine, FixedAsset
)
import json

class AdvancedAnalyticsService:
    """Service for generating advanced analytics and KPIs"""
    
    @staticmethod
    def get_financial_dashboard_data(start_date=None, end_date=None):
        """Generate comprehensive dashboard data"""
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date.replace(month=1, day=1)  # Start of year
        
        # Cash position analysis
        cash_data = AdvancedAnalyticsService._get_cash_analysis(end_date)
        
        # Revenue analysis
        revenue_data = AdvancedAnalyticsService._get_revenue_analysis(start_date, end_date)
        
        # Expense analysis
        expense_data = AdvancedAnalyticsService._get_expense_analysis(start_date, end_date)
        
        # Grant utilization
        grant_data = AdvancedAnalyticsService._get_grant_utilization()
        
        # Project performance
        # project_data = AdvancedAnalyticsService._get_project_performance(start_date, end_date)
        project_data = None
        
        # Key performance indicators
        kpis = AdvancedAnalyticsService._calculate_kpis(start_date, end_date)
        
        # Alerts and notifications
        alerts = AdvancedAnalyticsService._get_financial_alerts()
        
        return {
            'period': {'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
            'cash_position': cash_data,
            'revenue_analysis': revenue_data,
            'expense_analysis': expense_data,
            'grant_utilization': grant_data,
            'project_performance': project_data,
            'kpis': kpis,
            'alerts': alerts,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def _get_cash_analysis(as_of_date):
        """Analyze cash position"""
        # Get all cash accounts (assuming they contain 'cash' or 'bank' in name)
        cash_accounts = Account.query.filter(
            and_(
                Account.account_type == AccountType.ASSET,
                or_(
                    Account.name.ilike('%cash%'),
                    Account.name.ilike('%bank%')
                )
            )
        ).all()
        
        cash_balances = []
        total_cash = Decimal('0')
        
        for account in cash_accounts:
            # Calculate account balance
            balance_query = db.session.query(
                func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
            ).join(JournalEntry).filter(
                and_(
                    JournalEntryLine.account_id == account.id,
                    JournalEntry.entry_date <= as_of_date,
                    JournalEntry.is_posted == True
                )
            ).scalar()
            
            balance = balance_query or Decimal('0')
            total_cash += balance
            
            cash_balances.append({
                'account_id': account.id,
                'account_name': account.name,
                'account_code': account.code,
                'balance': float(balance),
                'currency': 'USD'  # Default currency
            })
        
        # Calculate cash flow trend (last 12 months)
        cash_flow_trend = []
        for i in range(12):
            month_date = as_of_date.replace(day=1) - timedelta(days=30*i)
            month_start = month_date.replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_balance = db.session.query(
                func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
            ).join(JournalEntry).filter(
                and_(
                    JournalEntryLine.account_id.in_([acc.id for acc in cash_accounts]),
                    JournalEntry.entry_date <= month_end,
                    JournalEntry.is_posted == True
                )
            ).scalar() or Decimal('0')
            
            cash_flow_trend.append({
                'month': month_date.strftime('%Y-%m'),
                'balance': float(month_balance)
            })
        
        return {
            'total_cash': float(total_cash),
            'cash_accounts': cash_balances,
            'cash_flow_trend': list(reversed(cash_flow_trend))
        }
    
    @staticmethod
    def _get_revenue_analysis(start_date, end_date):
        """Analyze revenue by source and trends"""
        # Revenue by account
        revenue_query = db.session.query(
            Account.id,
            Account.name,
            Account.code,
            func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount).label('amount')
        ).join(JournalEntryLine).join(JournalEntry).filter(
            and_(
                Account.account_type == AccountType.REVENUE,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).group_by(Account.id, Account.name, Account.code).all()
        
        revenue_by_source = []
        total_revenue = Decimal('0')
        
        for row in revenue_query:
            amount = row.amount or Decimal('0')
            total_revenue += amount
            
            revenue_by_source.append({
                'account_id': row.id,
                'account_name': row.name,
                'account_code': row.code,
                'amount': float(amount)
            })
        
        # Revenue by month
        monthly_revenue = db.session.query(
            extract('year', JournalEntry.entry_date).label('year'),
            extract('month', JournalEntry.entry_date).label('month'),
            func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount).label('amount')
        ).join(Account).filter(
            and_(
                Account.account_type == AccountType.REVENUE,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).group_by(
            extract('year', JournalEntry.entry_date),
            extract('month', JournalEntry.entry_date)
        ).order_by('year', 'month').all()
        
        revenue_trend = []
        for row in monthly_revenue:
            revenue_trend.append({
                'month': f"{int(row.year)}-{int(row.month):02d}",
                'amount': float(row.amount or 0)
            })
        
        return {
            'total_revenue': float(total_revenue),
            'revenue_by_source': revenue_by_source,
            'revenue_trend': revenue_trend
        }
    
    @staticmethod
    def _get_expense_analysis(start_date, end_date):
        """Analyze expenses by category and functional classification"""
        # Expenses by account
        expense_query = db.session.query(
            Account.id,
            Account.name,
            Account.code,
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('amount')
        ).join(JournalEntryLine).join(JournalEntry).filter(
            and_(
                Account.account_type == AccountType.EXPENSE,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).group_by(Account.id, Account.name, Account.code).all()
        
        expenses_by_category = []
        total_expenses = Decimal('0')
        
        for row in expense_query:
            amount = row.amount or Decimal('0')
            total_expenses += amount
            
            # Categorize expenses (program vs administrative vs fundraising)
            category = AdvancedAnalyticsService._categorize_expense_account(row.name)
            
            expenses_by_category.append({
                'account_id': row.id,
                'account_name': row.name,
                'account_code': row.code,
                'amount': float(amount),
                'category': category
            })
        
        # Aggregate by functional classification
        functional_expenses = {}
        for expense in expenses_by_category:
            category = expense['category']
            if category not in functional_expenses:
                functional_expenses[category] = 0
            functional_expenses[category] += expense['amount']
        
        # Calculate expense ratios (important for NGO reporting)
        program_expenses = functional_expenses.get('program', 0)
        admin_expenses = functional_expenses.get('administrative', 0)
        fundraising_expenses = functional_expenses.get('fundraising', 0)
        
        expense_ratios = {
            'program_ratio': (program_expenses / float(total_expenses)) * 100 if total_expenses > 0 else 0,
            'admin_ratio': (admin_expenses / float(total_expenses)) * 100 if total_expenses > 0 else 0,
            'fundraising_ratio': (fundraising_expenses / float(total_expenses)) * 100 if total_expenses > 0 else 0
        }
        
        return {
            'total_expenses': float(total_expenses),
            'expenses_by_category': expenses_by_category,
            'functional_classification': functional_expenses,
            'expense_ratios': expense_ratios
        }
    
    @staticmethod
    def _categorize_expense_account(account_name):
        """Categorize expense accounts by function"""
        account_name_lower = account_name.lower()
        
        # Program service indicators
        program_keywords = ['program', 'education', 'health', 'community', 'project', 'service', 'beneficiary']
        if any(keyword in account_name_lower for keyword in program_keywords):
            return 'program'
        
        # Administrative indicators
        admin_keywords = ['admin', 'management', 'office', 'utilities', 'rent', 'insurance', 'legal', 'audit']
        if any(keyword in account_name_lower for keyword in admin_keywords):
            return 'administrative'
        
        # Fundraising indicators
        fundraising_keywords = ['fundraising', 'development', 'marketing', 'donor', 'campaign']
        if any(keyword in account_name_lower for keyword in fundraising_keywords):
            return 'fundraising'
        
        # Default to program expenses for NGOs
        return 'program'
    
    @staticmethod
    def _get_grant_utilization():
        """Analyze grant utilization across all active grants"""
        grants = Grant.query.filter_by(status=GrantStatus.ACTIVE).all()
        
        grant_analysis = []
        total_grant_amount = Decimal('0')
        total_utilized = Decimal('0')
        
        for grant in grants:
            # Calculate expenses charged to this grant's project
            expenses = db.session.query(
                func.sum(JournalEntryLine.debit_amount)
            ).join(JournalEntry).filter(
                and_(
                    JournalEntryLine.project_id == grant.project_id,
                    JournalEntry.is_posted == True
                )
            ).scalar() or Decimal('0')
            
            utilization_rate = (expenses / grant.amount * 100) if grant.amount > 0 else 0
            remaining_amount = grant.amount - expenses
            days_remaining = (grant.end_date - date.today()).days
            
            grant_analysis.append({
                'grant_id': grant.id,
                'grant_number': grant.grant_number,
                'title': grant.title,
                'donor_name': grant.donor.name,
                'total_amount': float(grant.amount),
                'utilized_amount': float(expenses),
                'remaining_amount': float(remaining_amount),
                'utilization_rate': float(utilization_rate),
                'days_remaining': days_remaining,
                'status': 'on_track' if utilization_rate < 80 else 'attention_needed',
                'end_date': grant.end_date.isoformat()
            })
            
            total_grant_amount += grant.amount
            total_utilized += expenses
        
        return {
            'total_grants': len(grants),
            'total_grant_amount': float(total_grant_amount),
            'total_utilized': float(total_utilized),
            'overall_utilization_rate': float((total_utilized / total_grant_amount * 100) if total_grant_amount > 0 else 0),
            'grants': grant_analysis
        }
    
    @staticmethod
    def _calculate_kpis(start_date, end_date):
        """Calculate key performance indicators"""
        # Get total revenue and expenses for the period
        total_revenue = db.session.query(
            func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount)
        ).join(JournalEntry).join(Account).filter(
            and_(
                Account.account_type == AccountType.REVENUE,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        total_expenses = db.session.query(
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
        ).join(JournalEntry).join(Account).filter(
            and_(
                Account.account_type == AccountType.EXPENSE,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        # Calculate net income
        net_income = total_revenue - total_expenses
        
        # Get total assets
        total_assets = db.session.query(
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
        ).join(JournalEntry).join(Account).filter(
            and_(
                Account.account_type == AccountType.ASSET,
                JournalEntry.entry_date <= end_date,
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        # Calculate efficiency ratios
        return {
            'revenue_growth': AdvancedAnalyticsService._calculate_growth_rate('revenue', start_date, end_date),
            'expense_growth': AdvancedAnalyticsService._calculate_growth_rate('expense', start_date, end_date),
            'net_income': float(net_income),
            'net_margin': float((net_income / total_revenue * 100) if total_revenue > 0 else 0),
            'total_assets': float(total_assets),
            'revenue_to_assets': float((total_revenue / total_assets) if total_assets > 0 else 0),
            'expense_efficiency': float((total_expenses / total_revenue * 100) if total_revenue > 0 else 0)
        }
    
    @staticmethod
    def _calculate_growth_rate(metric_type, start_date, end_date):
        """Calculate growth rate for revenue or expenses"""
        # Get current period amount
        current_period = end_date - start_date
        previous_start = start_date - current_period
        previous_end = start_date - timedelta(days=1)
        
        account_type = AccountType.REVENUE if metric_type == 'revenue' else AccountType.EXPENSE
        
        current_amount = db.session.query(
            func.sum(
                JournalEntryLine.credit_amount - JournalEntryLine.debit_amount 
                if metric_type == 'revenue' 
                else JournalEntryLine.debit_amount - JournalEntryLine.credit_amount
            )
        ).join(JournalEntry).join(Account).filter(
            and_(
                Account.account_type == account_type,
                JournalEntry.entry_date.between(start_date, end_date),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        previous_amount = db.session.query(
            func.sum(
                JournalEntryLine.credit_amount - JournalEntryLine.debit_amount 
                if metric_type == 'revenue' 
                else JournalEntryLine.debit_amount - JournalEntryLine.credit_amount
            )
        ).join(JournalEntry).join(Account).filter(
            and_(
                Account.account_type == account_type,
                JournalEntry.entry_date.between(previous_start, previous_end),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        if previous_amount > 0:
            growth_rate = ((current_amount - previous_amount) / previous_amount) * 100
            return float(growth_rate)
        return 0
    
    @staticmethod
    def _get_financial_alerts():
        """Generate financial alerts and notifications"""
        alerts = []
        
        # Check for grants expiring in 30 days
        warning_date = date.today() + timedelta(days=30)
        expiring_grants = Grant.query.filter(
            and_(
                Grant.end_date <= warning_date,
                Grant.status == GrantStatus.ACTIVE
            )
        ).count()
        
        if expiring_grants > 0:
            alerts.append({
                'type': 'warning',
                'category': 'grants',
                'message': f'{expiring_grants} grant(s) expiring in the next 30 days',
                'action_required': True
            })
        
        # Check for low cash balances
        # This would need to be implemented based on organization-specific thresholds
        
        # Check for overdue invoices
        # This would need to be implemented when supplier invoicing is complete
        
        # Check for budget variances exceeding thresholds
        # This would need to be implemented when budget comparison is complete
        
        return alerts