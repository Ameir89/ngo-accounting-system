# backend/tests/test_api.py

import pytest
import json
from datetime import date, datetime
from decimal import Decimal
from flask import Flask
from models import db, User, Role, Account, AccountType, JournalEntry, JournalEntryType
from app import create_app
from werkzeug.security import generate_password_hash

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def auth_headers(app):
    """Create authentication headers for testing"""
    with app.app_context():
        # Create test role
        role = Role(name='Administrator', permissions='["*"]')
        db.session.add(role)
        db.session.flush()
        
        # Create test user
        user = User(
            username='testuser',
            email='test@example.com',
            password=generate_password_hash('testpass'),
            first_name='Test',
            last_name='User',
            role_id=role.id
        )
        db.session.add(user)
        db.session.commit()
        
        # Login and get token
        from services.auth import authService
        token_data = authService.create_access_token(user.id)
        
        return {'Authorization': f'Bearer {token_data["access_token"]}'}

@pytest.fixture
def sample_accounts(app):
    """Create sample accounts for testing"""
    with app.app_context():
        accounts = [
            Account(code='1000', name='Assets', account_type=AccountType.ASSET, level=0),
            Account(code='1100', name='Current Assets', account_type=AccountType.ASSET, level=1),
            Account(code='2000', name='Liabilities', account_type=AccountType.LIABILITY, level=0),
            Account(code='4000', name='Revenue', account_type=AccountType.REVENUE, level=0),
            Account(code='5000', name='Expenses', account_type=AccountType.EXPENSE, level=0)
        ]
        
        for account in accounts:
            db.session.add(account)
        
        # Set parent relationships
        accounts[1].parent_id = accounts[0].id
        
        db.session.commit()
        return accounts

class TestAccountsAPI:
    """Test cases for Accounts API"""
    
    def test_get_accounts_unauthorized(self, client):
        """Test getting accounts without authentication"""
        response = client.get('/api/accounts')
        assert response.status_code == 401
    
    def test_get_accounts_authorized(self, client, auth_headers, sample_accounts):
        """Test getting accounts with authentication"""
        response = client.get('/api/accounts', headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'accounts' in data
        assert len(data['accounts']) == 5
    
    def test_create_account(self, client, auth_headers):
        """Test creating a new account"""
        account_data = {
            'code': '1110',
            'name': 'Cash',
            'name_ar': 'النقد',
            'account_type': 'asset',
            'description': 'Cash accounts'
        }
        
        response = client.post(
            '/api/accounts',
            headers=auth_headers,
            data=json.dumps(account_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['code'] == '1110'
        assert data['name'] == 'Cash'
    
    def test_create_account_duplicate_code(self, client, auth_headers, sample_accounts):
        """Test creating account with duplicate code"""
        account_data = {
            'code': '1000',  # Duplicate code
            'name': 'Test Account',
            'account_type': 'asset'
        }
        
        response = client.post(
            '/api/accounts',
            headers=auth_headers,
            data=json.dumps(account_data),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'already exists' in data['message']
    
    def test_update_account(self, client, auth_headers, sample_accounts):
        """Test updating an existing account"""
        account = sample_accounts[0]
        update_data = {
            'name': 'Updated Assets',
            'description': 'Updated description'
        }
        
        response = client.put(
            f'/api/accounts/{account.id}',
            headers=auth_headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['name'] == 'Updated Assets'

class TestJournalEntriesAPI:
    """Test cases for Journal Entries API"""
    
    def test_create_journal_entry(self, client, auth_headers, sample_accounts):
        """Test creating a balanced journal entry"""
        entry_data = {
            'entry_date': '2024-01-15',
            'description': 'Test journal entry',
            'entry_type': 'manual',
            'lines': [
                {
                    'account_id': sample_accounts[0].id,
                    'description': 'Debit line',
                    'debit_amount': 1000,
                    'credit_amount': 0,
                    'line_number': 1
                },
                {
                    'account_id': sample_accounts[2].id,
                    'description': 'Credit line',
                    'debit_amount': 0,
                    'credit_amount': 1000,
                    'line_number': 2
                }
            ]
        }
        
        response = client.post(
            '/api/journal-entries',
            headers=auth_headers,
            data=json.dumps(entry_data),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['total_debit'] == 1000
        assert data['total_credit'] == 1000
        assert not data['is_posted']
    
    def test_create_unbalanced_journal_entry(self, client, auth_headers, sample_accounts):
        """Test creating an unbalanced journal entry"""
        entry_data = {
            'entry_date': '2024-01-15',
            'description': 'Unbalanced entry',
            'lines': [
                {
                    'account_id': sample_accounts[0].id,
                    'debit_amount': 1000,
                    'credit_amount': 0
                },
                {
                    'account_id': sample_accounts[2].id,
                    'debit_amount': 0,
                    'credit_amount': 500  # Unbalanced
                }
            ]
        }
        
        response = client.post(
            '/api/journal-entries',
            headers=auth_headers,
            data=json.dumps(entry_data),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'equal' in data['message'].lower()