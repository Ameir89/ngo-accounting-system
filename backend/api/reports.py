# backend/api/reports.py - Complete Financial Reports API
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy import func, extract, and_, or_, case, text
from datetime import datetime, date, timedelta
from decimal import Decimal
from models import (
    Budget, BudgetLine, db, Account, AccountType, JournalEntry, JournalEntryLine, 
    Grant, Project, Donor, CostCenter, FixedAsset, Supplier,
    SupplierInvoice, Currency, OrganizationSettings
)
from utils.decorators import check_permission
from utils.request_validator import RequestValidator
from services.analytics_service import AdvancedAnalyticsService

reports_bp = Blueprint('reports', __name__)
validator = RequestValidator()

# ============================================================================
# CORE FINANCIAL STATEMENTS
# ============================================================================

@reports_bp.route('/trial-balance', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    as_of_date={'type': str},
    format={'type': str, 'choices': ['json', 'pdf', 'excel']}
)
def trial_balance():
    """Generate comprehensive trial balance report"""
    as_of_date_str = request.args.get('as_of_date', date.today().isoformat())
    report_format = request.args.get('format', 'json')
    
    try:
        as_of_date = datetime.strptime(as_of_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Optimized query to get all accounts with their balances
    query = db.session.query(
        Account.id,
        Account.code,
        Account.name,
        Account.name_ar,
        Account.account_type,
        Account.parent_id,
        Account.level,
        func.coalesce(func.sum(JournalEntryLine.debit_amount), 0).label('total_debit'),
        func.coalesce(func.sum(JournalEntryLine.credit_amount), 0).label('total_credit')
    ).outerjoin(
        JournalEntryLine, Account.id == JournalEntryLine.account_id
    ).outerjoin(
        JournalEntry, and_(
            JournalEntryLine.journal_entry_id == JournalEntry.id,
            JournalEntry.entry_date <= as_of_date,
            JournalEntry.is_posted == True
        )
    ).filter(Account.is_active == True).group_by(
        Account.id, Account.code, Account.name, Account.name_ar, 
        Account.account_type, Account.parent_id, Account.level
    ).order_by(Account.code)
    
    results = query.all()
    
    # Process results and calculate balances
    trial_balance_data = []
    account_type_totals = {}
    total_debit = Decimal('0')
    total_credit = Decimal('0')
    
    for result in results:
        debit_balance = Decimal(str(result.total_debit or 0))
        credit_balance = Decimal(str(result.total_credit or 0))
        net_balance = debit_balance - credit_balance
        
        # Determine normal balance side based on account type
        if result.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
            # Normal debit balance
            if net_balance >= 0:
                debit_amount = net_balance
                credit_amount = Decimal('0')
            else:
                debit_amount = Decimal('0')
                credit_amount = abs(net_balance)
        else:
            # Normal credit balance (LIABILITY, EQUITY, REVENUE)
            if net_balance <= 0:
                credit_amount = abs(net_balance)
                debit_amount = Decimal('0')
            else:
                debit_amount = net_balance
                credit_amount = Decimal('0')
        
        # Only include accounts with non-zero balances
        if debit_amount != 0 or credit_amount != 0:
            account_data = {
                'account_id': result.id,
                'account_code': result.code,
                'account_name': result.name,
                'account_name_ar': result.name_ar,
                'account_type': result.account_type.value,
                'parent_id': result.parent_id,
                'level': result.level,
                'debit_amount': float(debit_amount),
                'credit_amount': float(credit_amount),
                'net_balance': float(net_balance)
            }
            trial_balance_data.append(account_data)
            
            # Update totals
            total_debit += debit_amount
            total_credit += credit_amount
            
            # Update account type totals
            acc_type = result.account_type.value
            if acc_type not in account_type_totals:
                account_type_totals[acc_type] = {'debit': Decimal('0'), 'credit': Decimal('0')}
            account_type_totals[acc_type]['debit'] += debit_amount
            account_type_totals[acc_type]['credit'] += credit_amount
    
    # Calculate variance (should be zero in a balanced system)
    variance = total_debit - total_credit
    is_balanced = abs(variance) < Decimal('0.01')
    
    # Organize by account types
    accounts_by_type = {}
    for account in trial_balance_data:
        acc_type = account['account_type']
        if acc_type not in accounts_by_type:
            accounts_by_type[acc_type] = []
        accounts_by_type[acc_type].append(account)
    
    response_data = {
        'report_info': {
            'report_name': 'Trial Balance',
            'as_of_date': as_of_date.isoformat(),
            'generated_at': datetime.utcnow().isoformat(),
            'currency': 'USD'  # Should be dynamic based on base currency
        },
        'summary': {
            'total_debit': float(total_debit),
            'total_credit': float(total_credit),
            'variance': float(variance),
            'is_balanced': is_balanced,
            'accounts_count': len(trial_balance_data)
        },
        'accounts_by_type': accounts_by_type,
        'all_accounts': trial_balance_data,
        'account_type_totals': {
            acc_type: {
                'debit': float(totals['debit']),
                'credit': float(totals['credit'])
            }
            for acc_type, totals in account_type_totals.items()
        }
    }
    
    if report_format == 'json':
        return jsonify(response_data)
    elif report_format == 'pdf':
        # Generate PDF report
        from services.report_generator import EnhancedReportGenerator
        generator = EnhancedReportGenerator()
        pdf_buffer = generator.generate_trial_balance_pdf(response_data)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'trial_balance_{as_of_date.strftime("%Y%m%d")}.pdf',
            mimetype='application/pdf'
        )
    else:
        return jsonify({'message': 'Format not yet implemented'}), 501

