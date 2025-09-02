# backend/api/grants.py - Complete Grant Management API
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import func, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal
from models import (
    db, Grant, GrantStatus, Donor, Project, Currency, 
    JournalEntryLine, JournalEntry, Account, AccountType
)
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.audit_service import log_audit_trail
from services.financial_calculations import FinancialCalculationService

grants_bp = Blueprint('grants', __name__)
validator = RequestValidator()

@grants_bp.route('', methods=['GET'])
@check_permission('grant_read')
@validator.validate_query_params(
    page={'type': int, 'min': 1},
    per_page={'type': int, 'min': 1, 'max': 100},
    status={'type': str, 'choices': ['active', 'expired', 'completed']},
    donor_id={'type': int, 'min': 1},
    search={'type': str}
)
def get_grants():
    """Get list of grants with comprehensive filtering and pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    donor_id = request.args.get('donor_id', type=int)
    search = request.args.get('search')
    
    # Optimized query with joins to reduce N+1 queries
    query = Grant.query.join(Donor).join(Currency).outerjoin(Project)
    
    # Apply filters
    # if status:
    #     query = query.filter(Grant.status == GrantStatus(status.upper()))
    # Apply filters
    if status:
        # Map lowercase input to Enum by name
        try:
            query = query.filter(Grant.status == GrantStatus[status.upper()])
        except KeyError:
            return jsonify({"error": f"Invalid status '{status}'"}), 400
        
    if donor_id:
        query = query.filter(Grant.donor_id == donor_id)
    if search:
        query = query.filter(or_(
            Grant.title.ilike(f'%{search}%'),
            Grant.grant_number.ilike(f'%{search}%'),
            Donor.name.ilike(f'%{search}%')
        ))
    
    grants = query.order_by(Grant.start_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    grants_data = []
    for grant in grants.items:
        # Calculate utilization efficiently with subquery
        total_expenses = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
            JournalEntry
        ).filter(
            and_(
                JournalEntryLine.project_id == grant.project_id if grant.project_id else False,
                JournalEntry.is_posted == True,
                JournalEntry.entry_date.between(grant.start_date, grant.end_date)
            )
        ).scalar() or Decimal('0')
        
        utilization_percentage = (float(total_expenses) / float(grant.amount) * 100) if grant.amount > 0 else 0
        days_remaining = (grant.end_date - date.today()).days
        
        # Determine grant status
        # grant_status = grant.status.value
        grant_status = grant.status.value if grant.status else None
        if grant.end_date < date.today() and grant.status == GrantStatus.ACTIVE:
            grant_status = 'expired'
        
        grants_data.append({
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'title_ar': grant.title_ar,
            'donor': {
                'id': grant.donor.id,
                'name': grant.donor.name,
                'name_ar': grant.donor.name_ar
            },
            'project': {
                'id': grant.project.id,
                'name': grant.project.name,
                'code': grant.project.code
            } if grant.project else None,
            'financial': {
                'amount': float(grant.amount),
                'currency_code': grant.currency.code,
                'currency_symbol': grant.currency.symbol,
                'utilized_amount': float(total_expenses),
                'remaining_amount': float(grant.amount - total_expenses),
                'utilization_percentage': round(utilization_percentage, 2)
            },
            'timeline': {
                'start_date': grant.start_date.isoformat(),
                'end_date': grant.end_date.isoformat(),
                'days_remaining': days_remaining,
                'is_expired': days_remaining < 0,
                'expires_soon': 0 <= days_remaining <= 30
            },
            'status': grant_status,
            'conditions': grant.conditions,
            'description': grant.description,
            'created_at': grant.created_at.isoformat()
        })
    
    return jsonify({
        'grants': grants_data,
        'pagination': {
            'total': grants.total,
            'pages': grants.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': grants.has_next,
            'has_prev': grants.has_prev
        },
        'summary': {
            'total_amount': sum(float(g.amount) for g in grants.items),
            'total_utilized': sum(
                float(db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
                    JournalEntry
                ).filter(
                    JournalEntryLine.project_id == g.project_id if g.project_id else False,
                    JournalEntry.is_posted == True
                ).scalar() or 0) for g in grants.items
            )
        }
    })

@grants_bp.route('', methods=['POST'])
@check_permission('grant_create')
def create_grant():
    """Create a new grant with comprehensive validation"""
    data = request.get_json()
    
    # Comprehensive validation
    required_fields = ['title', 'donor_id', 'amount', 'currency_id', 'start_date', 'end_date']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate dates
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if end_date <= start_date:
        return jsonify({'message': 'End date must be after start date'}), 400
    
    # Validate amount
    try:
        amount = Decimal(str(data['amount']))
        if amount <= 0:
            raise ValueError("Amount must be positive")
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid amount format'}), 400
    
    # Validate foreign keys
    donor = Donor.query.get(data['donor_id'])
    if not donor or not donor.is_active:
        return jsonify({'message': 'Invalid or inactive donor'}), 400
    
    currency = Currency.query.get(data['currency_id'])
    if not currency or not currency.is_active:
        return jsonify({'message': 'Invalid or inactive currency'}), 400
    
    if data.get('project_id'):
        project = Project.query.get(data['project_id'])
        if not project or not project.is_active:
            return jsonify({'message': 'Invalid or inactive project'}), 400
    
    # Generate grant number
    year = start_date.year
    grant_count = Grant.query.filter(
        Grant.grant_number.like(f'GR{year}%')
    ).count()
    grant_number = f"GR{year}{grant_count + 1:04d}"
    
    # Check for duplicate grant number
    if Grant.query.filter_by(grant_number=grant_number).first():
        return jsonify({'message': 'Grant number already exists'}), 400
    
    try:
        grant = Grant(
            grant_number=grant_number,
            title=data['title'],
            title_ar=data.get('title_ar'),
            donor_id=data['donor_id'],
            project_id=data.get('project_id'),
            amount=amount,
            currency_id=data['currency_id'],
            start_date=start_date,
            end_date=end_date,
            status=GrantStatus.ACTIVE,
            conditions=data.get('conditions'),
            description=data.get('description')
        )
        
        db.session.add(grant)
        db.session.commit()
        
        log_audit_trail('grants', grant.id, 'INSERT', new_values={
            'grant_number': grant.grant_number,
            'title': grant.title,
            'amount': float(grant.amount),
            'donor_id': grant.donor_id
        })
        
        # Return full grant data
        return jsonify({
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'amount': float(grant.amount),
            'currency_code': grant.currency.code,
            'donor_name': grant.donor.name,
            'start_date': grant.start_date.isoformat(),
            'end_date': grant.end_date.isoformat(),
            'status': grant.status.value,
            'message': 'Grant created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create grant',
            'error': str(e)
        }), 500

@grants_bp.route('/<int:grant_id>', methods=['GET'])
@check_permission('grant_read')
def get_grant(grant_id):
    """Get detailed grant information with utilization analysis"""
    grant = Grant.query.get_or_404(grant_id)
    
    # Get detailed utilization data
    utilization_data = FinancialCalculationService.calculate_grant_utilization(grant_id)
    
    # Get expense breakdown by account
    expenses_by_account = db.session.query(
        Account.id,
        Account.code,
        Account.name,
        func.sum(JournalEntryLine.debit_amount).label('total_amount')
    ).join(JournalEntryLine).join(JournalEntry).filter(
        and_(
            JournalEntryLine.project_id == grant.project_id if grant.project_id else False,
            JournalEntry.is_posted == True,
            JournalEntry.entry_date.between(grant.start_date, grant.end_date)
        )
    ).group_by(Account.id, Account.code, Account.name).all()
    
    expense_breakdown = []
    for expense in expenses_by_account:
        amount = float(expense.total_amount or 0)
        percentage = (amount / float(grant.amount) * 100) if grant.amount > 0 else 0
        
        expense_breakdown.append({
            'account': {
                'id': expense.id,
                'code': expense.code,
                'name': expense.name
            },
            'amount': amount,
            'percentage': round(percentage, 2)
        })
    
    return jsonify({
        'grant': {
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'title_ar': grant.title_ar,
            'donor': {
                'id': grant.donor.id,
                'name': grant.donor.name,
                'name_ar': grant.donor.name_ar,
                'contact_person': grant.donor.contact_person,
                'email': grant.donor.email
            },
            'project': {
                'id': grant.project.id,
                'name': grant.project.name,
                'code': grant.project.code,
                'description': grant.project.description
            } if grant.project else None,
            'financial': {
                'amount': float(grant.amount),
                'currency': {
                    'id': grant.currency.id,
                    'code': grant.currency.code,
                    'name': grant.currency.name,
                    'symbol': grant.currency.symbol
                }
            },
            'timeline': {
                'start_date': grant.start_date.isoformat(),
                'end_date': grant.end_date.isoformat(),
                'days_remaining': (grant.end_date - date.today()).days,
                'duration_days': (grant.end_date - grant.start_date).days
            },
            'status': grant.status.value,
            'conditions': grant.conditions,
            'description': grant.description,
            'created_at': grant.created_at.isoformat()
        },
        'utilization': utilization_data,
        'expense_breakdown': expense_breakdown
    })

@grants_bp.route('/<int:grant_id>', methods=['PUT'])
@check_permission('grant_update')
def update_grant(grant_id):
    """Update grant information with validation"""
    grant = Grant.query.get_or_404(grant_id)
    
    # Store old values for audit
    old_values = {
        'title': grant.title,
        'amount': float(grant.amount),
        'end_date': grant.end_date.isoformat(),
        'status': grant.status.value
    }
    
    data = request.get_json()
    
    # Validate updatable fields
    if 'title' in data and data['title']:
        grant.title = data['title']
    
    if 'title_ar' in data:
        grant.title_ar = data['title_ar']
    
    if 'end_date' in data:
        try:
            new_end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            if new_end_date <= grant.start_date:
                return jsonify({'message': 'End date must be after start date'}), 400
            grant.end_date = new_end_date
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if 'status' in data:
        try:
            grant.status = GrantStatus(data['status'].upper())
        except ValueError:
            return jsonify({'message': 'Invalid status. Use: active, expired, completed'}), 400
    
    if 'conditions' in data:
        grant.conditions = data['conditions']
    
    if 'description' in data:
        grant.description = data['description']
    
    # Note: Amount, donor, currency, and start_date typically shouldn't be changed
    # after grant creation for audit trail purposes
    
    try:
        db.session.commit()
        
        new_values = {
            'title': grant.title,
            'amount': float(grant.amount),
            'end_date': grant.end_date.isoformat(),
            'status': grant.status.value
        }
        
        log_audit_trail('grants', grant.id, 'UPDATE', 
                       old_values=old_values, new_values=new_values)
        
        return jsonify({
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'status': grant.status.value,
            'message': 'Grant updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update grant',
            'error': str(e)
        }), 500

@grants_bp.route('/<int:grant_id>', methods=['DELETE'])
@check_permission('grant_delete')
def delete_grant(grant_id):
    """Soft delete grant (only if no transactions exist)"""
    grant = Grant.query.get_or_404(grant_id)
    
    # Check if grant has any associated transactions
    if grant.project_id:
        transaction_count = JournalEntryLine.query.join(JournalEntry).filter(
            and_(
                JournalEntryLine.project_id == grant.project_id,
                JournalEntry.entry_date.between(grant.start_date, grant.end_date),
                JournalEntry.is_posted == True
            )
        ).count()
        
        if transaction_count > 0:
            return jsonify({
                'message': 'Cannot delete grant with associated transactions',
                'transaction_count': transaction_count
            }), 400
    
    old_values = {
        'grant_number': grant.grant_number,
        'title': grant.title,
        'status': grant.status.value
    }
    
    try:
        # Soft delete by changing status
        grant.status = GrantStatus.COMPLETED
        db.session.commit()
        
        log_audit_trail('grants', grant.id, 'DELETE', old_values=old_values)
        
        return jsonify({'message': 'Grant deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to delete grant',
            'error': str(e)
        }), 500

@grants_bp.route('/<int:grant_id>/utilization', methods=['GET'])
@check_permission('grant_read')
def get_grant_utilization(grant_id):
    """Get comprehensive grant utilization report with timeline analysis"""
    grant = Grant.query.get_or_404(grant_id)
    
    # Get monthly utilization breakdown
    monthly_utilization = db.session.query(
        func.extract('year', JournalEntry.entry_date).label('year'),
        func.extract('month', JournalEntry.entry_date).label('month'),
        func.sum(JournalEntryLine.debit_amount).label('amount')
    ).join(JournalEntry).filter(
        and_(
            JournalEntryLine.project_id == grant.project_id if grant.project_id else False,
            JournalEntry.entry_date.between(grant.start_date, grant.end_date),
            JournalEntry.is_posted == True
        )
    ).group_by(
        func.extract('year', JournalEntry.entry_date),
        func.extract('month', JournalEntry.entry_date)
    ).order_by('year', 'month').all()
    
    monthly_data = []
    cumulative_amount = 0
    
    for row in monthly_utilization:
        amount = float(row.amount or 0)
        cumulative_amount += amount
        
        monthly_data.append({
            'period': f"{int(row.year)}-{int(row.month):02d}",
            'monthly_amount': amount,
            'cumulative_amount': cumulative_amount,
            'cumulative_percentage': (cumulative_amount / float(grant.amount) * 100) if grant.amount > 0 else 0
        })
    
    # Get expenses by functional category
    expense_categories = db.session.query(
        func.sum(
            func.case(
                (Account.name.ilike('%program%'), JournalEntryLine.debit_amount),
                else_=0
            )
        ).label('program_expenses'),
        func.sum(
            func.case(
                (Account.name.ilike('%admin%'), JournalEntryLine.debit_amount),
                else_=0
            )
        ).label('admin_expenses'),
        func.sum(
            func.case(
                (Account.name.ilike('%fundraising%'), JournalEntryLine.debit_amount),
                else_=0
            )
        ).label('fundraising_expenses')
    ).join(JournalEntry).join(Account).filter(
        and_(
            JournalEntryLine.project_id == grant.project_id if grant.project_id else False,
            JournalEntry.entry_date.between(grant.start_date, grant.end_date),
            JournalEntry.is_posted == True
        )
    ).first()
    
    total_expenses = float(expense_categories.program_expenses or 0) + \
                    float(expense_categories.admin_expenses or 0) + \
                    float(expense_categories.fundraising_expenses or 0)
    
    functional_breakdown = {
        'program_expenses': float(expense_categories.program_expenses or 0),
        'admin_expenses': float(expense_categories.admin_expenses or 0),
        'fundraising_expenses': float(expense_categories.fundraising_expenses or 0),
        'program_ratio': (float(expense_categories.program_expenses or 0) / total_expenses * 100) if total_expenses > 0 else 0,
        'admin_ratio': (float(expense_categories.admin_expenses or 0) / total_expenses * 100) if total_expenses > 0 else 0,
        'fundraising_ratio': (float(expense_categories.fundraising_expenses or 0) / total_expenses * 100) if total_expenses > 0 else 0
    }
    
    return jsonify({
        'grant': {
            'id': grant.id,
            'grant_number': grant.grant_number,
            'title': grant.title,
            'amount': float(grant.amount),
            'currency_code': grant.currency.code,
            'donor_name': grant.donor.name,
            'project_name': grant.project.name if grant.project else None
        },
        'utilization_summary': {
            'total_amount': float(grant.amount),
            'utilized_amount': total_expenses,
            'remaining_balance': float(grant.amount) - total_expenses,
            'utilization_percentage': (total_expenses / float(grant.amount) * 100) if grant.amount > 0 else 0,
            'days_elapsed': (date.today() - grant.start_date).days,
            'total_days': (grant.end_date - grant.start_date).days,
            'time_elapsed_percentage': ((date.today() - grant.start_date).days / (grant.end_date - grant.start_date).days * 100) if (grant.end_date - grant.start_date).days > 0 else 0
        },
        'monthly_utilization': monthly_data,
        'functional_breakdown': functional_breakdown,
        'performance_indicators': {
            'on_track': total_expenses <= float(grant.amount) and date.today() <= grant.end_date,
            'over_budget': total_expenses > float(grant.amount),
            'underspent': total_expenses < float(grant.amount) * 0.8 and date.today() > grant.start_date + timedelta(days=(grant.end_date - grant.start_date).days * 0.8)
        }
    })

@grants_bp.route('/summary', methods=['GET'])
@check_permission('grant_read')
def get_grants_summary():
    """Get comprehensive grants portfolio summary"""
    # Overall statistics
    total_grants = Grant.query.count()
    active_grants = Grant.query.filter_by(status=GrantStatus.ACTIVE).count()
    
    # Financial summary
    total_grant_amount = db.session.query(func.sum(Grant.amount)).scalar() or Decimal('0')
    active_grant_amount = db.session.query(func.sum(Grant.amount)).filter_by(
        status=GrantStatus.ACTIVE
    ).scalar() or Decimal('0')
    
    # Utilization summary for active grants
    total_utilized = Decimal('0')
    active_grants_list = Grant.query.filter_by(status=GrantStatus.ACTIVE).all()
    
    for grant in active_grants_list:
        if grant.project_id:
            utilized = db.session.query(func.sum(JournalEntryLine.debit_amount)).join(
                JournalEntry
            ).filter(
                and_(
                    JournalEntryLine.project_id == grant.project_id,
                    JournalEntry.entry_date.between(grant.start_date, grant.end_date),
                    JournalEntry.is_posted == True
                )
            ).scalar() or Decimal('0')
            total_utilized += utilized
    
    # Grants by donor
    grants_by_donor = db.session.query(
        Donor.name,
        func.count(Grant.id).label('grant_count'),
        func.sum(Grant.amount).label('total_amount')
    ).join(Grant).group_by(Donor.name).order_by(func.sum(Grant.amount).desc()).limit(10).all()
    
    # Grants expiring soon
    warning_date = date.today() + timedelta(days=90)
    expiring_grants = Grant.query.filter(
        and_(
            Grant.end_date <= warning_date,
            Grant.end_date >= date.today(),
            Grant.status == GrantStatus.ACTIVE
        )
    ).count()
    
    return jsonify({
        'portfolio_overview': {
            'total_grants': total_grants,
            'active_grants': active_grants,
            'completed_grants': Grant.query.filter_by(status=GrantStatus.COMPLETED).count(),
            'expired_grants': Grant.query.filter_by(status=GrantStatus.EXPIRED).count()
        },
        'financial_summary': {
            'total_grant_amount': float(total_grant_amount),
            'active_grant_amount': float(active_grant_amount),
            'total_utilized': float(total_utilized),
            'remaining_balance': float(active_grant_amount - total_utilized),
            'overall_utilization_rate': (float(total_utilized) / float(active_grant_amount) * 100) if active_grant_amount > 0 else 0
        },
        'top_donors': [
            {
                'donor_name': donor.name,
                'grant_count': donor.grant_count,
                'total_amount': float(donor.total_amount)
            }
            for donor in grants_by_donor
        ],
        'alerts': {
            'grants_expiring_soon': expiring_grants,
            'over_budget_grants': len([
                g for g in active_grants_list 
                if FinancialCalculationService.calculate_grant_utilization(g.id)['status'] == 'over_budget'
            ])
        },
        'generated_at': datetime.utcnow().isoformat()
    })