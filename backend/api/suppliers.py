# backend/api/suppliers.py - Complete Suppliers & Procurement Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func, and_
from datetime import datetime, date
from decimal import Decimal
from models import (
    db, Supplier, PurchaseOrder, PurchaseOrderLine, SupplierInvoice, 
    Payment, Currency, Project, Account, JournalEntry, JournalEntryLine
)
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail

suppliers_bp = Blueprint('suppliers', __name__)
validator = RequestValidator()

# ============================================================================
# SUPPLIERS MANAGEMENT
# ============================================================================

@suppliers_bp.route('', methods=['GET'])
@check_permission('supplier_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    search={'type': str},
    is_active={'type': bool}
)
def get_suppliers():
    """Get list of suppliers with comprehensive information"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    query = Supplier.query
    
    # Apply filters
    if search:
        query = query.filter(or_(
            Supplier.name.ilike(f'%{search}%'),
            Supplier.supplier_number.ilike(f'%{search}%'),
            Supplier.email.ilike(f'%{search}%'),
            Supplier.contact_person.ilike(f'%{search}%')
        ))
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    suppliers = query.order_by(Supplier.supplier_number).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    suppliers_data = []
    for supplier in suppliers.items:
        # Get supplier statistics
        total_orders = PurchaseOrder.query.filter_by(supplier_id=supplier.id).count()
        pending_orders = PurchaseOrder.query.filter_by(supplier_id=supplier.id, status='pending').count()
        total_invoices = SupplierInvoice.query.filter_by(supplier_id=supplier.id).count()
        
        # Calculate total purchase amount
        total_purchases = db.session.query(func.sum(PurchaseOrder.total_amount)).filter_by(
            supplier_id=supplier.id
        ).scalar() or Decimal('0')
        
        # Calculate outstanding balance
        outstanding_balance = db.session.query(
            func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)
        ).filter_by(supplier_id=supplier.id, status='pending').scalar() or Decimal('0')
        
        suppliers_data.append({
            'id': supplier.id,
            'supplier_number': supplier.supplier_number,
            'name': supplier.name,
            'name_ar': supplier.name_ar,
            'contact_info': {
                'contact_person': supplier.contact_person,
                'email': supplier.email,
                'phone': supplier.phone,
                'address': supplier.address
            },
            'business_info': {
                'tax_number': supplier.tax_number,
                'payment_terms': supplier.payment_terms
            },
            'statistics': {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'total_invoices': total_invoices,
                'total_purchases': float(total_purchases),
                'outstanding_balance': float(outstanding_balance)
            },
            'is_active': supplier.is_active,
            'created_at': supplier.created_at.isoformat()
        })
    
    return jsonify({
        'suppliers': suppliers_data,
        'pagination': {
            'total': suppliers.total,
            'pages': suppliers.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': suppliers.has_next,
            'has_prev': suppliers.has_prev
        }
    })

@suppliers_bp.route('', methods=['POST'])
@check_permission('supplier_create')
def create_supplier():
    """Create a new supplier with comprehensive validation"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    
    # Check for duplicate email
    if Supplier.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Supplier with this email already exists'}), 400
    
    # Generate supplier number
    last_supplier = Supplier.query.order_by(Supplier.id.desc()).first()
    supplier_number = f"SUP{(last_supplier.id + 1 if last_supplier else 1):06d}"
    
    # Check for duplicate supplier number
    while Supplier.query.filter_by(supplier_number=supplier_number).first():
        supplier_count = Supplier.query.count()
        supplier_number = f"SUP{supplier_count + 1:06d}"
    
    try:
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
            'email': supplier.email,
            'message': 'Supplier created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create supplier',
            'error': str(e)
        }), 500

