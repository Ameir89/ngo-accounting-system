# Automated entries
# backend/services/automated_journals.py
from datetime import datetime, date
from decimal import Decimal
from models import db, FixedAsset, DepreciationEntry, JournalEntry, JournalEntryLine, Account, JournalEntryType
from services.financial_calculations import FinancialCalculationService
from sqlalchemy import extract

class AutomatedJournalService:
    @staticmethod
    def create_depreciation_entries(as_of_date=None):
        """Create automated depreciation journal entries"""
        if not as_of_date:
            as_of_date = date.today()
        
        # Get all active fixed assets
        assets = FixedAsset.query.filter_by(is_active=True).all()
        created_entries = []
        
        for asset in assets:
            # Check if depreciation entry already exists for this month
            existing_entry = DepreciationEntry.query.filter(
                DepreciationEntry.asset_id == asset.id,
                extract('year', DepreciationEntry.entry_date) == as_of_date.year,
                extract('month', DepreciationEntry.entry_date) == as_of_date.month
            ).first()
            
            if existing_entry:
                continue  # Skip if already processed
            
            # Calculate monthly depreciation
            monthly_depreciation = FinancialCalculationService.calculate_depreciation(
                asset, asset.depreciation_method.value, 1
            )
            
            if monthly_depreciation <= 0:
                continue
            
            # Create journal entry for depreciation
            entry_number = f"DEP{as_of_date.strftime('%Y%m')}{asset.id:04d}"
            
            # Find depreciation expense and accumulated depreciation accounts
            depreciation_expense_account = Account.query.filter(
                Account.name.contains('Depreciation Expense')
            ).first()
            accumulated_depreciation_account = Account.query.filter(
                Account.name.contains('Accumulated Depreciation')
            ).first()
            
            if not depreciation_expense_account or not accumulated_depreciation_account:
                continue  # Skip if accounts not configured
            
            # Create journal entry
            journal_entry = JournalEntry(
                entry_number=entry_number,
                entry_date=as_of_date,
                description=f"Monthly depreciation for {asset.name}",
                entry_type=JournalEntryType.AUTOMATED,
                total_debit=monthly_depreciation,
                total_credit=monthly_depreciation,
                currency_id=1,  # Base currency
                created_by=1   # System user
            )
            
            db.session.add(journal_entry)
            db.session.flush()
            
            # Create journal entry lines
            debit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                account_id=depreciation_expense_account.id,
                description=f"Depreciation expense - {asset.name}",
                debit_amount=monthly_depreciation,
                credit_amount=Decimal('0'),
                line_number=1
            )
            
            credit_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                account_id=accumulated_depreciation_account.id,
                description=f"Accumulated depreciation - {asset.name}",
                debit_amount=Decimal('0'),
                credit_amount=monthly_depreciation,
                line_number=2
            )
            
            db.session.add_all([debit_line, credit_line])
            
            # Create depreciation entry record
            depreciation_entry = DepreciationEntry(
                asset_id=asset.id,
                entry_date=as_of_date,
                depreciation_amount=monthly_depreciation,
                journal_entry_id=journal_entry.id
            )
            
            db.session.add(depreciation_entry)
            
            # Update accumulated depreciation
            asset.accumulated_depreciation += monthly_depreciation
            
            created_entries.append({
                'asset_id': asset.id,
                'asset_name': asset.name,
                'depreciation_amount': float(monthly_depreciation),
                'journal_entry_id': journal_entry.id
            })
        
        db.session.commit()
        return created_entries