# backend/api/currencies.py - Currency Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from datetime import datetime, date
from decimal import Decimal
from models import db, Currency, ExchangeRate
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

currencies_bp = Blueprint('currencies', __name__, url_prefix='/api/currencies')

@currencies_bp.route('', methods=['GET'])
@check_permission('currency_read')
def get_currencies():
    """Get list of currencies"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    is_active = request.args.get('is_active')
    
    query = Currency.query
    
    if is_active is not None:
        is_active_bool = is_active.lower() == 'true'
        query = query.filter(Currency.is_active == is_active_bool)
    
    currencies = query.order_by(Currency.code).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    currencies_data = []
    for currency in currencies.items:
        # Get latest exchange rate
        latest_rate = ExchangeRate.query.filter_by(
            currency_id=currency.id
        ).order_by(ExchangeRate.rate_date.desc()).first()
        
        currencies_data.append({
            'id': currency.id,
            'code': currency.code,
            'name': currency.name,
            'symbol': currency.symbol,
            'is_base_currency': currency.is_base_currency,
            'is_active': currency.is_active,
            'latest_rate': float(latest_rate.rate) if latest_rate else 1.0,
            'last_rate_update': latest_rate.rate_date.isoformat() if latest_rate else None,
            'created_at': currency.created_at.isoformat()
        })
    
    return jsonify({
        'currencies': currencies_data,
        'total': currencies.total,
        'pages': currencies.pages,
        'current_page': page
    })

@currencies_bp.route('', methods=['POST'])
@check_permission('currency_create')
def create_currency():
    """Create a new currency"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['code', 'name']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Validate currency code format (3 characters)
    if len(data['code']) != 3 or not data['code'].isalpha():
        return jsonify({'message': 'Currency code must be 3 alphabetic characters'}), 400
    
    # Check if currency already exists
    if Currency.query.filter_by(code=data['code'].upper()).first():
        return jsonify({'message': 'Currency with this code already exists'}), 400
    
    # Check if trying to set as base currency
    if data.get('is_base_currency'):
        # Only one base currency allowed
        existing_base = Currency.query.filter_by(is_base_currency=True).first()
        if existing_base:
            return jsonify({'message': 'A base currency already exists. Deactivate it first.'}), 400
    
    currency = Currency(
        code=data['code'].upper(),
        name=data['name'],
        symbol=data.get('symbol', data['code']),
        is_base_currency=data.get('is_base_currency', False)
    )
    
    db.session.add(currency)
    db.session.commit()
    
    log_audit_trail('currencies', currency.id, 'INSERT', new_values={
        'code': currency.code,
        'name': currency.name,
        'is_base_currency': currency.is_base_currency
    })
    
    return jsonify({
        'id': currency.id,
        'code': currency.code,
        'name': currency.name,
        'is_base_currency': currency.is_base_currency,
        'message': 'Currency created successfully'
    }), 201