@suppliers_bp.route('/<int:supplier_id>', methods=['PUT'])
@check_permission('supplier_update')
def update_supplier(supplier_id):
    """Update supplier information"""
    supplier = Supplier.query.get_or_404(supplier_id)
    
    old_values = {
        'name': supplier.name,
        'email': supplier.email,
        'contact_person': supplier.contact_person,
        'phone': supplier.phone,
        'payment_terms': supplier.payment_terms
    }
    
    data = request.get_json()
    
    # Validate email if provided
    if 'email' in data and data['email']:
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['email']):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Check for duplicate email (excluding current supplier)
        existing_supplier = Supplier.query.filter(
            Supplier.email == data['email'],
            Supplier.id != supplier_id
        ).first()
        if existing_supplier:
            return jsonify({'message': 'Email already exists for another supplier'}), 400
    
    # Update fields
    updatable_fields = [
        'name', 'name_ar', 'contact_person', 'email', 'phone', 
        'address', 'tax_number', 'payment_terms', 'is_active'
    ]
    
    for field in updatable_fields:
        if field in data:
            setattr(supplier, field, data[field])
    
    try:
        db.session.commit()
        
        new_values = {
            'name': supplier.name,
            'email': supplier.email,
            'contact_person': supplier.contact_person,
            'phone': supplier.phone,
            'payment_terms': supplier.payment_terms
        }
        
        log_audit_trail('suppliers', supplier.id, 'UPDATE', 
                       old_values=old_values, new_values=new_values)
        
        return jsonify({
            'id': supplier.id,
            'supplier_number': supplier.supplier_number,
            'name': supplier.name,
            'message': 'Supplier updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update supplier',
            'error': str(e)
        }), 500

@suppliers_bp.route('/<int:supplier_id>', methods=['DELETE'])
@check_permission('supplier_delete')
def delete_supplier(supplier_id):
    """Soft delete supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Check if supplier has pending orders or invoices
    pending_orders = PurchaseOrder.query.filter_by(supplier_id=supplier_id, status='pending').count()
    pending_invoices = SupplierInvoice.query.filter_by(supplier_id=supplier_id, status='pending').count()
    
    if pending_orders > 0 or pending_invoices > 0:
        return jsonify({
            'message': 'Cannot delete supplier with pending orders or invoices',
            'pending_orders': pending_orders,
            'pending_invoices': pending_invoices
        }), 400
    
    old_values = {
        'supplier_number': supplier.supplier_number,
        'name': supplier.name,
        'is_active': supplier.is_active
    }
    
    try:
        # Soft delete
        supplier.is_active = False
        db.session.commit()
        
        log_audit_trail('suppliers', supplier.id, 'DELETE', old_values=old_values)
        
        return jsonify({'message': 'Supplier deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to delete supplier',
            'error': str(e)
        }), 500

# ============================================================================
# PURCHASE ORDERS MANAGEMENT
# ============================================================================

@suppliers_bp.route('/<int:supplier_id>/purchase-orders', methods=['GET'])
@check_permission('supplier_read')
def get_supplier_purchase_orders(supplier_id):
    """Get all purchase orders for a supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    
    orders = PurchaseOrder.query.filter_by(supplier_id=supplier_id).order_by(
        PurchaseOrder.order_date.desc()
    ).all()
    
    orders_data = []
    for order in orders:
        orders_data.append({
            'id': order.id,
            'po_number': order.po_number,
            'order_date': order.order_date.isoformat(),
            'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
            'total_amount': float(order.total_amount),
            'currency_code': order.currency.code,
            'status': order.status,
            'notes': order.notes,
            'lines_count': len(order.lines),
            'created_at': order.created_at.isoformat()
        })
    
    return jsonify({
        'supplier': {
            'id': supplier.id,
            'supplier_number': supplier.supplier_number,
            'name': supplier.name
        },
        'purchase_orders': orders_data,
        'total_orders': len(orders_data)
    })

