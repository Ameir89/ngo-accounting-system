# Business logic

# backend/services/financial_calculations.py
from decimal import Decimal
from models import db, Grant, JournalEntryLine, JournalEntry
from sqlalchemy import func

class FinancialCalculationService:
    @staticmethod
    def calculate_depreciation(asset, method='straight_line', periods=None):
        """Calculate depreciation for a fixed asset"""
        if method == 'straight_line':
            annual_depreciation = (asset.purchase_cost - asset.salvage_value) / asset.useful_life_years
            if periods:
                return annual_depreciation / 12 * periods  # Monthly calculation
            return annual_depreciation
        
        elif method == 'declining_balance':
            # Double declining balance method
            rate = 2 / asset.useful_life_years
            current_value = asset.purchase_cost - asset.accumulated_depreciation
            depreciation = current_value * rate
            return min(depreciation, current_value - asset.salvage_value)
        
        return Decimal('0')
    
    @staticmethod
    def calculate_budget_variance(actual_amount, budgeted_amount):
        """Calculate budget variance analysis"""
        variance = actual_amount - budgeted_amount
        variance_percentage = (variance / budgeted_amount * 100) if budgeted_amount != 0 else 0
        
        return {
            'variance_amount': float(variance),
            'variance_percentage': float(variance_percentage),
            'variance_type': 'favorable' if variance < 0 else 'unfavorable',
            'actual_amount': float(actual_amount),
            'budgeted_amount': float(budgeted_amount)
        }
    
    @staticmethod
    def calculate_grant_utilization(grant_id):
        """Calculate grant utilization and remaining balance"""
        grant = Grant.query.get(grant_id)
        if not grant:
            return None
        
        # Calculate total expenses charged to this grant
        total_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            JournalEntryLine.project_id == grant.project_id,
            JournalEntry.is_posted == True
        ).scalar() or Decimal('0')
        
        utilization_percentage = (total_expenses / grant.amount * 100) if grant.amount > 0 else 0
        remaining_balance = grant.amount - total_expenses
        
        return {
            'grant_amount': float(grant.amount),
            'utilized_amount': float(total_expenses),
            'remaining_balance': float(remaining_balance),
            'utilization_percentage': float(utilization_percentage),
            'status': 'over_budget' if remaining_balance < 0 else 'on_track'
        }