@reports_bp.route('/balance-sheet', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    as_of_date={'type': str},
    comparative={'type': bool}
)
def balance_sheet():
    """Generate balance sheet (statement of financial position)"""
    as_of_date_str = request.args.get('as_of_date', date.today().isoformat())
    comparative = request.args.get('comparative', False)
    
    try:
        as_of_date = datetime.strptime(as_of_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    def get_balances_as_of(target_date):
        # Get account balances as of a specific date
        query = db.session.query(
            Account.id,
            Account.code,
            Account.name,
            Account.name_ar,
            Account.account_type,
            Account.level,
            Account.parent_id,
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('balance')
        ).join(
            JournalEntryLine, Account.id == JournalEntryLine.account_id
        ).join(
            JournalEntry, and_(
                JournalEntryLine.journal_entry_id == JournalEntry.id,
                JournalEntry.entry_date <= target_date,
                JournalEntry.is_posted == True
            )
        ).filter(
            Account.is_active == True,
            Account.account_type.in_([AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY])
        ).group_by(
            Account.id, Account.code, Account.name, Account.name_ar, 
            Account.account_type, Account.level, Account.parent_id
        ).all()
        
        return query
    
    # Get current period balances
    current_balances = get_balances_as_of(as_of_date)
    
    # Get comparative period balances if requested
    comparative_balances = None
    if comparative:
        comparative_date = as_of_date - timedelta(days=365)  # Previous year
        comparative_balances = get_balances_as_of(comparative_date)
    
    def organize_balance_sheet_data(balances, period_name="current"):
        balance_sheet_data = {
            'assets': {
                'current_assets': [],
                'non_current_assets': [],
                'total_assets': Decimal('0')
            },
            'liabilities': {
                'current_liabilities': [],
                'non_current_liabilities': [],
                'total_liabilities': Decimal('0')
            },
            'equity': {
                'equity_items': [],
                'total_equity': Decimal('0')
            }
        }
        
        for result in balances:
            balance = Decimal(str(result.balance or 0))
            
            # Skip zero balances
            if balance == 0:
                continue
            
            account_info = {
                'account_id': result.id,
                'account_code': result.code,
                'account_name': result.name,
                'account_name_ar': result.name_ar,
                'level': result.level,
                'balance': float(abs(balance))  # Always show positive amounts
            }
            
            if result.account_type == AccountType.ASSET:
                # Classify as current or non-current based on account name patterns
                account_name_lower = result.name.lower()
                if any(keyword in account_name_lower for keyword in ['current', 'cash', 'receivable', 'inventory', 'prepaid']):
                    balance_sheet_data['assets']['current_assets'].append(account_info)
                else:
                    balance_sheet_data['assets']['non_current_assets'].append(account_info)
                balance_sheet_data['assets']['total_assets'] += abs(balance)
                
            elif result.account_type == AccountType.LIABILITY:
                # Classify as current or non-current
                account_name_lower = result.name.lower()
                if any(keyword in account_name_lower for keyword in ['current', 'payable', 'accrued', 'short-term']):
                    balance_sheet_data['liabilities']['current_liabilities'].append(account_info)
                else:
                    balance_sheet_data['liabilities']['non_current_liabilities'].append(account_info)
                balance_sheet_data['liabilities']['total_liabilities'] += abs(balance)
                
            elif result.account_type == AccountType.EQUITY:
                balance_sheet_data['equity']['equity_items'].append(account_info)
                balance_sheet_data['equity']['total_equity'] += abs(balance)
        
        # Convert totals to float
        balance_sheet_data['assets']['total_assets'] = float(balance_sheet_data['assets']['total_assets'])
        balance_sheet_data['liabilities']['total_liabilities'] = float(balance_sheet_data['liabilities']['total_liabilities'])
        balance_sheet_data['equity']['total_equity'] = float(balance_sheet_data['equity']['total_equity'])
        
        return balance_sheet_data
    
    # Organize current period data
    current_data = organize_balance_sheet_data(current_balances, "current")
    
    # Calculate key ratios
    total_assets = current_data['assets']['total_assets']
    total_liabilities = current_data['liabilities']['total_liabilities']
    total_equity = current_data['equity']['total_equity']
    
    # Check if balance sheet balances
    balance_check = abs(total_assets - (total_liabilities + total_equity)) < 0.01
    
    response_data = {
        'report_info': {
            'report_name': 'Balance Sheet',
            'as_of_date': as_of_date.isoformat(),
            'generated_at': datetime.utcnow().isoformat(),
            'currency': 'USD',
            'is_comparative': comparative
        },
        'current_period': current_data,
        'financial_position_summary': {
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'total_equity': total_equity,
            'debt_to_equity_ratio': (total_liabilities / total_equity) if total_equity != 0 else None,
            'equity_ratio': (total_equity / total_assets) if total_assets != 0 else None,
            'balance_check': balance_check
        }
    }
    
    # Add comparative data if requested
    if comparative and comparative_balances:
        comparative_data = organize_balance_sheet_data(comparative_balances, "comparative")
        response_data['comparative_period'] = comparative_data
        response_data['comparative_date'] = comparative_date.isoformat()
        
        # Calculate changes
        response_data['changes'] = {
            'assets_change': total_assets - comparative_data['assets']['total_assets'],
            'liabilities_change': total_liabilities - comparative_data['liabilities']['total_liabilities'],
            'equity_change': total_equity - comparative_data['equity']['total_equity']
        }
    
    return jsonify(response_data)

@reports_bp.route('/income-statement', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    start_date={'type': str, 'required': True},
    end_date={'type': str, 'required': True},
    comparative={'type': bool}
)
def income_statement():
    """Generate income statement (statement of activities for NGO)"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    comparative = request.args.get('comparative', False)
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if end_date <= start_date:
        return jsonify({'message': 'End date must be after start date'}), 400
    
    def get_income_statement_data(period_start, period_end):
        # Get revenue accounts
        revenue_query = db.session.query(
            Account.id,
            Account.code,
            Account.name,
            Account.name_ar,
            Account.level,
            func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount).label('amount')
        ).join(JournalEntryLine).join(JournalEntry).filter(
            and_(
                Account.account_type == AccountType.REVENUE,
                Account.is_active == True,
                JournalEntry.entry_date.between(period_start, period_end),
                JournalEntry.is_posted == True
            )
        ).group_by(
            Account.id, Account.code, Account.name, Account.name_ar, Account.level
        ).having(
            func.sum(JournalEntryLine.credit_amount - JournalEntryLine.debit_amount) != 0
        ).all()
        
        # Get expense accounts
        expense_query = db.session.query(
            Account.id,
            Account.code,
            Account.name,
            Account.name_ar,
            Account.level,
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount).label('amount')
        ).join(JournalEntryLine).join(JournalEntry).filter(
            and_(
                Account.account_type == AccountType.EXPENSE,
                Account.is_active == True,
                JournalEntry.entry_date.between(period_start, period_end),
                JournalEntry.is_posted == True
            )
        ).group_by(
            Account.id, Account.code, Account.name, Account.name_ar, Account.level
        ).having(
            func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount) != 0
        ).all()
        
        return revenue_query, expense_query
    
    # Get current period data
    current_revenue, current_expenses = get_income_statement_data(start_date, end_date)
    
    # Process revenues
    revenues = []
    total_revenue = Decimal('0')
    revenue_by_category = {
        'grants': Decimal('0'),
        'donations': Decimal('0'),
        'service_revenue': Decimal('0'),
        'other': Decimal('0')
    }
    
    for rev in current_revenue:
        amount = Decimal(str(rev.amount or 0))
        total_revenue += amount
        
        # Categorize revenue
        account_name_lower = rev.name.lower()
        if 'grant' in account_name_lower:
            revenue_by_category['grants'] += amount
        elif 'donation' in account_name_lower or 'contribution' in account_name_lower:
            revenue_by_category['donations'] += amount
        elif 'service' in account_name_lower or 'program' in account_name_lower:
            revenue_by_category['service_revenue'] += amount
        else:
            revenue_by_category['other'] += amount
        
        revenues.append({
            'account_id': rev.id,
            'account_code': rev.code,
            'account_name': rev.name,
            'account_name_ar': rev.name_ar,
            'level': rev.level,
            'amount': float(amount)
        })
    
    # Process expenses by functional classification (important for NGOs)
    expenses = []
    total_expenses = Decimal('0')
    functional_expenses = {
        'program_services': Decimal('0'),
        'management_general': Decimal('0'),
        'fundraising': Decimal('0')
    }
    
    for exp in current_expenses:
        amount = Decimal(str(exp.amount or 0))
        total_expenses += amount
        
        # Functional classification
        account_name_lower = exp.name.lower()
        if any(keyword in account_name_lower for keyword in ['program', 'service', 'education', 'health', 'community']):
            functional_expenses['program_services'] += amount
        elif any(keyword in account_name_lower for keyword in ['fundraising', 'development', 'donor']):
            functional_expenses['fundraising'] += amount
        else:
            functional_expenses['management_general'] += amount
        
        expenses.append({
            'account_id': exp.id,
            'account_code': exp.code,
            'account_name': exp.name,
            'account_name_ar': exp.name_ar,
            'level': exp.level,
            'amount': float(amount)
        })
    
    # Calculate net income
    net_income = total_revenue - total_expenses
    
    # Calculate important NGO ratios
    program_expense_ratio = (functional_expenses['program_services'] / total_expenses * 100) if total_expenses > 0 else 0
    fundraising_ratio = (functional_expenses['fundraising'] / total_expenses * 100) if total_expenses > 0 else 0
    admin_ratio = (functional_expenses['management_general'] / total_expenses * 100) if total_expenses > 0 else 0
    
    current_period_data = {
        'revenues': {
            'by_account': revenues,
            'by_category': {k: float(v) for k, v in revenue_by_category.items()},
            'total_revenue': float(total_revenue)
        },
        'expenses': {
            'by_account': expenses,
            'by_function': {k: float(v) for k, v in functional_expenses.items()},
            'total_expenses': float(total_expenses)
        },
        'net_income': float(net_income)
    }
    
    response_data = {
        'report_info': {
            'report_name': 'Statement of Activities',
            'period': f"{start_date.isoformat()} to {end_date.isoformat()}",
            'generated_at': datetime.utcnow().isoformat(),
            'currency': 'USD'
        },
        'current_period': current_period_data,
        'financial_ratios': {
            'program_expense_ratio': float(program_expense_ratio),
            'fundraising_ratio': float(fundraising_ratio),
            'admin_ratio': float(admin_ratio),
            'revenue_efficiency': (float(net_income) / float(total_revenue) * 100) if total_revenue > 0 else 0
        }
    }
    
    # Add comparative period if requested
    if comparative:
        # Previous year same period
        comparative_start = start_date.replace(year=start_date.year - 1)
        comparative_end = end_date.replace(year=end_date.year - 1)
        
        comp_revenue, comp_expenses = get_income_statement_data(comparative_start, comparative_end)
        
        comp_total_revenue = sum(Decimal(str(rev.amount or 0)) for rev in comp_revenue)
        comp_total_expenses = sum(Decimal(str(exp.amount or 0)) for exp in comp_expenses)
        comp_net_income = comp_total_revenue - comp_total_expenses
        
        response_data['comparative_period'] = {
            'period': f"{comparative_start.isoformat()} to {comparative_end.isoformat()}",
            'total_revenue': float(comp_total_revenue),
            'total_expenses': float(comp_total_expenses),
            'net_income': float(comp_net_income)
        }
        
        # Calculate growth rates
        response_data['growth_analysis'] = {
            'revenue_growth': ((float(total_revenue) - float(comp_total_revenue)) / float(comp_total_revenue) * 100) if comp_total_revenue > 0 else None,
            'expense_growth': ((float(total_expenses) - float(comp_total_expenses)) / float(comp_total_expenses) * 100) if comp_total_expenses > 0 else None,
            'net_income_change': float(net_income) - float(comp_net_income)
        }
    
    return jsonify(response_data)

@reports_bp.route('/cash-flow', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    start_date={'type': str, 'required': True},
    end_date={'type': str, 'required': True}
)
def cash_flow_statement():
    """Generate cash flow statement"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get cash accounts (accounts with 'cash' or 'bank' in name)
    cash_accounts = Account.query.filter(
        and_(
            Account.account_type == AccountType.ASSET,
            Account.is_active == True,
            or_(
                Account.name.ilike('%cash%'),
                Account.name.ilike('%bank%')
            )
        )
    ).all()
    
    if not cash_accounts:
        return jsonify({'message': 'No cash accounts found'}), 400
    
    cash_account_ids = [acc.id for acc in cash_accounts]
    
    # Calculate opening cash balance
    opening_balance = db.session.query(
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
    ).join(JournalEntry).filter(
        and_(
            JournalEntryLine.account_id.in_(cash_account_ids),
            JournalEntry.entry_date < start_date,
            JournalEntry.is_posted == True
        )
    ).scalar() or Decimal('0')
    
    # Get all cash movements during the period
    cash_movements = db.session.query(
        JournalEntryLine.debit_amount,
        JournalEntryLine.credit_amount,
        JournalEntry.entry_date,
        JournalEntry.description,
        Account.name.label('other_account_name'),
        Account.account_type.label('other_account_type')
    ).join(JournalEntry).join(
        Account, JournalEntryLine.account_id == Account.id
    ).filter(
        and_(
            JournalEntry.entry_date.between(start_date, end_date),
            JournalEntry.is_posted == True,
            # Get the corresponding lines (not the cash account lines)
            JournalEntryLine.journal_entry_id.in_(
                db.session.query(JournalEntryLine.journal_entry_id).filter(
                    JournalEntryLine.account_id.in_(cash_account_ids)
                )
            ),
            ~JournalEntryLine.account_id.in_(cash_account_ids)
        )
    ).all()
    
    # Classify cash flows
    operating_activities = []
    investing_activities = []
    financing_activities = []
    
    operating_total = Decimal('0')
    investing_total = Decimal('0')
    financing_total = Decimal('0')
    
    for movement in cash_movements:
        # Determine cash effect (opposite of the other account)
        cash_effect = movement.credit_amount - movement.debit_amount
        
        activity_item = {
            'description': movement.other_account_name,
            'amount': float(cash_effect),
            'date': movement.entry_date.isoformat()
        }
        
        # Classify based on account type and name
        account_name_lower = movement.other_account_name.lower()
        account_type = movement.other_account_type
        
        if account_type in [AccountType.REVENUE, AccountType.EXPENSE] or \
           any(keyword in account_name_lower for keyword in ['receivable', 'payable', 'accrued', 'inventory']):
            # Operating activities
            operating_activities.append(activity_item)
            operating_total += cash_effect
        elif 'equipment' in account_name_lower or 'asset' in account_name_lower or 'investment' in account_name_lower:
            # Investing activities
            investing_activities.append(activity_item)
            investing_total += cash_effect
        else:
            # Financing activities (loans, equity, etc.)
            financing_activities.append(activity_item)
            financing_total += cash_effect
    
    # Calculate net change and closing balance
    net_change = operating_total + investing_total + financing_total
    closing_balance = opening_balance + net_change
    
    # Verify closing balance
    actual_closing_balance = db.session.query(
        func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
    ).join(JournalEntry).filter(
        and_(
            JournalEntryLine.account_id.in_(cash_account_ids),
            JournalEntry.entry_date <= end_date,
            JournalEntry.is_posted == True
        )
    ).scalar() or Decimal('0')
    
    return jsonify({
        'report_info': {
            'report_name': 'Statement of Cash Flows',
            'period': f"{start_date.isoformat()} to {end_date.isoformat()}",
            'generated_at': datetime.utcnow().isoformat(),
            'currency': 'USD'
        },
        'cash_flow_summary': {
            'opening_cash_balance': float(opening_balance),
            'cash_from_operating': float(operating_total),
            'cash_from_investing': float(investing_total),
            'cash_from_financing': float(financing_total),
            'net_change_in_cash': float(net_change),
            'closing_cash_balance': float(closing_balance),
            'closing_balance_verification': float(actual_closing_balance),
            'reconciliation_difference': float(closing_balance - actual_closing_balance)
        },
        'operating_activities': operating_activities,
        'investing_activities': investing_activities,
        'financing_activities': financing_activities
    })

# ============================================================================
# ANALYTICAL REPORTS
# ============================================================================

@reports_bp.route('/grant-utilization', methods=['GET'])
@check_permission('reports_read')
def grant_utilization_report():
    """Comprehensive grant utilization report"""
    # Get all active grants
    grants = Grant.query.filter_by(status='active').all()
    
    grant_utilization_data = []
    total_grants_amount = Decimal('0')
    total_utilized_amount = Decimal('0')
    
    for grant in grants:
        # Calculate utilization for each grant
        from services.financial_calculations import FinancialCalculationService
        utilization = FinancialCalculationService.calculate_grant_utilization(grant.id)
        
        if utilization:
            grant_data = {
                'grant_id': grant.id,
                'grant_number': grant.grant_number,
                'title': grant.title,
                'donor': {
                    'id': grant.donor.id,
                    'name': grant.donor.name
                },
                'project': {
                    'id': grant.project.id if grant.project else None,
                    'name': grant.project.name if grant.project else None
                },
                'timeline': {
                    'start_date': grant.start_date.isoformat(),
                    'end_date': grant.end_date.isoformat(),
                    'days_remaining': (grant.end_date - date.today()).days
                },
                'financial': utilization,
                'performance_status': 'on_track' if utilization['utilization_percentage'] <= 100 else 'over_budget'
            }
            
            grant_utilization_data.append(grant_data)
            total_grants_amount += grant.amount
            total_utilized_amount += Decimal(str(utilization['utilized_amount']))
    
    # Overall statistics
    overall_utilization_rate = (total_utilized_amount / total_grants_amount * 100) if total_grants_amount > 0 else 0
    grants_over_budget = len([g for g in grant_utilization_data if g['performance_status'] == 'over_budget'])
    
    return jsonify({
        'report_info': {
            'report_name': 'Grant Utilization Report',
            'generated_at': datetime.utcnow().isoformat(),
            'total_grants': len(grant_utilization_data)
        },
        'summary': {
            'total_grant_amount': float(total_grants_amount),
            'total_utilized_amount': float(total_utilized_amount),
            'overall_utilization_rate': float(overall_utilization_rate),
            'grants_over_budget': grants_over_budget,
            'remaining_budget': float(total_grants_amount - total_utilized_amount)
        },
        'grants': grant_utilization_data
    })

@reports_bp.route('/project-financial-summary', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    start_date={'type': str},
    end_date={'type': str},
    project_id={'type': int}
)
def project_financial_summary():
    """Financial summary report by project"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    project_id = request.args.get('project_id', type=int)
    
    # Parse dates
    start_date = None
    end_date = None
    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    
    # Build base query
    query = Project.query.filter_by(is_active=True)
    if project_id:
        query = query.filter_by(id=project_id)
    
    projects = query.all()
    
    project_summaries = []
    
    for project in projects:
        # Get project expenses
        expense_query = db.session.query(
            func.sum(JournalEntryLine.debit_amount).label('total_expenses')
        ).join(JournalEntry).filter(
            JournalEntryLine.project_id == project.id,
            JournalEntry.is_posted == True
        )
        
        # Apply date filters if provided
        if start_date:
            expense_query = expense_query.filter(JournalEntry.entry_date >= start_date)
        if end_date:
            expense_query = expense_query.filter(JournalEntry.entry_date <= end_date)
        
        total_expenses = expense_query.scalar() or Decimal('0')
        
        # Get project revenue/grants
        project_grants = Grant.query.filter_by(project_id=project.id).all()
        total_grant_amount = sum(grant.amount for grant in project_grants)
        
        # Calculate budget variance
        budget_variance = float(project.budget_amount or 0) - float(total_expenses)
        budget_utilization = (float(total_expenses) / float(project.budget_amount) * 100) if project.budget_amount else 0
        
        project_summary = {
            'project': {
                'id': project.id,
                'code': project.code,
                'name': project.name,
                'description': project.description,
                'cost_center': project.cost_center.name if project.cost_center else None
            },
            'financial': {
                'budget_amount': float(project.budget_amount or 0),
                'total_expenses': float(total_expenses),
                'budget_variance': budget_variance,
                'budget_utilization_percentage': budget_utilization,
                'total_grant_funding': float(total_grant_amount)
            },
            'performance': {
                'status': 'over_budget' if budget_utilization > 100 else 'within_budget',
                'variance_percentage': (budget_variance / float(project.budget_amount) * 100) if project.budget_amount else 0
            }
        }
        
        project_summaries.append(project_summary)
    
    return jsonify({
        'report_info': {
            'report_name': 'Project Financial Summary',
            'period': f"{start_date_str or 'All'} to {end_date_str or 'All'}",
            'generated_at': datetime.utcnow().isoformat()
        },
        'projects': project_summaries,
        'total_projects': len(project_summaries)
    })

@reports_bp.route('/aging-analysis', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    report_type={'type': str, 'choices': ['receivables', 'payables'], 'required': True},
    as_of_date={'type': str}
)
def aging_analysis():
    """Aging analysis for receivables or payables"""
    report_type = request.args.get('report_type')
    as_of_date_str = request.args.get('as_of_date', date.today().isoformat())
    
    try:
        as_of_date = datetime.strptime(as_of_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if report_type == 'receivables':
        # Get accounts receivable balances
        receivables_accounts = Account.query.filter(
            and_(
                Account.account_type == AccountType.ASSET,
                Account.name.ilike('%receivable%'),
                Account.is_active == True
            )
        ).all()
        
        # This is simplified - in a full implementation, you'd track individual
        # receivables with due dates
        aging_data = []
        for account in receivables_accounts:
            balance = db.session.query(
                func.sum(JournalEntryLine.debit_amount - JournalEntryLine.credit_amount)
            ).join(JournalEntry).filter(
                and_(
                    JournalEntryLine.account_id == account.id,
                    JournalEntry.entry_date <= as_of_date,
                    JournalEntry.is_posted == True
                )
            ).scalar() or Decimal('0')
            
            if balance > 0:
                aging_data.append({
                    'account': account.name,
                    'total_balance': float(balance),
                    'current': float(balance * Decimal('0.6')),  # Simplified aging
                    '30_days': float(balance * Decimal('0.25')),
                    '60_days': float(balance * Decimal('0.10')),
                    '90_days_plus': float(balance * Decimal('0.05'))
                })
        
        return jsonify({
            'report_info': {
                'report_name': 'Accounts Receivable Aging',
                'as_of_date': as_of_date.isoformat(),
                'generated_at': datetime.utcnow().isoformat()
            },
            'aging_analysis': aging_data
        })
    
    elif report_type == 'payables':
        # Get supplier invoices for payables aging
        invoices = SupplierInvoice.query.filter(
            SupplierInvoice.status.in_(['pending', 'partial'])
        ).all()
        
        aging_data = []
        for invoice in invoices:
            outstanding_amount = invoice.total_amount - invoice.paid_amount
            if outstanding_amount > 0:
                # Calculate days outstanding
                days_outstanding = (as_of_date - invoice.invoice_date).days
                
                # Classify into aging buckets
                aging_bucket = 'current'
                if days_outstanding > 90:
                    aging_bucket = '90_days_plus'
                elif days_outstanding > 60:
                    aging_bucket = '60_days'
                elif days_outstanding > 30:
                    aging_bucket = '30_days'
                
                aging_data.append({
                    'supplier_name': invoice.supplier.name,
                    'invoice_number': invoice.invoice_number,
                    'invoice_date': invoice.invoice_date.isoformat(),
                    'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                    'outstanding_amount': float(outstanding_amount),
                    'days_outstanding': days_outstanding,
                    'aging_bucket': aging_bucket,
                    'is_overdue': (invoice.due_date and as_of_date > invoice.due_date) if invoice.due_date else False
                })
        
        # Summarize by aging buckets
        aging_summary = {
            'current': 0,
            '30_days': 0,
            '60_days': 0,
            '90_days_plus': 0
        }
        
        for item in aging_data:
            aging_summary[item['aging_bucket']] += item['outstanding_amount']
        
        return jsonify({
            'report_info': {
                'report_name': 'Accounts Payable Aging',
                'as_of_date': as_of_date.isoformat(),
                'generated_at': datetime.utcnow().isoformat()
            },
            'aging_summary': aging_summary,
            'detailed_aging': aging_data,
            'total_outstanding': sum(aging_summary.values())
        })

# ============================================================================
# BUDGET COMPARISON REPORTS
# ============================================================================

@reports_bp.route('/budget-comparison', methods=['GET'])
@check_permission('reports_read')
@validator.validate_query_params(
    budget_id={'type': int},
    period={'type': str, 'choices': ['monthly', 'quarterly', 'annual']}
)
def budget_comparison_report():
    """Budget vs actual comparison report"""
    budget_id = request.args.get('budget_id', type=int)
    period = request.args.get('period', 'monthly')
    
    if budget_id:
        budgets = [Budget.query.get_or_404(budget_id)]
    else:
        budgets = Budget.query.filter_by(is_active=True).all()
    
    comparison_data = []
    
    for budget in budgets:
        # Get budget lines
        budget_lines = BudgetLine.query.filter_by(budget_id=budget.id).all()
        
        budget_comparison = {
            'budget': {
                'id': budget.id,
                'name': budget.name,
                'budget_year': budget.budget_year,
                'project_name': budget.project.name if budget.project else None,
                'period': f"{budget.start_date.isoformat()} to {budget.end_date.isoformat()}",
                'total_budget': float(budget.total_budget)
            },
            'line_comparisons': [],
            'summary': {
                'total_budgeted': float(budget.total_budget),
                'total_actual': 0,
                'total_variance': 0,
                'variance_percentage': 0
            }
        }
        
        total_actual = Decimal('0')
        
        for line in budget_lines:
            # Get actual expenses for this account and period
            actual_amount = db.session.query(
                func.sum(JournalEntryLine.debit_amount)
            ).join(JournalEntry).filter(
                and_(
                    JournalEntryLine.account_id == line.account_id,
                    JournalEntryLine.project_id == budget.project_id if budget.project_id else True,
                    JournalEntry.entry_date.between(budget.start_date, budget.end_date),
                    JournalEntry.is_posted == True
                )
            ).scalar() or Decimal('0')
            
            variance = float(line.budgeted_amount) - float(actual_amount)
            variance_percentage = (variance / float(line.budgeted_amount) * 100) if line.budgeted_amount > 0 else 0
            
            line_comparison = {
                'account': {
                    'id': line.account.id,
                    'code': line.account.code,
                    'name': line.account.name
                },
                'budgeted_amount': float(line.budgeted_amount),
                'actual_amount': float(actual_amount),
                'variance': variance,
                'variance_percentage': variance_percentage,
                'variance_type': 'favorable' if variance > 0 else 'unfavorable',
                'period_month': line.period_month
            }
            
            budget_comparison['line_comparisons'].append(line_comparison)
            total_actual += actual_amount
        
        # Update summary
        total_variance = float(budget.total_budget) - float(total_actual)
        budget_comparison['summary'].update({
            'total_actual': float(total_actual),
            'total_variance': total_variance,
            'variance_percentage': (total_variance / float(budget.total_budget) * 100) if budget.total_budget > 0 else 0
        })
        
        comparison_data.append(budget_comparison)
    
    return jsonify({
        'report_info': {
            'report_name': 'Budget vs Actual Comparison',
            'period_type': period,
            'generated_at': datetime.utcnow().isoformat()
        },
        'comparisons': comparison_data,
        'total_budgets': len(comparison_data)
    })