@suppliers_bp.route('/purchase-orders', methods=['POST'])
@check_permission('purchase_order_create')
def create_purchase_order():
    """Create a new purchase order"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['supplier_id', 'order_date', 'lines']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate supplier
    supplier = Supplier.query.get(data['supplier_id'])
    if not supplier or not supplier.is_active:
        return jsonify({'message': 'Invalid or inactive supplier'}), 400
    
    # Validate date
    try:
        order_date = datetime.strptime(data['order_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid order date format. Use YYYY-MM-DD'}), 400
    
    delivery_date = None
    if data.get('delivery_date'):
        try:
            delivery_date = datetime.strptime(data['delivery_date'], '%Y-%m-%d').date()
            if delivery_date <= order_date:
                return jsonify({'message': 'Delivery date must be after order date'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid delivery date format. Use YYYY-MM-DD'}), 400
    
    # Validate lines
    if not data['lines'] or len(data['lines']) == 0:
        return jsonify({'message': 'Purchase order must have at least one line'}), 400
    
    # Validate currency
    currency_id = data.get('currency_id', 1)  # Default to base currency
    currency = Currency.query.get(currency_id)
    if not currency:
        return jsonify({'message': 'Invalid currency'}), 400
    
    # Generate PO number
    year_month = order_date.strftime('%Y%m')
    po_count = PurchaseOrder.query.filter(
        PurchaseOrder.po_number.like(f'PO{year_month}%')
    ).count()
    po_number = f"PO{year_month}{po_count + 1:04d}"
    
    try:
        # Create purchase order
        purchase_order = PurchaseOrder(
            po_number=po_number,
            supplier_id=data['supplier_id'],
            order_date=order_date,
            delivery_date=delivery_date,
            currency_id=currency_id,
            status='pending',
            notes=data.get('notes')
        )
        
        db.session.add(purchase_order)
        db.session.flush()  # Get the ID
        
        # Create purchase order lines
        total_amount = Decimal('0')
        line_number = 1
        
        for line_data in data['lines']:
            if not line_data.get('description') or not line_data.get('quantity') or not line_data.get('unit_price'):
                return jsonify({'message': f'Line {line_number}: description, quantity, and unit_price are required'}), 400
            
            quantity = Decimal(str(line_data['quantity']))
            unit_price = Decimal(str(line_data['unit_price']))
            line_total = quantity * unit_price
            
            po_line = PurchaseOrderLine(
                purchase_order_id=purchase_order.id,
                description=line_data['description'],
                quantity=quantity,
                unit_price=unit_price,
                total_amount=line_total,
                line_number=line_number
            )
            
            db.session.add(po_line)
            total_amount += line_total
            line_number += 1
        
        # Update total amount
        purchase_order.total_amount = total_amount
        
        db.session.commit()
        
        log_audit_trail('purchase_orders', purchase_order.id, 'INSERT', new_values={
            'po_number': purchase_order.po_number,
            'supplier_id': purchase_order.supplier_id,
            'total_amount': float(purchase_order.total_amount)
        })
        
        return jsonify({
            'id': purchase_order.id,
            'po_number': purchase_order.po_number,
            'supplier_name': supplier.name,
            'total_amount': float(purchase_order.total_amount),
            'currency_code': currency.code,
            'status': purchase_order.status,
            'message': 'Purchase order created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create purchase order',
            'error': str(e)
        }), 500

@suppliers_bp.route('/purchase-orders/<int:po_id>', methods=['GET'])
@check_permission('purchase_order_read')
def get_purchase_order(po_id):
    """Get detailed purchase order information"""
    po = PurchaseOrder.query.get_or_404(po_id)
    
    lines_data = []
    for line in po.lines:
        lines_data.append({
            'id': line.id,
            'description': line.description,
            'quantity': float(line.quantity),
            'unit_price': float(line.unit_price),
            'total_amount': float(line.total_amount),
            'line_number': line.line_number
        })
    
    return jsonify({
        'purchase_order': {
            'id': po.id,
            'po_number': po.po_number,
            'supplier': {
                'id': po.supplier.id,
                'name': po.supplier.name,
                'supplier_number': po.supplier.supplier_number
            },
            'order_date': po.order_date.isoformat(),
            'delivery_date': po.delivery_date.isoformat() if po.delivery_date else None,
            'total_amount': float(po.total_amount),
            'currency': {
                'id': po.currency.id,
                'code': po.currency.code,
                'symbol': po.currency.symbol
            },
            'status': po.status,
            'notes': po.notes,
            'created_at': po.created_at.isoformat()
        },
        'lines': lines_data
    })

@suppliers_bp.route('/purchase-orders/<int:po_id>/status', methods=['PUT'])
@check_permission('purchase_order_update')
def update_purchase_order_status(po_id):
    """Update purchase order status"""
    po = PurchaseOrder.query.get_or_404(po_id)
    data = request.get_json()
    
    if 'status' not in data:
        return jsonify({'message': 'Status is required'}), 400
    
    valid_statuses = ['pending', 'approved', 'ordered', 'received', 'cancelled']
    if data['status'] not in valid_statuses:
        return jsonify({
            'message': 'Invalid status',
            'valid_statuses': valid_statuses
        }), 400
    
    old_status = po.status
    po.status = data['status']
    
    try:
        db.session.commit()
        
        log_audit_trail('purchase_orders', po.id, 'UPDATE', 
                       old_values={'status': old_status}, 
                       new_values={'status': po.status})
        
        return jsonify({
            'id': po.id,
            'po_number': po.po_number,
            'status': po.status,
            'message': 'Purchase order status updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update purchase order status',
            'error': str(e)
        }), 500

# ============================================================================
# SUPPLIER INVOICES MANAGEMENT
# ============================================================================

@suppliers_bp.route('/<int:supplier_id>/invoices', methods=['GET'])
@check_permission('supplier_read')
def get_supplier_invoices(supplier_id):
    """Get all invoices for a supplier"""
    supplier = Supplier.query.get_or_404(supplier_id)
    
    invoices = SupplierInvoice.query.filter_by(supplier_id=supplier_id).order_by(
        SupplierInvoice.invoice_date.desc()
    ).all()
    
    invoices_data = []
    for invoice in invoices:
        invoices_data.append({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'invoice_date': invoice.invoice_date.isoformat(),
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'total_amount': float(invoice.total_amount),
            'paid_amount': float(invoice.paid_amount),
            'outstanding_amount': float(invoice.total_amount - invoice.paid_amount),
            'currency_code': invoice.currency.code,
            'status': invoice.status,
            'days_overdue': (date.today() - invoice.due_date).days if invoice.due_date and date.today() > invoice.due_date and invoice.status == 'pending' else 0,
            'created_at': invoice.created_at.isoformat()
        })
    
    # Calculate summary statistics
    total_invoices = len(invoices_data)
    total_amount = sum(inv['total_amount'] for inv in invoices_data)
    total_paid = sum(inv['paid_amount'] for inv in invoices_data)
    total_outstanding = total_amount - total_paid
    overdue_invoices = len([inv for inv in invoices_data if inv['days_overdue'] > 0])
    
    return jsonify({
        'supplier': {
            'id': supplier.id,
            'supplier_number': supplier.supplier_number,
            'name': supplier.name
        },
        'invoices': invoices_data,
        'summary': {
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'total_paid': total_paid,
            'total_outstanding': total_outstanding,
            'overdue_invoices': overdue_invoices
        }
    })

@suppliers_bp.route('/invoices', methods=['POST'])
@check_permission('supplier_invoice_create')
def create_supplier_invoice():
    """Create a new supplier invoice"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['supplier_id', 'invoice_number', 'invoice_date', 'total_amount']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate supplier
    supplier = Supplier.query.get(data['supplier_id'])
    if not supplier or not supplier.is_active:
        return jsonify({'message': 'Invalid or inactive supplier'}), 400
    
    # Check for duplicate invoice number for this supplier
    existing_invoice = SupplierInvoice.query.filter_by(
        supplier_id=data['supplier_id'],
        invoice_number=data['invoice_number']
    ).first()
    if existing_invoice:
        return jsonify({'message': 'Invoice number already exists for this supplier'}), 400
    
    # Validate dates
    try:
        invoice_date = datetime.strptime(data['invoice_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid invoice date format. Use YYYY-MM-DD'}), 400
    
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            if due_date <= invoice_date:
                return jsonify({'message': 'Due date must be after invoice date'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid due date format. Use YYYY-MM-DD'}), 400
    
    # Validate amount
    try:
        total_amount = Decimal(str(data['total_amount']))
        if total_amount <= 0:
            raise ValueError("Amount must be positive")
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid total amount'}), 400
    
    # Validate currency
    currency_id = data.get('currency_id', 1)  # Default to base currency
    currency = Currency.query.get(currency_id)
    if not currency:
        return jsonify({'message': 'Invalid currency'}), 400
    
    try:
        invoice = SupplierInvoice(
            supplier_id=data['supplier_id'],
            invoice_number=data['invoice_number'],
            invoice_date=invoice_date,
            due_date=due_date,
            total_amount=total_amount,
            paid_amount=Decimal('0'),
            currency_id=currency_id,
            status='pending',
            notes=data.get('notes')
        )
        
        db.session.add(invoice)
        db.session.commit()
        
        log_audit_trail('supplier_invoices', invoice.id, 'INSERT', new_values={
            'supplier_id': invoice.supplier_id,
            'invoice_number': invoice.invoice_number,
            'total_amount': float(invoice.total_amount)
        })
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'supplier_name': supplier.name,
            'total_amount': float(invoice.total_amount),
            'currency_code': currency.code,
            'status': invoice.status,
            'message': 'Supplier invoice created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create supplier invoice',
            'error': str(e)
        }), 500

