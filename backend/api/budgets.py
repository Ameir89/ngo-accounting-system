# backend/api/budgets.py - Budget Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, func, and_
from datetime import datetime, date
from decimal import Decimal
from models import (
    db, Budget, BudgetLine, Project, Account, CostCenter, 
    JournalEntry, JournalEntryLine, AccountType
)
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail
from services.financial_calculations import FinancialCalculationService

budgets_bp = Blueprint('budgets', __name__)
validator = RequestValidator()

@budgets_bp.route('', methods=['GET'])
@check_permission('budget_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    budget_year={'type': int},
    project_id={'type': int},
    is_active={'type': bool}
)
def get_budgets():
    """Get list of budgets with pagination and filtering"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    budget_year = request.args.get('budget_year', type=int)
    project_id = request.args.get('project_id', type=int)
    is_active = request.args.get('is_active')
    
    query = Budget.query.join(Project, Budget.project_id == Project.id, isouter=True)
    
    if budget_year:
        query = query.filter(Budget.budget_year == budget_year)
    
    if project_id:
        query = query.filter(Budget.project_id == project_id)
    
    if is_active is not None:
        query = query.filter(Budget.is_active == is_active)
    
    budgets = query.order_by(Budget.budget_year.desc(), Budget.name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    budgets_data = []
    for budget in budgets.items:
        # Calculate actual expenses for budget period
        actual_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            and_(
                JournalEntryLine.project_id == budget.project_id,
                JournalEntry.entry_date.between(budget.start_date, budget.end_date),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        # Calculate variance
        variance = float(budget.total_budget) - float(actual_expenses)
        variance_percentage = (variance / float(budget.total_budget) * 100) if budget.total_budget > 0 else 0
        
        budgets_data.append({
            'id': budget.id,
            'name': budget.name,
            'name_ar': budget.name_ar,
            'description': budget.description,
            'budget_year': budget.budget_year,
            'project_id': budget.project_id,
            'project_name': budget.project.name if budget.project else None,
            'start_date': budget.start_date.isoformat(),
            'end_date': budget.end_date.isoformat(),
            'total_budget': float(budget.total_budget),
            'actual_expenses': float(actual_expenses),
            'variance': variance,
            'variance_percentage': variance_percentage,
            'budget_lines_count': len(budget.lines),
            'is_active': budget.is_active,
            'created_at': budget.created_at.isoformat()
        })
    
    return jsonify({
        'budgets': budgets_data,
        'total': budgets.total,
        'pages': budgets.pages,
        'current_page': page
    })

@budgets_bp.route('', methods=['POST'])
@check_permission('budget_create')
def create_budget():
    """Create a new budget"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'budget_year', 'start_date', 'end_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    # Validate dates
    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    
    if end_date <= start_date:
        return jsonify({'message': 'End date must be after start date'}), 400
    
    # Check if project exists if specified
    if data.get('project_id'):
        project = Project.query.get(data['project_id'])
        if not project:
            return jsonify({'message': 'Project not found'}), 400
    
    budget = Budget(
        name=data['name'],
        name_ar=data.get('name_ar'),
        description=data.get('description'),
        budget_year=data['budget_year'],
        project_id=data.get('project_id'),
        start_date=start_date,
        end_date=end_date,
        total_budget=Decimal('0')  # Will be calculated from budget lines
    )
    
    db.session.add(budget)
    db.session.flush()  # Get the ID
    
    # Create budget lines if provided
    if data.get('budget_lines'):
        total_budget = Decimal('0')
        for line_data in data['budget_lines']:
            # Validate account exists
            account = Account.query.get(line_data['account_id'])
            if not account:
                return jsonify({'message': f'Account {line_data["account_id"]} not found'}), 400
            
            budget_line = BudgetLine(
                budget_id=budget.id,
                account_id=line_data['account_id'],
                cost_center_id=line_data.get('cost_center_id'),
                budgeted_amount=Decimal(str(line_data['budgeted_amount'])),
                period_month=line_data.get('period_month'),
                notes=line_data.get('notes')
            )
            db.session.add(budget_line)
            total_budget += budget_line.budgeted_amount
        
        budget.total_budget = total_budget
    
    db.session.commit()
    
    log_audit_trail('budgets', budget.id, 'INSERT', new_values={
        'name': budget.name,
        'budget_year': budget.budget_year,
        'total_budget': float(budget.total_budget)
    })
    
    return jsonify({
        'id': budget.id,
        'name': budget.name,
        'budget_year': budget.budget_year,
        'total_budget': float(budget.total_budget),
        'message': 'Budget created successfully'
    }), 201

