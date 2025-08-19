# backend/api/cost_centers.py - Cost Center Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func
from models import db, CostCenter, Project
from utils.decorators import check_permission
from services.audit_service import log_audit_trail

cost_centers_bp = Blueprint('cost_centers', __name__)

@cost_centers_bp.route('', methods=['GET'])
@check_permission('cost_center_read')
def get_cost_centers():
    """Get list of cost centers with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    
    query = CostCenter.query
    
    if search:
        query = query.filter(or_(
            CostCenter.name.contains(search),
            CostCenter.code.contains(search),
            CostCenter.description.contains(search)
        ))
    
    if is_active is not None:
        is_active_bool = is_active.lower() == 'true'
        query = query.filter(CostCenter.is_active == is_active_bool)
    
    cost_centers = query.order_by(CostCenter.code).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    cost_centers_data = []
    for cost_center in cost_centers.items:
        # Count active projects
        active_projects_count = Project.query.filter_by(
            cost_center_id=cost_center.id, 
            is_active=True
        ).count()
        
        cost_centers_data.append({
            'id': cost_center.id,
            'code': cost_center.code,
            'name': cost_center.name,
            'name_ar': cost_center.name_ar,
            'description': cost_center.description,
            'active_projects_count': active_projects_count,
            'is_active': cost_center.is_active,
            'created_at': cost_center.created_at.isoformat()
        })
    
    return jsonify({
        'cost_centers': cost_centers_data,
        'total': cost_centers.total,
        'pages': cost_centers.pages,
        'current_page': page
    })

@cost_centers_bp.route('', methods=['POST'])
@check_permission('cost_center_create')
def create_cost_center():
    """Create a new cost center"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'message': 'Name is required'}), 400
    
    # Generate cost center code
    last_cost_center = CostCenter.query.order_by(CostCenter.id.desc()).first()
    cost_center_code = f"CC{(last_cost_center.id + 1 if last_cost_center else 1):03d}"
    
    # Check if code already exists
    if CostCenter.query.filter_by(code=cost_center_code).first():
        return jsonify({'message': 'Cost center code already exists'}), 400
    
    cost_center = CostCenter(
        code=cost_center_code,
        name=data['name'],
        name_ar=data.get('name_ar'),
        description=data.get('description')
    )
    
    db.session.add(cost_center)
    db.session.commit()
    
    log_audit_trail('cost_centers', cost_center.id, 'INSERT', new_values={
        'code': cost_center.code,
        'name': cost_center.name
    })
    
    return jsonify({
        'id': cost_center.id,
        'code': cost_center.code,
        'name': cost_center.name,
        'message': 'Cost center created successfully'
    }), 201

@cost_centers_bp.route('/<int:cost_center_id>', methods=['PUT'])
@check_permission('cost_center_update')
def update_cost_center(cost_center_id):
    """Update an existing cost center"""
    cost_center = CostCenter.query.get_or_404(cost_center_id)
    
    old_values = {
        'name': cost_center.name,
        'name_ar': cost_center.name_ar,
        'description': cost_center.description
    }
    
    data = request.get_json()
    
    if 'name' in data:
        cost_center.name = data['name']
    if 'name_ar' in data:
        cost_center.name_ar = data['name_ar']
    if 'description' in data:
        cost_center.description = data['description']
    if 'is_active' in data:
        cost_center.is_active = data['is_active']
    
    db.session.commit()
    
    new_values = {
        'name': cost_center.name,
        'name_ar': cost_center.name_ar,
        'description': cost_center.description
    }
    
    log_audit_trail('cost_centers', cost_center.id, 'UPDATE', 
                   old_values=old_values, new_values=new_values)
    
    return jsonify({
        'id': cost_center.id,
        'code': cost_center.code,
        'name': cost_center.name,
        'message': 'Cost center updated successfully'
    })

@cost_centers_bp.route('/<int:cost_center_id>', methods=['DELETE'])
@check_permission('cost_center_delete')
def delete_cost_center(cost_center_id):
    """Delete a cost center (soft delete)"""
    cost_center = CostCenter.query.get_or_404(cost_center_id)
    
    # Check if cost center has active projects
    active_projects = Project.query.filter_by(cost_center_id=cost_center_id, is_active=True).count()
    if active_projects > 0:
        return jsonify({'message': 'Cannot delete cost center with active projects'}), 400
    
    old_values = {
        'code': cost_center.code,
        'name': cost_center.name,
        'is_active': cost_center.is_active
    }
    
    # Soft delete
    cost_center.is_active = False
    db.session.commit()
    
    log_audit_trail('cost_centers', cost_center.id, 'DELETE', old_values=old_values)
    
    return jsonify({'message': 'Cost center deleted successfully'})

@cost_centers_bp.route('/<int:cost_center_id>/projects', methods=['GET'])
@check_permission('cost_center_read')
def get_cost_center_projects(cost_center_id):
    """Get all projects for a cost center"""
    cost_center = CostCenter.query.get_or_404(cost_center_id)
    
    projects = Project.query.filter_by(cost_center_id=cost_center_id).order_by(Project.code).all()
    
    projects_data = []
    for project in projects:
        projects_data.append({
            'id': project.id,
            'code': project.code,
            'name': project.name,
            'description': project.description,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'end_date': project.end_date.isoformat() if project.end_date else None,
            'budget_amount': float(project.budget_amount or 0),
            'is_active': project.is_active
        })
    
    return jsonify({
        'cost_center': {
            'id': cost_center.id,
            'code': cost_center.code,
            'name': cost_center.name
        },
        'projects': projects_data,
        'total_projects': len(projects_data)
    })