# ============================================================================
# PAYMENTS MANAGEMENT
# ============================================================================

@suppliers_bp.route('/invoices/<int:invoice_id>/payments', methods=['POST'])
@check_permission('payment_create')
def record_payment(invoice_id):
    """Record a payment for a supplier invoice"""
    invoice = SupplierInvoice.query.get_or_404(invoice_id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['payment_date', 'amount']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate payment date
    try:
        payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid payment date format. Use YYYY-MM-DD'}), 400
    
    # Validate amount
    try:
        payment_amount = Decimal(str(data['amount']))
        if payment_amount <= 0:
            raise ValueError("Amount must be positive")
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid payment amount'}), 400
    
    # Check if payment amount doesn't exceed outstanding balance
    outstanding_balance = invoice.total_amount - invoice.paid_amount
    if payment_amount > outstanding_balance:
        return jsonify({
            'message': 'Payment amount exceeds outstanding balance',
            'outstanding_balance': float(outstanding_balance)
        }), 400
    
    # Generate payment number
    payment_count = Payment.query.count()
    payment_number = f"PAY{payment_count + 1:06d}"
    
    try:
        # Create payment record
        payment = Payment(
            payment_number=payment_number,
            invoice_id=invoice_id,
            payment_date=payment_date,
            amount=payment_amount,
            payment_method=data.get('payment_method', 'bank_transfer'),
            reference_number=data.get('reference_number'),
            notes=data.get('notes')
        )
        
        db.session.add(payment)
        
        # Update invoice paid amount
        invoice.paid_amount += payment_amount
        
        # Update invoice status
        if invoice.paid_amount >= invoice.total_amount:
            invoice.status = 'paid'
        else:
            invoice.status = 'partial'
        
        db.session.commit()
        
        log_audit_trail('payments', payment.id, 'INSERT', new_values={
            'payment_number': payment.payment_number,
            'invoice_id': payment.invoice_id,
            'amount': float(payment.amount)
        })
        
        return jsonify({
            'payment': {
                'id': payment.id,
                'payment_number': payment.payment_number,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.isoformat(),
                'payment_method': payment.payment_method
            },
            'invoice': {
                'id': invoice.id,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'outstanding_balance': float(invoice.total_amount - invoice.paid_amount),
                'status': invoice.status
            },
            'message': 'Payment recorded successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to record payment',
            'error': str(e)
        }), 500

@suppliers_bp.route('/invoices/<int:invoice_id>/payments', methods=['GET'])
@check_permission('payment_read')
def get_invoice_payments(invoice_id):
    """Get all payments for an invoice"""
    invoice = SupplierInvoice.query.get_or_404(invoice_id)
    
    payments = Payment.query.filter_by(invoice_id=invoice_id).order_by(
        Payment.payment_date.desc()
    ).all()
    
    payments_data = []
    for payment in payments:
        payments_data.append({
            'id': payment.id,
            'payment_number': payment.payment_number,
            'payment_date': payment.payment_date.isoformat(),
            'amount': float(payment.amount),
            'payment_method': payment.payment_method,
            'reference_number': payment.reference_number,
            'notes': payment.notes,
            'created_at': payment.created_at.isoformat()
        })
    
    return jsonify({
        'invoice': {
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'supplier_name': invoice.supplier.name,
            'total_amount': float(invoice.total_amount),
            'paid_amount': float(invoice.paid_amount),
            'outstanding_balance': float(invoice.total_amount - invoice.paid_amount)
        },
        'payments': payments_data,
        'total_payments': len(payments_data),
        'total_paid': float(invoice.paid_amount)
    })

# ============================================================================
# ANALYTICS AND REPORTING
# ============================================================================

@suppliers_bp.route('/analytics/summary', methods=['GET'])
@check_permission('supplier_read')
def get_suppliers_analytics():
    """Get comprehensive supplier analytics"""
    
    # Overall statistics
    total_suppliers = Supplier.query.count()
    active_suppliers = Supplier.query.filter_by(is_active=True).count()
    
    # Financial summary
    total_orders_amount = db.session.query(func.sum(PurchaseOrder.total_amount)).scalar() or Decimal('0')
    total_invoices_amount = db.session.query(func.sum(SupplierInvoice.total_amount)).scalar() or Decimal('0')
    total_paid_amount = db.session.query(func.sum(SupplierInvoice.paid_amount)).scalar() or Decimal('0')
    outstanding_balance = total_invoices_amount - total_paid_amount
    
    # Top suppliers by purchase volume
    top_suppliers = db.session.query(
        Supplier.name,
        func.sum(PurchaseOrder.total_amount).label('total_purchases')
    ).join(PurchaseOrder).group_by(Supplier.name).order_by(
        func.sum(PurchaseOrder.total_amount).desc()
    ).limit(10).all()
    
    # Overdue invoices
    overdue_invoices = db.session.query(func.count(SupplierInvoice.id)).filter(
        and_(
            SupplierInvoice.due_date < date.today(),
            SupplierInvoice.status == 'pending'
        )
    ).scalar() or 0
    
    overdue_amount = db.session.query(
        func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)
    ).filter(
        and_(
            SupplierInvoice.due_date < date.today(),
            SupplierInvoice.status == 'pending'
        )
    ).scalar() or Decimal('0')
    
    # Recent activity
    recent_orders = PurchaseOrder.query.order_by(
        PurchaseOrder.created_at.desc()
    ).limit(5).all()
    
    recent_payments = Payment.query.join(SupplierInvoice).order_by(
        Payment.created_at.desc()
    ).limit(5).all()
    
    return jsonify({
        'overview': {
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers,
            'inactive_suppliers': total_suppliers - active_suppliers
        },
        'financial_summary': {
            'total_orders_amount': float(total_orders_amount),
            'total_invoices_amount': float(total_invoices_amount),
            'total_paid_amount': float(total_paid_amount),
            'outstanding_balance': float(outstanding_balance),
            'payment_ratio': (float(total_paid_amount) / float(total_invoices_amount) * 100) if total_invoices_amount > 0 else 0
        },
        'top_suppliers': [
            {
                'name': supplier.name,
                'total_purchases': float(supplier.total_purchases)
            }
            for supplier in top_suppliers
        ],
        'overdue_invoices': {
            'count': overdue_invoices,
            'total_amount': float(overdue_amount)
        },
        'recent_activity': {
            'recent_orders': [
                {
                    'po_number': order.po_number,
                    'supplier_name': order.supplier.name,
                    'amount': float(order.total_amount),
                    'order_date': order.order_date.isoformat()
                }
                for order in recent_orders
            ],
            'recent_payments': [
                {
                    'payment_number': payment.payment_number,
                    'supplier_name': payment.invoice.supplier.name,
                    'amount': float(payment.amount),
                    'payment_date': payment.payment_date.isoformat()
                }
                for payment in recent_payments
            ]
        },
        'generated_at': datetime.utcnow().isoformat()
    })