@budgets_bp.route('/<int:budget_id>/lines', methods=['GET'])
@check_permission('budget_read')
def get_budget_lines(budget_id):
    """Get budget lines for a specific budget"""
    budget = Budget.query.get_or_404(budget_id)
    
    budget_lines = BudgetLine.query.filter_by(budget_id=budget_id).join(Account).all()
    
    lines_data = []
    for line in budget_lines:
        # Calculate actual expenses for this account and budget period
        actual_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            and_(
                JournalEntryLine.account_id == line.account_id,
                JournalEntryLine.project_id == budget.project_id if budget.project_id else True,
                JournalEntry.entry_date.between(budget.start_date, budget.end_date),
                JournalEntry.is_posted == True
            )
        ).scalar() or Decimal('0')
        
        variance = float(line.budgeted_amount) - float(actual_expenses)
        
        lines_data.append({
            'id': line.id,
            'account_id': line.account_id,
            'account_code': line.account.code,
            'account_name': line.account.name,
            'cost_center_id': line.cost_center_id,
            'cost_center_name': line.cost_center.name if line.cost_center else None,
            'budgeted_amount': float(line.budgeted_amount),
            'actual_expenses': float(actual_expenses),
            'variance': variance,
            'variance_percentage': (variance / float(line.budgeted_amount) * 100) if line.budgeted_amount > 0 else 0,
            'period_month': line.period_month,
            'notes': line.notes
        })
    
    return jsonify({
        'budget': {
            'id': budget.id,
            'name': budget.name,
            'budget_year': budget.budget_year,
            'total_budget': float(budget.total_budget)
        },
        'budget_lines': lines_data,
        'total_lines': len(lines_data)
    })

@budgets_bp.route('/<int:budget_id>/variance-analysis', methods=['GET'])
@check_permission('budget_read')
def get_budget_variance_analysis(budget_id):
    """Get detailed variance analysis for a budget"""
    budget = Budget.query.get_or_404(budget_id)
    
    # Get all budget lines with actual vs budgeted analysis
    budget_lines = BudgetLine.query.filter_by(budget_id=budget_id).join(Account).all()
    
    variance_analysis = []
    total_budgeted = Decimal('0')
    total_actual = Decimal('0')
    
    for line in budget_lines:
        # Get actual expenses for this account in the budget period
        actual_query = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            JournalEntryLine.account_id == line.account_id,
            JournalEntry.entry_date.between(budget.start_date, budget.end_date),
            JournalEntry.is_posted == True
        )
        
        # Add project filter if budget is project-specific
        if budget.project_id:
            actual_query = actual_query.filter(JournalEntryLine.project_id == budget.project_id)
        
        # Add cost center filter if line is cost center-specific
        if line.cost_center_id:
            actual_query = actual_query.filter(JournalEntryLine.cost_center_id == line.cost_center_id)
        
        actual_expenses = actual_query.scalar() or Decimal('0')
        
        # Calculate variance
        variance_analysis_line = FinancialCalculationService.calculate_budget_variance(
            actual_expenses, line.budgeted_amount
        )
        
        variance_analysis_line.update({
            'account_id': line.account_id,
            'account_code': line.account.code,
            'account_name': line.account.name,
            'cost_center_name': line.cost_center.name if line.cost_center else None,
            'period_month': line.period_month
        })
        
        variance_analysis.append(variance_analysis_line)
        total_budgeted += line.budgeted_amount
        total_actual += actual_expenses
    
    # Overall budget performance
    overall_variance = FinancialCalculationService.calculate_budget_variance(
        total_actual, total_budgeted
    )
    
    return jsonify({
        'budget': {
            'id': budget.id,
            'name': budget.name,
            'budget_year': budget.budget_year,
            'period': f"{budget.start_date} to {budget.end_date}"
        },
        'overall_performance': overall_variance,
        'line_item_analysis': variance_analysis,
        'summary': {
            'total_budget_lines': len(variance_analysis),
            'favorable_variances': len([v for v in variance_analysis if v['variance_type'] == 'favorable']),
            'unfavorable_variances': len([v for v in variance_analysis if v['variance_type'] == 'unfavorable'])
        }
    })