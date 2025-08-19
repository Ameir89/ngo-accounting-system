# Fixed assets API
# backend/api/assets.py - Fixed Assets Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func
from datetime import datetime, date
from decimal import Decimal
from models import db, FixedAsset, DepreciationEntry, AssetDepreciationMethod
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail
from services.financial_calculations import FinancialCalculationService

assets_bp = Blueprint('assets', __name__)
validator = RequestValidator()

@assets_bp.route('', methods=['GET'])
@check_permission('asset_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    search={'type': str},
    is_active={'type': bool},
    asset_category={'type': str}
)
def get_assets():
    """Get list of fixed assets with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    query = FixedAsset.query
    
    if search:
        query = query.filter(or_(
            FixedAsset.name.contains(search),
            FixedAsset.asset_number.contains(search),
            FixedAsset.description.contains(search)
        ))
    
    if is_active is not None:
        query = query.filter(FixedAsset.is_active == is_active)
    
    assets = query.order_by(FixedAsset.asset_number).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    assets_data = []
    for asset in assets.items:
        # Calculate current depreciation and net book value
        annual_depreciation = FinancialCalculationService.calculate_depreciation(
            asset, asset.depreciation_method.value
        )
        
        # Calculate age in years
        years_owned = (date.today() - asset.purchase_date).days / 365.25
        
        assets_data.append({
            'id': asset.id,
            'asset_number': asset.asset_number,
            'name': asset.name,
            'name_ar': asset.name_ar,
            'description': asset.description,
            'purchase_date': asset.purchase_date.isoformat(),
            'purchase_cost': float(asset.purchase_cost),
            'useful_life_years': asset.useful_life_years,
            'depreciation_method': asset.depreciation_method.value,
            'salvage_value': float(asset.salvage_value),
            'accumulated_depreciation': float(asset.accumulated_depreciation),
            'net_book_value': float(asset.net_book_value),
            'annual_depreciation': float(annual_depreciation),
            'years_owned': round(years_owned, 2),
            'is_active': asset.is_active,
            'created_at': asset.created_at.isoformat()
        })
    
    return jsonify({
        'assets': assets_data,
        'total': assets.total,
        'pages': assets.pages,
        'current_page': page
    })

@assets_bp.route('', methods=['POST'])
@check_permission('asset_create')
def create_asset():
    """Create a new fixed asset"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'purchase_date', 'purchase_cost', 'useful_life_years']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Validate amounts
    if data['purchase_cost'] <= 0:
        return jsonify({'message': 'Purchase cost must be greater than 0'}), 400
    
    if data['useful_life_years'] <= 0:
        return jsonify({'message': 'Useful life must be greater than 0'}), 400
    
    # Generate asset number
    last_asset = FixedAsset.query.order_by(FixedAsset.id.desc()).first()
    asset_number = f"FA{(last_asset.id + 1 if last_asset else 1):06d}"
    
    # Validate depreciation method
    depreciation_method = data.get('depreciation_method', 'straight_line')
    if depreciation_method not in ['straight_line', 'declining_balance']:
        return jsonify({'message': 'Invalid depreciation method'}), 400
    
    asset = FixedAsset(
        asset_number=asset_number,
        name=data['name'],
        name_ar=data.get('name_ar'),
        description=data.get('description'),
        purchase_date=datetime.strptime(data['purchase_date'], '%Y-%m-%d').date(),
        purchase_cost=Decimal(str(data['purchase_cost'])),
        useful_life_years=data['useful_life_years'],
        depreciation_method=AssetDepreciationMethod(depreciation_method),
        salvage_value=Decimal(str(data.get('salvage_value', 0)))
    )
    
    db.session.add(asset)
    db.session.commit()
    
    log_audit_trail('fixed_assets', asset.id, 'INSERT', new_values={
        'asset_number': asset.asset_number,
        'name': asset.name,
        'purchase_cost': float(asset.purchase_cost)
    })
    
    return jsonify({
        'id': asset.id,
        'asset_number': asset.asset_number,
        'name': asset.name,
        'net_book_value': float(asset.net_book_value),
        'message': 'Asset created successfully'
    }), 201

@assets_bp.route('/<int:asset_id>', methods=['PUT'])
@check_permission('asset_update')
def update_asset(asset_id):
    """Update an existing asset"""
    asset = FixedAsset.query.get_or_404(asset_id)
    
    old_values = {
        'name': asset.name,
        'description': asset.description,
        'useful_life_years': asset.useful_life_years,
        'salvage_value': float(asset.salvage_value)
    }
    
    data = request.get_json()
    
    # Update allowed fields (purchase_cost and depreciation_method should not be changed)
    if 'name' in data:
        asset.name = data['name']
    if 'name_ar' in data:
        asset.name_ar = data['name_ar']
    if 'description' in data:
        asset.description = data['description']
    if 'useful_life_years' in data and data['useful_life_years'] > 0:
        asset.useful_life_years = data['useful_life_years']
    if 'salvage_value' in data:
        asset.salvage_value = Decimal(str(data['salvage_value']))
    if 'is_active' in data:
        asset.is_active = data['is_active']
    
    db.session.commit()
    
    new_values = {
        'name': asset.name,
        'description': asset.description,
        'useful_life_years': asset.useful_life_years,
        'salvage_value': float(asset.salvage_value)
    }
    
    log_audit_trail('fixed_assets', asset.id, 'UPDATE', 
                   old_values=old_values, new_values=new_values)
    
    return jsonify({
        'id': asset.id,
        'name': asset.name,
        'net_book_value': float(asset.net_book_value),
        'message': 'Asset updated successfully'
    })

