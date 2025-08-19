# Supplier management API
# backend/api/suppliers.py

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from models import db, Supplier, PurchaseOrder, SupplierInvoice
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

suppliers_bp = Blueprint('suppliers', __name__)

@suppliers_bp.route('', methods=['GET'])
@check_permission('supplier_read')
def get_suppliers():
    """Get list of suppliers with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    query = Supplier.query
    
    if search:
        query = query.filter(or_(
            Supplier.name.contains(search),
            Supplier.supplier_number.contains(search),
            Supplier.email.contains(search)
        ))
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == (is_active.lower() == 'true'))
    
    suppliers = query.order_by(Supplier.supplier_number).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    suppliers_data = []
    for supplier in suppliers.items:
        suppliers_data.append({
            'id': supplier.id,
            'supplier_number': supplier.supplier_number,
            'name': supplier.name,
            'name_ar': supplier.name_ar,
            'contact_person': supplier.contact_person,
            'email': supplier.email,
            'phone': supplier.phone,
            'address': supplier.address,
            'payment_terms': supplier.payment_terms,
            'is_active': supplier.is_active,
            'created_at': supplier.created_at.isoformat()
        })
    
    return jsonify({
        'suppliers': suppliers_data,
        'total': suppliers.total,
        'pages': suppliers.pages,
        'current_page': page
    })

@suppliers_bp.route('', methods=['POST'])
@check_permission('supplier_create')
def create_supplier():
    """Create a new supplier"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Generate supplier number
    last_supplier = Supplier.query.order_by(Supplier.id.desc()).first()
    supplier_number = f"SUP{(last_supplier.id + 1 if last_supplier else 1):06d}"
    
    supplier = Supplier(
        supplier_number=supplier_number,
        name=data['name'],
        name_ar=data.get('name_ar'),
        contact_person=data.get('contact_person'),
        email=data['email'],
        phone=data.get('phone'),
        address=data.get('address'),
        tax_number=data.get('tax_number'),
        payment_terms=data.get('payment_terms', '30 days')
    )
    
    db.session.add(supplier)
    db.session.commit()
    
    log_audit_trail('suppliers', supplier.id, 'INSERT', new_values={
        'supplier_number': supplier.supplier_number,
        'name': supplier.name,
        'email': supplier.email
    })
    
    return jsonify({
        'id': supplier.id,
        'supplier_number': supplier.supplier_number,
        'name': supplier.name,
        'message': 'Supplier created successfully'
    }), 201