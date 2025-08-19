# backend/api/projects.py - Project Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func
from datetime import datetime, date
from decimal import Decimal
from models import db, Project, CostCenter, Grant, Budget, JournalEntryLine, JournalEntry
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail

projects_bp = Blueprint('projects', __name__)
validator = RequestValidator()

@projects_bp.route('', methods=['GET'])
@check_permission('project_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    search={'type': str},
    is_active={'type': bool},
    cost_center_id={'type': int}
)
def get_projects():
    """Get list of projects with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    is_active = request.args.get('is_active')
    cost_center_id = request.args.get('cost_center_id', type=int)
    
    query = Project.query.join(CostCenter, Project.cost_center_id == CostCenter.id, isouter=True)
    
    if search:
        query = query.filter(or_(
            Project.name.contains(search),
            Project.code.contains(search),
            Project.description.contains(search)
        ))
    
    if is_active is not None:
        query = query.filter(Project.is_active == is_active)
    
    if cost_center_id:
        query = query.filter(Project.cost_center_id == cost_center_id)
    
    projects = query.order_by(Project.code).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    projects_data = []
    for project in projects.items:
        # Calculate project expenses
        total_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            JournalEntryLine.project_id == project.id,
            JournalEntry.is_posted == True
        ).scalar() or Decimal('0')
        
        # Calculate budget utilization
        budget_utilization = 0
        if project.budget_amount and project.budget_amount > 0:
            budget_utilization = (total_expenses / project.budget_amount * 100)
        
        # Project status based on dates
        project_status = 'active'
        if project.end_date and project.end_date < date.today():
            project_status = 'completed'
        elif not project.is_active:
            project_status = 'inactive'
        
        projects_data.append({
            'id': project.id,
            'code': project.code,
            'name': project.name,
            'name_ar': project.name_ar,
            'description': project.description,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'end_date': project.end_date.isoformat() if project.end_date else None,
            'budget_amount': float(project.budget_amount or 0),
            'total_expenses': float(total_expenses),
            'budget_utilization': float(budget_utilization),
            'remaining_budget': float((project.budget_amount or 0) - total_expenses),
            'cost_center_id': project.cost_center_id,
            'cost_center_name': project.cost_center.name if project.cost_center else None,
            'status': project_status,
            'is_active': project.is_active,
            'created_at': project.created_at.isoformat()
        })
    
    return jsonify({
        'projects': projects_data,
        'total': projects.total,
        'pages': projects.pages,
        'current_page': page
    })

@projects_bp.route('', methods=['POST'])
@check_permission('project_create')
def create_project():
    """Create a new project"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'cost_center_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Verify cost center exists
    cost_center = CostCenter.query.get(data['cost_center_id'])
    if not cost_center:
        return jsonify({'message': 'Cost center not found'}), 400
    
    # Generate project code
    last_project = Project.query.filter_by(cost_center_id=data['cost_center_id']).order_by(Project.id.desc()).first()
    project_count = Project.query.filter_by(cost_center_id=data['cost_center_id']).count()
    project_code = f"{cost_center.code}-P{project_count + 1:03d}"
    
    # Check if project code already exists
    if Project.query.filter_by(code=project_code).first():
        return jsonify({'message': 'Project code already exists'}), 400
    
    # Validate dates
    start_date = None
    end_date = None
    if data.get('start_date'):
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if data.get('end_date'):
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        if start_date and end_date < start_date:
            return jsonify({'message': 'End date cannot be before start date'}), 400
    
    project = Project(
        code=project_code,
        name=data['name'],
        name_ar=data.get('name_ar'),
        description=data.get('description'),
        start_date=start_date,
        end_date=end_date,
        budget_amount=Decimal(str(data['budget_amount'])) if data.get('budget_amount') else None,
        cost_center_id=data['cost_center_id']
    )
    
    db.session.add(project)
    db.session.commit()
    
    log_audit_trail('projects', project.id, 'INSERT', new_values={
        'code': project.code,
        'name': project.name,
        'cost_center_id': project.cost_center_id
    })
    
    return jsonify({
        'id': project.id,
        'code': project.code,
        'name': project.name,
        'cost_center_name': project.cost_center.name,
        'message': 'Project created successfully'
    }), 201

@projects_bp.route('/<int:project_id>/expenses', methods=['GET'])
@check_permission('project_read')
def get_project_expenses(project_id):
    """Get detailed expense report for a project"""
    project = Project.query.get_or_404(project_id)
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Build query for expenses
    query = db.session.query(
        JournalEntryLine.account_id,
        func.sum(JournalEntryLine.debit_amount).label('total_amount'),
        func.count(JournalEntryLine.id).label('transaction_count')
    ).join(JournalEntry).filter(
        JournalEntryLine.project_id == project_id,
        JournalEntry.is_posted == True
    )
    
    if start_date:
        query = query.filter(JournalEntry.entry_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(JournalEntry.entry_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    expenses_by_account = query.group_by(JournalEntryLine.account_id).all()
    
    expenses_data = []
    total_expenses = Decimal('0')
    
    for expense in expenses_by_account:
        from models import Account
        account = Account.query.get(expense.account_id)
        amount = expense.total_amount or Decimal('0')
        total_expenses += amount
        
        expenses_data.append({
            'account_id': expense.account_id,
            'account_code': account.code,
            'account_name': account.name,
            'amount': float(amount),
            'transaction_count': expense.transaction_count,
            'percentage_of_total': 0  # Will be calculated after we have total
        })
    
    # Calculate percentages
    for expense in expenses_data:
        if total_expenses > 0:
            expense['percentage_of_total'] = (expense['amount'] / float(total_expenses)) * 100
    
    return jsonify({
        'project': {
            'id': project.id,
            'code': project.code,
            'name': project.name,
            'budget_amount': float(project.budget_amount or 0)
        },
        'total_expenses': float(total_expenses),
        'budget_remaining': float((project.budget_amount or 0) - total_expenses),
        'budget_utilization': float((total_expenses / (project.budget_amount or 1)) * 100) if project.budget_amount else 0,
        'expenses_by_account': expenses_data,
        'period': {
            'start_date': start_date,
            'end_date': end_date
        }
    })
