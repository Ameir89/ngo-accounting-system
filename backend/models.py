# Database models

# backend/models.py
from flask_sqlalchemy import SQLAlchemy
from flask_user import UserMixin
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Date, Decimal as SQLDecimal, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
import enum

db = SQLAlchemy()

# Enums for various status and type fields
class AccountType(enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class TransactionType(enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"

class JournalEntryType(enum.Enum):
    MANUAL = "manual"
    AUTOMATED = "automated"

class GrantStatus(enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    COMPLETED = "completed"

class AssetDepreciationMethod(enum.Enum):
    STRAIGHT_LINE = "straight_line"
    DECLINING_BALANCE = "declining_balance"

# User and Role Management
class Role(db.Model):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(Text)  # JSON string of permissions
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="role")

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    language = Column(String(10), default='en')
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    journal_entries = relationship("JournalEntry", back_populates="created_by_user")
    audit_logs = relationship("AuditLog", back_populates="user")

# Chart of Accounts
class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))  # Arabic name
    account_type = Column(Enum(AccountType), nullable=False)
    parent_id = Column(Integer, ForeignKey('accounts.id'))
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    parent = relationship("Account", remote_side=[id], backref="children")
    journal_entry_lines = relationship("JournalEntryLine", back_populates="account")
    
    @hybrid_property
    def full_name(self):
        if self.parent:
            return f"{self.parent.full_name} > {self.name}"
        return self.name

