# backend/services/data_exchange_service.py

import pandas as pd
import json
from io import StringIO, BytesIO
from datetime import datetime
from decimal import Decimal
from models import (
    AccountType, db, Account, JournalEntry, JournalEntryLine, Supplier, 
    Grant, Project, CostCenter, User
)
from services.audit_service import log_audit_trail

class DataExchangeService:
    """Service for importing and exporting data"""
    
    @staticmethod
    def import_chart_of_accounts(file_content, file_type='csv'):
        """Import chart of accounts from CSV or Excel file"""
        try:
            # Parse file based on type
            if file_type == 'csv':
                df = pd.read_csv(StringIO(file_content))
            elif file_type == 'excel':
                df = pd.read_excel(BytesIO(file_content))
            else:
                raise ValueError("Unsupported file type")
            
            # Validate required columns
            required_columns = ['code', 'name', 'account_type']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return {'success': False, 'error': f'Missing columns: {missing_columns}'}
            
            # Validate data
            validation_errors = DataExchangeService._validate_accounts_data(df)
            if validation_errors:
                return {'success': False, 'errors': validation_errors}
            
            # Import accounts
            imported_count = 0
            updated_count = 0
            errors = []
            
            # Sort by level or parent relationships to ensure proper hierarchy
            df = df.sort_values(['parent_code', 'code'], na_position='first')
            
            for index, row in df.iterrows():
                try:
                    # Check if account exists
                    existing_account = Account.query.filter_by(code=row['code']).first()
                    
                    if existing_account:
                        # Update existing account
                        existing_account.name = row['name']
                        existing_account.name_ar = row.get('name_ar')
                        existing_account.description = row.get('description')
                        updated_count += 1
                        
                        log_audit_trail('accounts', existing_account.id, 'UPDATE', 
                                      old_values={'name': existing_account.name}, 
                                      new_values={'name': row['name']})
                    else:
                        # Create new account
                        parent_id = None
                        level = 0
                        
                        if pd.notna(row.get('parent_code')):
                            parent_account = Account.query.filter_by(code=row['parent_code']).first()
                            if parent_account:
                                parent_id = parent_account.id
                                level = parent_account.level + 1
                        
                        account = Account(
                            code=row['code'],
                            name=row['name'],
                            name_ar=row.get('name_ar'),
                            account_type=AccountType(row['account_type']),
                            parent_id=parent_id,
                            level=level,
                            description=row.get('description')
                        )
                        
                        db.session.add(account)
                        imported_count += 1
                        
                        log_audit_trail('accounts', account.id, 'INSERT', 
                                      new_values={'code': account.code, 'name': account.name})
                
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
            
            if not errors:
                db.session.commit()
            else:
                db.session.rollback()
                return {'success': False, 'errors': errors}
            
            return {
                'success': True,
                'imported': imported_count,
                'updated': updated_count,
                'total_processed': len(df)
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def import_journal_entries(file_content, file_type='csv'):
        """Import journal entries from file"""
        try:
            if file_type == 'csv':
                df = pd.read_csv(StringIO(file_content))
            elif file_type == 'excel':
                df = pd.read_excel(BytesIO(file_content))
            
            # Validate required columns
            required_columns = ['entry_date', 'description', 'account_code', 'debit_amount', 'credit_amount']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return {'success': False, 'error': f'Missing columns: {missing_columns}'}
            
            # Group by entry (assuming entry_number or entry_id groups lines)
            if 'entry_number' in df.columns:
                grouped = df.groupby('entry_number')
            else:
                # If no entry number, group by date and description
                grouped = df.groupby(['entry_date', 'description'])
            
            imported_entries = 0
            errors = []
            
            for group_key, group_df in grouped:
                try:
                    # Validate entry balance
                    total_debit = group_df['debit_amount'].sum()
                    total_credit = group_df['credit_amount'].sum()
                    
                    if abs(total_debit - total_credit) > 0.01:
                        errors.append(f"Entry {group_key}: Unbalanced entry (Debit: {total_debit}, Credit: {total_credit})")
                        continue
                    
                    # Create journal entry
                    first_row = group_df.iloc[0]
                    entry = JournalEntry(
                        entry_number=DataExchangeService._generate_entry_number(),
                        entry_date=pd.to_datetime(first_row['entry_date']).date(),
                        description=first_row['description'],
                        entry_type='manual',
                        total_debit=Decimal(str(total_debit)),
                        total_credit=Decimal(str(total_credit)),
                        currency_id=1,  # Default currency
                        created_by=1   # System import user
                    )
                    
                    db.session.add(entry)
                    db.session.flush()
                    
                    # Create journal entry lines
                    for _, line_row in group_df.iterrows():
                        account = Account.query.filter_by(code=line_row['account_code']).first()
                        if not account:
                            errors.append(f"Entry {group_key}: Account code {line_row['account_code']} not found")
                            continue
                        
                        line = JournalEntryLine(
                            journal_entry_id=entry.id,
                            account_id=account.id,
                            description=line_row.get('line_description', ''),
                            debit_amount=Decimal(str(line_row['debit_amount'] or 0)),
                            credit_amount=Decimal(str(line_row['credit_amount'] or 0)),
                            line_number=1
                        )
                        
                        db.session.add(line)
                    
                    imported_entries += 1
                    
                except Exception as e:
                    errors.append(f"Entry {group_key}: {str(e)}")
            
            if not errors:
                db.session.commit()
            else:
                db.session.rollback()
                return {'success': False, 'errors': errors}
            
            return {
                'success': True,
                'imported_entries': imported_entries,
                'total_processed': len(grouped)
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def export_trial_balance(as_of_date, format='excel'):
        """Export trial balance data"""
        # Get trial balance data (similar to reports API)
        trial_balance_data = DataExchangeService._get_trial_balance_data(as_of_date)
        
        if format == 'excel':
            return DataExchangeService._export_to_excel(trial_balance_data, 'trial_balance')
        elif format == 'csv':
            return DataExchangeService._export_to_csv(trial_balance_data)
        else:
            return DataExchangeService._export_to_json(trial_balance_data)
    
    @staticmethod
    def _validate_accounts_data(df):
        """Validate accounts data before import"""
        errors = []
        
        # Check for duplicate codes
        duplicate_codes = df[df.duplicated(['code'], keep=False)]['code'].unique()
        if len(duplicate_codes) > 0:
            errors.append(f"Duplicate account codes: {duplicate_codes.tolist()}")
        
        # Validate account types
        valid_types = ['asset', 'liability', 'equity', 'revenue', 'expense']
        invalid_types = df[~df['account_type'].isin(valid_types)]['account_type'].unique()
        if len(invalid_types) > 0:
            errors.append(f"Invalid account types: {invalid_types.tolist()}")
        
        # Check parent codes exist (if specified)
        parent_codes = df['parent_code'].dropna().unique()
        existing_codes = Account.query.with_entities(Account.code).all()
        existing_codes = [code[0] for code in existing_codes]
        all_codes = df['code'].tolist() + existing_codes
        
        missing_parents = [code for code in parent_codes if code not in all_codes]
        if missing_parents:
            errors.append(f"Parent codes not found: {missing_parents}")
        
        return errors
    
    @staticmethod
    def _generate_entry_number():
        """Generate unique journal entry number"""
        today = datetime.now()
        count = JournalEntry.query.filter(
            JournalEntry.entry_date == today.date()
        ).count()
        return f"IMP{today.strftime('%Y%m%d')}{count + 1:04d}"