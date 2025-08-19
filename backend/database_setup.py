# Database initialization
# backend/database_setup.py

import sys
import os
from flask import Flask
from sqlalchemy import text
from models import db, Role, User, Currency, Account, AccountType, OrganizationSettings
from werkzeug.security import generate_password_hash
from datetime import date
from dotenv import load_dotenv


def create_app():
    """Create Flask app for database setup"""
    app = Flask(__name__)
    load_dotenv()
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        raise ValueError("❌ DATABASE_URL environment variable not set!")

    print(f"✅ Using database URL: {database_url}")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'dev-secret-key'
    
    db.init_app(app)
    return app

def create_database():
    """Create all database tables"""
    print("Creating database tables...")
    db.create_all()
    print("Database tables created successfully!")

def create_default_roles():
    """Create default user roles"""
    print("Creating default roles...")
    
    roles_data = [
        {
            'name': 'Administrator',
            'description': 'Full system access',
            'permissions': '["*"]'
        },
        {
            'name': 'Financial Manager',
            'description': 'Financial management and reporting',
            'permissions': '["account_create", "account_read", "account_update", "journal_create", "journal_read", "journal_update", "journal_post", "cost_center_read", "project_read", "budget_read", "grant_read", "supplier_read", "asset_read", "reports_read", "dashboard_read"]'
        },
        {
            'name': 'Accountant',
            'description': 'Accounting operations',
            'permissions': '["account_read", "journal_create", "journal_read", "cost_center_read", "project_read", "reports_read", "dashboard_read"]'
        },
        {
            'name': 'Data Entry Clerk',
            'description': 'Data entry operations',
            'permissions': '["account_read", "journal_create", "journal_read", "cost_center_read", "project_read", "dashboard_read"]'
        },
        {
            'name': 'Auditor',
            'description': 'Audit and review access',
            'permissions': '["account_read", "journal_read", "cost_center_read", "project_read", "budget_read", "grant_read", "supplier_read", "asset_read", "reports_read", "dashboard_read", "audit_read"]'
        }
    ]
    
    for role_data in roles_data:
        if not Role.query.filter_by(name=role_data['name']).first():
            role = Role(**role_data)
            db.session.add(role)
    
    db.session.commit()
    print("Default roles created successfully!")

def create_admin_user():
    """Create default admin user"""
    print("Creating admin user...")
    
    admin_role = Role.query.filter_by(name='Administrator').first()
    if not admin_role:
        print("Error: Administrator role not found!")
        return
    
    if not User.query.filter_by(username='admin').first():
        admin_user = User(
            username='admin',
            email='admin@ngo.org',
            password=generate_password_hash('admin123'),
            first_name='System',
            last_name='Administrator',
            role_id=admin_role.id,
            language='en'
        )
        db.session.add(admin_user)
        db.session.commit()
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
    else:
        print("Admin user already exists!")