# Cost Centers and Projects
class CostCenter(db.Model):
    __tablename__ = 'cost_centers'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="cost_center")
    journal_entry_lines = relationship("JournalEntryLine", back_populates="cost_center")

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    budget_amount = Column(SQLDecimal(15, 2))
    is_active = Column(Boolean, default=True)
    cost_center_id = Column(Integer, ForeignKey('cost_centers.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cost_center = relationship("CostCenter", back_populates="projects")
    grants = relationship("Grant", back_populates="project")
    journal_entry_lines = relationship("JournalEntryLine", back_populates="project")
    budgets = relationship("Budget", back_populates="project")

# Currency Management
class Currency(db.Model):
    __tablename__ = 'currencies'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(3), unique=True, nullable=False)  # USD, EUR, etc.
    name = Column(String(50), nullable=False)
    symbol = Column(String(5))
    is_base_currency = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    exchange_rates = relationship("ExchangeRate", back_populates="currency")
    journal_entries = relationship("JournalEntry", back_populates="currency")

class ExchangeRate(db.Model):
    __tablename__ = 'exchange_rates'
    
    id = Column(Integer, primary_key=True)
    currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    rate_date = Column(Date, nullable=False)
    rate = Column(SQLDecimal(10, 6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    currency = relationship("Currency", back_populates="exchange_rates")

# Journal Entries
class JournalEntry(db.Model):
    __tablename__ = 'journal_entries'
    
    id = Column(Integer, primary_key=True)
    entry_number = Column(String(20), unique=True, nullable=False)
    entry_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    entry_type = Column(Enum(JournalEntryType), default=JournalEntryType.MANUAL)
    reference_number = Column(String(50))
    total_debit = Column(SQLDecimal(15, 2), default=0)
    total_credit = Column(SQLDecimal(15, 2), default=0)
    currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    exchange_rate = Column(SQLDecimal(10, 6), default=1)
    is_posted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    posted_at = Column(DateTime)
    
    # Relationships
    currency = relationship("Currency", back_populates="journal_entries")
    created_by_user = relationship("User", back_populates="journal_entries")
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")

class JournalEntryLine(db.Model):
    __tablename__ = 'journal_entry_lines'
    
    id = Column(Integer, primary_key=True)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    cost_center_id = Column(Integer, ForeignKey('cost_centers.id'))
    project_id = Column(Integer, ForeignKey('projects.id'))
    description = Column(Text)
    debit_amount = Column(SQLDecimal(15, 2), default=0)
    credit_amount = Column(SQLDecimal(15, 2), default=0)
    line_number = Column(Integer, nullable=False)
    
    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_entry_lines")
    cost_center = relationship("CostCenter", back_populates="journal_entry_lines")
    project = relationship("Project", back_populates="journal_entry_lines")

# Grant and Funding Management
class Donor(db.Model):
    __tablename__ = 'donors'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    grants = relationship("Grant", back_populates="donor")

class Grant(db.Model):
    __tablename__ = 'grants'
    
    id = Column(Integer, primary_key=True)
    grant_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    title_ar = Column(String(200))
    donor_id = Column(Integer, ForeignKey('donors.id'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'))
    amount = Column(SQLDecimal(15, 2), nullable=False)
    currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(GrantStatus), default=GrantStatus.ACTIVE)
    conditions = Column(Text)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    donor = relationship("Donor", back_populates="grants")
    project = relationship("Project", back_populates="grants")
    currency = relationship("Currency")

# Supplier Management
class Supplier(db.Model):
    __tablename__ = 'suppliers'
    
    id = Column(Integer, primary_key=True)
    supplier_number = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(Text)
    tax_number = Column(String(50))
    payment_terms = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    invoices = relationship("SupplierInvoice", back_populates="supplier")

class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'
    
    id = Column(Integer, primary_key=True)
    po_number = Column(String(20), unique=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    order_date = Column(Date, nullable=False)
    delivery_date = Column(Date)
    total_amount = Column(SQLDecimal(15, 2), default=0)
    currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    status = Column(String(20), default='pending')
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    currency = relationship("Currency")
    lines = relationship("PurchaseOrderLine", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderLine(db.Model):
    __tablename__ = 'purchase_order_lines'
    
    id = Column(Integer, primary_key=True)
    purchase_order_id = Column(Integer, ForeignKey('purchase_orders.id'), nullable=False)
    description = Column(String(200), nullable=False)
    quantity = Column(SQLDecimal(10, 2), nullable=False)
    unit_price = Column(SQLDecimal(10, 2), nullable=False)
    total_amount = Column(SQLDecimal(15, 2), nullable=False)
    line_number = Column(Integer, nullable=False)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="lines")

class SupplierInvoice(db.Model):
    __tablename__ = 'supplier_invoices'
    
    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(50), nullable=False)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date)
    total_amount = Column(SQLDecimal(15, 2), nullable=False)
    paid_amount = Column(SQLDecimal(15, 2), default=0)
    currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    status = Column(String(20), default='pending')
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", back_populates="invoices")
    currency = relationship("Currency")
    payments = relationship("Payment", back_populates="invoice")

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True)
    payment_number = Column(String(20), unique=True, nullable=False)
    invoice_id = Column(Integer, ForeignKey('supplier_invoices.id'), nullable=False)
    payment_date = Column(Date, nullable=False)
    amount = Column(SQLDecimal(15, 2), nullable=False)
    payment_method = Column(String(50))
    reference_number = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    invoice = relationship("SupplierInvoice", back_populates="payments")

# Fixed Assets
class FixedAsset(db.Model):
    __tablename__ = 'fixed_assets'
    
    id = Column(Integer, primary_key=True)
    asset_number = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    description = Column(Text)
    purchase_date = Column(Date, nullable=False)
    purchase_cost = Column(SQLDecimal(15, 2), nullable=False)
    useful_life_years = Column(Integer, nullable=False)
    depreciation_method = Column(Enum(AssetDepreciationMethod), default=AssetDepreciationMethod.STRAIGHT_LINE)
    salvage_value = Column(SQLDecimal(15, 2), default=0)
    accumulated_depreciation = Column(SQLDecimal(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    depreciation_entries = relationship("DepreciationEntry", back_populates="asset")
    
    @hybrid_property
    def annual_depreciation(self):
        return (self.purchase_cost - self.salvage_value) / self.useful_life_years
    
    @hybrid_property
    def net_book_value(self):
        return self.purchase_cost - self.accumulated_depreciation

class DepreciationEntry(db.Model):
    __tablename__ = 'depreciation_entries'
    
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('fixed_assets.id'), nullable=False)
    entry_date = Column(Date, nullable=False)
    depreciation_amount = Column(SQLDecimal(15, 2), nullable=False)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    asset = relationship("FixedAsset", back_populates="depreciation_entries")
    journal_entry = relationship("JournalEntry")

# Budget Management
class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100))
    description = Column(Text)
    budget_year = Column(Integer, nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_budget = Column(SQLDecimal(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="budgets")
    lines = relationship("BudgetLine", back_populates="budget", cascade="all, delete-orphan")

class BudgetLine(db.Model):
    __tablename__ = 'budget_lines'
    
    id = Column(Integer, primary_key=True)
    budget_id = Column(Integer, ForeignKey('budgets.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    cost_center_id = Column(Integer, ForeignKey('cost_centers.id'))
    budgeted_amount = Column(SQLDecimal(15, 2), nullable=False)
    period_month = Column(Integer)  # 1-12 for monthly budgets
    notes = Column(Text)
    
    # Relationships
    budget = relationship("Budget", back_populates="lines")
    account = relationship("Account")
    cost_center = relationship("CostCenter")

# Audit Trail
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = Column(Text)  # JSON string of old values
    new_values = Column(Text)  # JSON string of new values
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))
    user_agent = Column(String(200))
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

# Organization Settings
class OrganizationSettings(db.Model):
    __tablename__ = 'organization_settings'
    
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(200), nullable=False)
    organization_name_ar = Column(String(200))
    logo_url = Column(String(500))
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(100))
    website = Column(String(200))
    tax_number = Column(String(50))
    base_currency_id = Column(Integer, ForeignKey('currencies.id'), nullable=False)
    fiscal_year_start = Column(Date)
    fiscal_year_end = Column(Date)
    default_language = Column(String(10), default='en')
    date_format = Column(String(20), default='DD/MM/YYYY')
    time_zone = Column(String(50), default='UTC')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    base_currency = relationship("Currency")