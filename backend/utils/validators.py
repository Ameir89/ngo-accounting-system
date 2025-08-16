# Data validation
# backend/utils/validators.py
import re
from email_validator import validate_email as email_validate, EmailNotValidError

def validate_email(email):
    """Validate email format"""
    try:
        email_validate(email)
        return True
    except EmailNotValidError:
        return False

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False
    
    # Check for uppercase, lowercase, digit, and special character
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    return True

def validate_account_code(code):
    """Validate account code format"""
    if not code or len(code) < 3 or len(code) > 20:
        return False
    
    # Account code should be alphanumeric
    return re.match(r'^[A-Za-z0-9]+$', code)

def validate_amount(amount):
    """Validate monetary amount"""
    try:
        amount = float(amount)
        return amount >= 0 and amount <= 999999999.99
    except (ValueError, TypeError):
        return False