@assets_bp.route('/<int:asset_id>', methods=['DELETE'])
@check_permission('asset_delete')
def delete_asset(asset_id):
    """Delete an asset (soft delete)"""
    asset = FixedAsset.query.get_or_404(asset_id)
    
    # Check if asset has depreciation entries
    if asset.depreciation_entries:
        return jsonify({'message': 'Cannot delete asset with depreciation entries'}), 400
    
    old_values = {
        'asset_number': asset.asset_number,
        'name': asset.name,
        'is_active': asset.is_active
    }
    
    # Soft delete
    asset.is_active = False
    db.session.commit()
    
    log_audit_trail('fixed_assets', asset.id, 'DELETE', old_values=old_values)
    
    return jsonify({'message': 'Asset deleted successfully'})

@assets_bp.route('/<int:asset_id>/depreciation', methods=['GET'])
@check_permission('asset_read')
def get_asset_depreciation(asset_id):
    """Get depreciation history for an asset"""
    asset = FixedAsset.query.get_or_404(asset_id)
    
    depreciation_entries = DepreciationEntry.query.filter_by(
        asset_id=asset_id
    ).order_by(DepreciationEntry.entry_date.desc()).all()
    
    entries_data = []
    for entry in depreciation_entries:
        entries_data.append({
            'id': entry.id,
            'entry_date': entry.entry_date.isoformat(),
            'depreciation_amount': float(entry.depreciation_amount),
            'journal_entry_id': entry.journal_entry_id,
            'notes': entry.notes,
            'created_at': entry.created_at.isoformat()
        })
    
    return jsonify({
        'asset': {
            'id': asset.id,
            'asset_number': asset.asset_number,
            'name': asset.name,
            'purchase_cost': float(asset.purchase_cost),
            'accumulated_depreciation': float(asset.accumulated_depreciation),
            'net_book_value': float(asset.net_book_value)
        },
        'depreciation_entries': entries_data,
        'total_entries': len(entries_data)
    })

@assets_bp.route('/<int:asset_id>/calculate-depreciation', methods=['POST'])
@check_permission('asset_read')
def calculate_depreciation(asset_id):
    """Calculate depreciation for an asset"""
    asset = FixedAsset.query.get_or_404(asset_id)
    data = request.get_json()
    
    periods = data.get('periods', 12)  # Default to 12 months
    
    # Calculate depreciation
    monthly_depreciation = FinancialCalculationService.calculate_depreciation(
        asset, asset.depreciation_method.value, periods
    )
    
    annual_depreciation = FinancialCalculationService.calculate_depreciation(
        asset, asset.depreciation_method.value
    )
    
    # Calculate remaining depreciable amount
    depreciable_amount = asset.purchase_cost - asset.salvage_value
    remaining_depreciable = depreciable_amount - asset.accumulated_depreciation
    
    return jsonify({
        'asset_id': asset.id,
        'asset_name': asset.name,
        'calculation_method': asset.depreciation_method.value,
        'monthly_depreciation': float(monthly_depreciation / periods if periods > 0 else 0),
        'annual_depreciation': float(annual_depreciation),
        'periods_calculated': periods,
        'total_depreciation_for_period': float(monthly_depreciation),
        'remaining_depreciable_amount': float(remaining_depreciable),
        'calculated_at': datetime.utcnow().isoformat()
    })

@assets_bp.route('/summary', methods=['GET'])
@check_permission('asset_read')
def get_assets_summary():
    """Get summary statistics for all assets"""
    # Total assets value
    total_cost = db.session.query(func.sum(FixedAsset.purchase_cost)).filter_by(is_active=True).scalar() or 0
    total_accumulated_depreciation = db.session.query(func.sum(FixedAsset.accumulated_depreciation)).filter_by(is_active=True).scalar() or 0
    total_net_book_value = total_cost - total_accumulated_depreciation
    
    # Count by depreciation method
    method_counts = db.session.query(
        FixedAsset.depreciation_method,
        func.count(FixedAsset.id)
    ).filter_by(is_active=True).group_by(FixedAsset.depreciation_method).all()
    
    # Assets by age ranges
    current_date = date.today()
    age_ranges = {
        'less_than_1_year': 0,
        '1_to_3_years': 0,
        '3_to_5_years': 0,
        'more_than_5_years': 0
    }
    
    assets = FixedAsset.query.filter_by(is_active=True).all()
    for asset in assets:
        years_old = (current_date - asset.purchase_date).days / 365.25
        if years_old < 1:
            age_ranges['less_than_1_year'] += 1
        elif years_old < 3:
            age_ranges['1_to_3_years'] += 1
        elif years_old < 5:
            age_ranges['3_to_5_years'] += 1
        else:
            age_ranges['more_than_5_years'] += 1
    
    return jsonify({
        'total_assets': len(assets),
        'total_purchase_cost': float(total_cost),
        'total_accumulated_depreciation': float(total_accumulated_depreciation),
        'total_net_book_value': float(total_net_book_value),
        'depreciation_rate': (float(total_accumulated_depreciation) / float(total_cost) * 100) if total_cost > 0 else 0,
        'assets_by_method': {method.value: count for method, count in method_counts},
        'assets_by_age': age_ranges,
        'generated_at': datetime.utcnow().isoformat()
    })