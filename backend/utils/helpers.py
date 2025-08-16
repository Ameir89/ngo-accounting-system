# Utility functions
# backend/utils/helpers.py
from datetime import datetime, date
from decimal import Decimal
import json

class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def format_currency(amount, currency_code='USD'):
    """Format amount as currency"""
    if currency_code == 'USD':
        return f"${amount:,.2f}"
    elif currency_code == 'EUR':
        return f"€{amount:,.2f}"
    else:
        return f"{amount:,.2f} {currency_code}"

def get_fiscal_year(date_obj, fiscal_start_month=1):
    """Get fiscal year for a given date"""
    if date_obj.month >= fiscal_start_month:
        return date_obj.year
    else:
        return date_obj.year - 1

def calculate_age_in_days(start_date, end_date=None):
    """Calculate age in days between two dates"""
    if end_date is None:
        end_date = date.today()
    
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    return (end_date - start_date).days

def generate_reference_number(prefix, date_obj=None, sequence=None):
    """Generate a reference number with prefix, date, and sequence"""
    if date_obj is None:
        date_obj = date.today()
    
    date_str = date_obj.strftime('%Y%m%d')
    
    if sequence is not None:
        return f"{prefix}{date_str}{sequence:04d}"
    else:
        return f"{prefix}{date_str}"

def paginate_query(query, page=1, per_page=20, max_per_page=100):
    """Helper function for query pagination"""
    per_page = min(per_page, max_per_page)
    return query.paginate(page=page, per_page=per_page, error_out=False)