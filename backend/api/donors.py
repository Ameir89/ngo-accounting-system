# backend/api/donors.py - Donor Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func
from models import GrantStatus, db, Donor, Grant
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

donors_bp = Blueprint('donors', __name__)

@donors_bp.route('', methods=['GET'])
@check_permission('donor_read')
def get_donors():
    """Get list of donors with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    query = Donor.query
    
    if search:
        query = query.filter(or_(
            Donor.name.contains(search),
            Donor.email.contains(search),
            Donor.contact_person.contains(search)
        ))
    
    if is_active is not None:
        is_active_bool = is_active.lower() == 'true'
        query = query.filter(Donor.is_active == is_active_bool)
    
    donors = query.order_by(Donor.name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    donors_data = []
    for donor in donors.items:
        # Calculate donor statistics
        total_grants = Grant.query.filter_by(donor_id=donor.id).count()
        active_grants = Grant.query.filter_by(donor_id=donor.id, status=GrantStatus.ACTIVE).count()
        total_funding = db.session.query(func.sum(Grant.amount)).filter_by(donor_id=donor.id).scalar() or 0
        
        donors_data.append({
            'id': donor.id,
            'name': donor.name,
            'name_ar': donor.name_ar,
            'contact_person': donor.contact_person,
            'email': donor.email,
            'phone': donor.phone,
            'address': donor.address,
            'total_grants': total_grants,
            'active_grants': active_grants,
            'total_funding': float(total_funding),
            'is_active': donor.is_active,
            'created_at': donor.created_at.isoformat()
        })
    
    return jsonify({
        'donors': donors_data,
        'total': donors.total,
        'pages': donors.pages,
        'current_page': page
    })

@donors_bp.route('', methods=['POST'])
@check_permission('donor_create')
def create_donor():
    """Create a new donor"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'message': 'Name is required'}), 400
    
    # Check if donor already exists
    if Donor.query.filter_by(name=data['name']).first():
        return jsonify({'message': 'Donor with this name already exists'}), 400
    
    donor = Donor(
        name=data['name'],
        name_ar=data.get('name_ar'),
        contact_person=data.get('contact_person'),
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address')
    )
    
    db.session.add(donor)
    db.session.commit()
    
    log_audit_trail('donors', donor.id, 'INSERT', new_values={
        'name': donor.name,
        'email': donor.email
    })
    
    return jsonify({
        'id': donor.id,
        'name': donor.name,
        'email': donor.email,
        'message': 'Donor created successfully'
    }), 201

@donors_bp.route('/<int:donor_id>', methods=['PUT'])
@check_permission('donor_update')
def update_donor(donor_id):
    """Update an existing donor"""
    donor = Donor.query.get_or_404(donor_id)
    
    old_values = {
        'name': donor.name,
        'contact_person': donor.contact_person,
        'email': donor.email,
        'phone': donor.phone
    }
    
    data = request.get_json()
    
    if 'name' in data:
        donor.name = data['name']
    if 'name_ar' in data:
        donor.name_ar = data['name_ar']
    if 'contact_person' in data:
        donor.contact_person = data['contact_person']
    if 'email' in data:
        donor.email = data['email']
    if 'phone' in data:
        donor.phone = data['phone']
    if 'address' in data:
        donor.address = data['address']
    if 'is_active' in data:
        donor.is_active = data['is_active']
    
    db.session.commit()
    
    new_values = {
        'name': donor.name,
        'contact_person': donor.contact_person,
        'email': donor.email,
        'phone': donor.phone
    }
    
    log_audit_trail('donors', donor.id, 'UPDATE', old_values=old_values, new_values=new_values)
    
    return jsonify({
        'id': donor.id,
        'name': donor.name,
        'message': 'Donor updated successfully'
    })

@donors_bp.route('/<int:donor_id>', methods=['DELETE'])
@check_permission('donor_delete')
def delete_donor(donor_id):
    """Delete a donor (soft delete)"""
    donor = Donor.query.get_or_404(donor_id)
    
    # Check if donor has active grants
    active_grants = Grant.query.filter_by(donor_id=donor_id, status=GrantStatus.ACTIVE).count()
    if active_grants > 0:
        return jsonify({'message': 'Cannot delete donor with active grants'}), 400
    
    old_values = {
        'name': donor.name,
        'is_active': donor.is_active
    }
    
    # Soft delete
    donor.is_active = False
    db.session.commit()
    
    log_audit_trail('donors', donor.id, 'DELETE', old_values=old_values)
    
    return jsonify({'message': 'Donor deleted successfully'})

@donors_bp.route('/<int:donor_id>/grants', methods=['GET'])
@check_permission('donor_read')
def get_donor_grants(donor_id):
    """Get all grants for a specific donor"""
    donor = Donor.query.get_or_404(donor_id)
    
    grants = Grant.query.filter_by(donor_id=donor_id).order_by(Grant.start_date.desc()).all()
    
    grants_data = []
    total_funding = 0
    
    for grant in grants:
        grants_data.append({
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'amount': float(grant.amount),
            'currency_code': grant.currency.code,
            'start_date': grant.start_date.isoformat(),
            'end_date': grant.end_date.isoformat(),
            'status': grant.status.value,
            'project_name': grant.project.name if grant.project else None
        })
        total_funding += float(grant.amount)
    
    return jsonify({
        'donor': {
            'id': donor.id,
            'name': donor.name,
            'contact_person': donor.contact_person,
            'email': donor.email
        },
        'grants': grants_data,
        'total_grants': len(grants_data),
        'total_funding': total_funding,
        'active_grants': len([g for g in grants_data if g['status'] == 'active'])
    })