def create_default_currencies():
    """Create default currencies"""
    print("Creating default currencies...")
    
    currencies_data = [
        {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'is_base_currency': True},
        {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
        {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'},
        {'code': 'AED', 'name': 'UAE Dirham', 'symbol': 'د.إ'},
        {'code': 'SAR', 'name': 'Saudi Riyal', 'symbol': 'ر.س'},
        {'code': 'JOD', 'name': 'Jordanian Dinar', 'symbol': 'د.ا'},
    ]
    
    for currency_data in currencies_data:
        if not Currency.query.filter_by(code=currency_data['code']).first():
            currency = Currency(**currency_data)
            db.session.add(currency)
    
    db.session.commit()
    print("Default currencies created successfully!")

def create_chart_of_accounts():
    """Create standard NGO chart of accounts"""
    print("Creating chart of accounts...")
    
    accounts_data = [
        # Assets
        {'code': '1000', 'name': 'ASSETS', 'name_ar': 'الأصول', 'account_type': AccountType.ASSET, 'level': 0},
        {'code': '1100', 'name': 'Current Assets', 'name_ar': 'الأصول المتداولة', 'account_type': AccountType.ASSET, 'parent_code': '1000', 'level': 1},
        {'code': '1110', 'name': 'Cash and Cash Equivalents', 'name_ar': 'النقد وما في حكمه', 'account_type': AccountType.ASSET, 'parent_code': '1100', 'level': 2},
        {'code': '1111', 'name': 'Bank Account - Main Operating', 'name_ar': 'حساب البنك - التشغيل الرئيسي', 'account_type': AccountType.ASSET, 'parent_code': '1110', 'level': 3},
        {'code': '1112', 'name': 'Bank Account - Restricted Funds', 'name_ar': 'حساب البنك - الأموال المقيدة', 'account_type': AccountType.ASSET, 'parent_code': '1110', 'level': 3},
        {'code': '1120', 'name': 'Accounts Receivable', 'name_ar': 'الذمم المدينة', 'account_type': AccountType.ASSET, 'parent_code': '1100', 'level': 2},
        {'code': '1121', 'name': 'Grants Receivable', 'name_ar': 'المنح المستحقة', 'account_type': AccountType.ASSET, 'parent_code': '1120', 'level': 3},
        {'code': '1122', 'name': 'Donations Receivable', 'name_ar': 'التبرعات المستحقة', 'account_type': AccountType.ASSET, 'parent_code': '1120', 'level': 3},
        
        # Fixed Assets
        {'code': '1200', 'name': 'Fixed Assets', 'name_ar': 'الأصول الثابتة', 'account_type': AccountType.ASSET, 'parent_code': '1000', 'level': 1},
        {'code': '1210', 'name': 'Property and Equipment', 'name_ar': 'الممتلكات والمعدات', 'account_type': AccountType.ASSET, 'parent_code': '1200', 'level': 2},
        {'code': '1211', 'name': 'Office Equipment', 'name_ar': 'معدات المكتب', 'account_type': AccountType.ASSET, 'parent_code': '1210', 'level': 3},
        {'code': '1212', 'name': 'Vehicles', 'name_ar': 'المركبات', 'account_type': AccountType.ASSET, 'parent_code': '1210', 'level': 3},
        {'code': '1220', 'name': 'Accumulated Depreciation', 'name_ar': 'مجمع الاستهلاك', 'account_type': AccountType.ASSET, 'parent_code': '1200', 'level': 2},
        
        # Liabilities
        {'code': '2000', 'name': 'LIABILITIES', 'name_ar': 'الالتزامات', 'account_type': AccountType.LIABILITY, 'level': 0},
        {'code': '2100', 'name': 'Current Liabilities', 'name_ar': 'الالتزامات المتداولة', 'account_type': AccountType.LIABILITY, 'parent_code': '2000', 'level': 1},
        {'code': '2110', 'name': 'Accounts Payable', 'name_ar': 'الذمم الدائنة', 'account_type': AccountType.LIABILITY, 'parent_code': '2100', 'level': 2},
        {'code': '2120', 'name': 'Accrued Expenses', 'name_ar': 'المصروفات المستحقة', 'account_type': AccountType.LIABILITY, 'parent_code': '2100', 'level': 2},
        
        # Equity/Net Assets
        {'code': '3000', 'name': 'NET ASSETS', 'name_ar': 'صافي الأصول', 'account_type': AccountType.EQUITY, 'level': 0},
        {'code': '3100', 'name': 'Unrestricted Net Assets', 'name_ar': 'صافي الأصول غير المقيدة', 'account_type': AccountType.EQUITY, 'parent_code': '3000', 'level': 1},
        {'code': '3200', 'name': 'Temporarily Restricted Net Assets', 'name_ar': 'صافي الأصول المقيدة مؤقتاً', 'account_type': AccountType.EQUITY, 'parent_code': '3000', 'level': 1},
        
        # Revenue
        {'code': '4000', 'name': 'REVENUE', 'name_ar': 'الإيرادات', 'account_type': AccountType.REVENUE, 'level': 0},
        {'code': '4100', 'name': 'Grant Revenue', 'name_ar': 'إيرادات المنح', 'account_type': AccountType.REVENUE, 'parent_code': '4000', 'level': 1},
        {'code': '4200', 'name': 'Donation Revenue', 'name_ar': 'إيرادات التبرعات', 'account_type': AccountType.REVENUE, 'parent_code': '4000', 'level': 1},
        {'code': '4300', 'name': 'Service Revenue', 'name_ar': 'إيرادات الخدمات', 'account_type': AccountType.REVENUE, 'parent_code': '4000', 'level': 1},
        
        # Expenses
        {'code': '5000', 'name': 'EXPENSES', 'name_ar': 'المصروفات', 'account_type': AccountType.EXPENSE, 'level': 0},
        {'code': '5100', 'name': 'Program Services', 'name_ar': 'خدمات البرامج', 'account_type': AccountType.EXPENSE, 'parent_code': '5000', 'level': 1},
        {'code': '5110', 'name': 'Education Programs', 'name_ar': 'برامج التعليم', 'account_type': AccountType.EXPENSE, 'parent_code': '5100', 'level': 2},
        {'code': '5120', 'name': 'Health Programs', 'name_ar': 'برامج الصحة', 'account_type': AccountType.EXPENSE, 'parent_code': '5100', 'level': 2},
        {'code': '5200', 'name': 'Supporting Services', 'name_ar': 'الخدمات الداعمة', 'account_type': AccountType.EXPENSE, 'parent_code': '5000', 'level': 1},
        {'code': '5210', 'name': 'Management and General', 'name_ar': 'الإدارة والعموم', 'account_type': AccountType.EXPENSE, 'parent_code': '5200', 'level': 2},
        {'code': '5220', 'name': 'Fundraising', 'name_ar': 'جمع التبرعات', 'account_type': AccountType.EXPENSE, 'parent_code': '5200', 'level': 2},
        {'code': '5300', 'name': 'Personnel Costs', 'name_ar': 'تكاليف الموظفين', 'account_type': AccountType.EXPENSE, 'parent_code': '5000', 'level': 1},
        {'code': '5310', 'name': 'Salaries and Wages', 'name_ar': 'الرواتب والأجور', 'account_type': AccountType.EXPENSE, 'parent_code': '5300', 'level': 2},
        {'code': '5320', 'name': 'Employee Benefits', 'name_ar': 'مزايا الموظفين', 'account_type': AccountType.EXPENSE, 'parent_code': '5300', 'level': 2},
        {'code': '5400', 'name': 'Operating Expenses', 'name_ar': 'المصروفات التشغيلية', 'account_type': AccountType.EXPENSE, 'parent_code': '5000', 'level': 1},
        {'code': '5410', 'name': 'Office Supplies', 'name_ar': 'مستلزمات المكتب', 'account_type': AccountType.EXPENSE, 'parent_code': '5400', 'level': 2},
        {'code': '5420', 'name': 'Utilities', 'name_ar': 'المرافق', 'account_type': AccountType.EXPENSE, 'parent_code': '5400', 'level': 2},
        {'code': '5430', 'name': 'Communications', 'name_ar': 'الاتصالات', 'account_type': AccountType.EXPENSE, 'parent_code': '5400', 'level': 2},
        {'code': '5500', 'name': 'Depreciation Expense', 'name_ar': 'مصروف الاستهلاك', 'account_type': AccountType.EXPENSE, 'parent_code': '5000', 'level': 1},
    ]
    
    # Create accounts with proper parent relationships
    created_accounts = {}
    
    for account_data in accounts_data:
        if not Account.query.filter_by(code=account_data['code']).first():
            parent_id = None
            if 'parent_code' in account_data:
                parent_account = created_accounts.get(account_data['parent_code'])
                if parent_account:
                    parent_id = parent_account.id
            
            account = Account(
                code=account_data['code'],
                name=account_data['name'],
                name_ar=account_data['name_ar'],
                account_type=account_data['account_type'],
                parent_id=parent_id,
                level=account_data['level']
            )
            db.session.add(account)
            db.session.flush()  # Get the ID
            created_accounts[account_data['code']] = account
    
    db.session.commit()
    print("Chart of accounts created successfully!")

def create_organization_settings():
    """Create default organization settings"""
    print("Creating organization settings...")
    
    if not OrganizationSettings.query.first():
        base_currency = Currency.query.filter_by(is_base_currency=True).first()
        
        settings = OrganizationSettings(
            organization_name='Sample NGO Organization',
            organization_name_ar='منظمة خيرية نموذجية',
            address='123 Main Street, City, Country',
            phone='+1-234-567-8900',
            email='info@ngo.org',
            website='www.ngo.org',
            base_currency_id=base_currency.id if base_currency else 1,
            fiscal_year_start=date(2024, 1, 1),
            fiscal_year_end=date(2024, 12, 31),
            default_language='en'
        )
        db.session.add(settings)
        db.session.commit()
        print("Organization settings created successfully!")

def main():
    """Main setup function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
    else:
        command = 'create'
    
    app = create_app()
    
    with app.app_context():
        if command == 'create':
            create_database()
            create_default_currencies()
            create_default_roles()
            create_admin_user()
            create_chart_of_accounts()
            create_organization_settings()
            print("\nDatabase setup completed successfully!")
            print("\nYou can now start the application with:")
            print("python app.py")
        elif command == 'reset':
            print("Dropping all tables...")
            db.drop_all()
            main()
        else:
            print("Usage: python database_setup.py [create|reset]")

if __name__ == '__main__':
    main()