@currencies_bp.route('/<int:currency_id>/exchange-rates', methods=['GET'])
@check_permission('currency_read')
def get_exchange_rates(currency_id):
    """Get exchange rate history for a currency"""
    currency = Currency.query.get_or_404(currency_id)
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = request.args.get('limit', 30, type=int)
    
    query = ExchangeRate.query.filter_by(currency_id=currency_id)
    
    if start_date:
        query = query.filter(ExchangeRate.rate_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    
    if end_date:
        query = query.filter(ExchangeRate.rate_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    exchange_rates = query.order_by(ExchangeRate.rate_date.desc()).limit(limit).all()
    
    rates_data = []
    for rate in exchange_rates:
        rates_data.append({
            'id': rate.id,
            'rate_date': rate.rate_date.isoformat(),
            'rate': float(rate.rate),
            'created_at': rate.created_at.isoformat()
        })
    
    return jsonify({
        'currency': {
            'id': currency.id,
            'code': currency.code,
            'name': currency.name
        },
        'exchange_rates': rates_data,
        'total_rates': len(rates_data)
    })

@currencies_bp.route('/<int:currency_id>/exchange-rates', methods=['POST'])
@check_permission('currency_update')
def add_exchange_rate(currency_id):
    """Add a new exchange rate for a currency"""
    currency = Currency.query.get_or_404(currency_id)
    data = request.get_json()
    
    # Validate required fields
    if not data.get('rate') or not data.get('rate_date'):
        return jsonify({'message': 'Rate and rate_date are required'}), 400
    
    # Validate rate is positive
    if float(data['rate']) <= 0:
        return jsonify({'message': 'Exchange rate must be positive'}), 400
    
    rate_date = datetime.strptime(data['rate_date'], '%Y-%m-%d').date()
    
    # Check if rate already exists for this date
    existing_rate = ExchangeRate.query.filter_by(
        currency_id=currency_id,
        rate_date=rate_date
    ).first()
    
    if existing_rate:
        # Update existing rate
        old_rate = float(existing_rate.rate)
        existing_rate.rate = Decimal(str(data['rate']))
        
        log_audit_trail('exchange_rates', existing_rate.id, 'UPDATE', 
                       old_values={'rate': old_rate}, 
                       new_values={'rate': float(existing_rate.rate)})
        
        action = 'updated'
        rate_id = existing_rate.id
    else:
        # Create new rate
        exchange_rate = ExchangeRate(
            currency_id=currency_id,
            rate_date=rate_date,
            rate=Decimal(str(data['rate']))
        )
        
        db.session.add(exchange_rate)
        db.session.flush()
        
        log_audit_trail('exchange_rates', exchange_rate.id, 'INSERT', new_values={
            'currency_id': currency_id,
            'rate_date': rate_date.isoformat(),
            'rate': float(exchange_rate.rate)
        })
        
        action = 'created'
        rate_id = exchange_rate.id
    
    db.session.commit()
    
    return jsonify({
        'id': rate_id,
        'currency_code': currency.code,
        'rate_date': rate_date.isoformat(),
        'rate': float(data['rate']),
        'message': f'Exchange rate {action} successfully'
    }), 201 if action == 'created' else 200

@currencies_bp.route('/convert', methods=['POST'])
@check_permission('currency_read')
def convert_currency():
    """Convert amount between currencies"""
    data = request.get_json()
    
    required_fields = ['amount', 'from_currency_id', 'to_currency_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'{field} is required'}), 400
    
    amount = Decimal(str(data['amount']))
    from_currency = Currency.query.get_or_404(data['from_currency_id'])
    to_currency = Currency.query.get_or_404(data['to_currency_id'])
    
    conversion_date = data.get('conversion_date')
    if conversion_date:
        conversion_date = datetime.strptime(conversion_date, '%Y-%m-%d').date()
    else:
        conversion_date = date.today()
    
    # Get exchange rates for the conversion date
    from_rate = ExchangeRate.query.filter(
        ExchangeRate.currency_id == from_currency.id,
        ExchangeRate.rate_date <= conversion_date
    ).order_by(ExchangeRate.rate_date.desc()).first()
    
    to_rate = ExchangeRate.query.filter(
        ExchangeRate.currency_id == to_currency.id,
        ExchangeRate.rate_date <= conversion_date
    ).order_by(ExchangeRate.rate_date.desc()).first()
    
    # Handle base currency conversions
    if from_currency.is_base_currency:
        from_rate_value = Decimal('1')
    elif from_rate:
        from_rate_value = from_rate.rate
    else:
        return jsonify({'message': f'No exchange rate found for {from_currency.code}'}), 400
    
    if to_currency.is_base_currency:
        to_rate_value = Decimal('1')
    elif to_rate:
        to_rate_value = to_rate.rate
    else:
        return jsonify({'message': f'No exchange rate found for {to_currency.code}'}), 400
    
    # Convert: amount * (to_rate / from_rate)
    converted_amount = amount * (to_rate_value / from_rate_value)
    
    return jsonify({
        'original_amount': float(amount),
        'from_currency': {
            'id': from_currency.id,
            'code': from_currency.code,
            'name': from_currency.name
        },
        'to_currency': {
            'id': to_currency.id,
            'code': to_currency.code,
            'name': to_currency.name
        },
        'converted_amount': float(converted_amount),
        'exchange_rate': float(to_rate_value / from_rate_value),
        'conversion_date': conversion_date.isoformat(),
        'rates_used': {
            'from_rate': float(from_rate_value),
            'to_rate': float(to_rate_value),
            'from_rate_date': from_rate.rate_date.isoformat() if from_rate else None,
            'to_rate_date': to_rate.rate_date.isoformat() if to_rate else None
        }
    })