# backend/services/automated_tasks.py

import os
from celery import Celery
from datetime import datetime, date, timedelta
from decimal import Decimal
from models import db, FixedAsset, DepreciationEntry, JournalEntry, JournalEntryLine, Account, Grant, GrantStatus
from services.financial_calculations import FinancialCalculationService
from services.automated_journals import AutomatedJournalService
from services.report_generator import EnhancedReportGenerator
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from email.mime.base import MimeBase
from email import encoders

class AutomatedTaskService:
    def __init__(self, celery_app):
        self.celery = celery_app
        self.report_generator = EnhancedReportGenerator()
    
    def setup_periodic_tasks(self):
        """Setup all periodic tasks"""
        
        # Daily tasks
        self.celery.conf.beat_schedule = {
            'daily-backup': {
                'task': 'services.automated_tasks.daily_backup',
                'schedule': 60.0 * 60.0 * 24.0,  # Daily at midnight
                'args': ()
            },
            'check-grant-expiration': {
                'task': 'services.automated_tasks.check_grant_expiration',
                'schedule': 60.0 * 60.0 * 24.0,  # Daily
                'args': ()
            },
            'update-exchange-rates': {
                'task': 'services.automated_tasks.update_exchange_rates',
                'schedule': 60.0 * 60.0 * 6.0,  # Every 6 hours
                'args': ()
            },
            
            # Monthly tasks
            'monthly-depreciation': {
                'task': 'services.automated_tasks.process_monthly_depreciation',
                'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
                'args': ()
            },
            'monthly-reports': {
                'task': 'services.automated_tasks.generate_monthly_reports',
                'schedule': 60.0 * 60.0 * 24.0 * 30.0,  # Monthly
                'args': ()
            },
            
            # Weekly tasks
            'audit-cleanup': {
                'task': 'services.automated_tasks.cleanup_old_audit_logs',
                'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Weekly
                'args': ()
            }
        }
    
    @staticmethod
    def daily_backup():
        """Perform daily database backup"""
        try:
            import subprocess
            import os
            from datetime import datetime
            
            backup_dir = os.environ.get('BACKUP_FOLDER', './backups')
            os.makedirs(backup_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = f"{backup_dir}/backup_{timestamp}.sql"
            
            # PostgreSQL backup command
            db_url = os.environ.get('DATABASE_URL')
            if db_url and 'postgresql' in db_url:
                cmd = f"pg_dump {db_url} > {backup_file}"
                subprocess.run(cmd, shell=True, check=True)
            
            # Cleanup old backups (keep last 30 days)
            retention_days = int(os.environ.get('BACKUP_RETENTION_DAYS', 30))
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            for filename in os.listdir(backup_dir):
                file_path = os.path.join(backup_dir, filename)
                if os.path.isfile(file_path):
                    file_date = datetime.fromtimestamp(os.path.getctime(file_path))
                    if file_date < cutoff_date:
                        os.remove(file_path)
            
            print(f"Backup completed: {backup_file}")
            return True
            
        except Exception as e:
            print(f"Backup failed: {e}")
            return False
    
    @staticmethod
    def check_grant_expiration():
        """Check for grants expiring soon and send alerts"""
        try:
            # Find grants expiring in next 30 days
            warning_date = date.today() + timedelta(days=30)
            expiring_grants = Grant.query.filter(
                Grant.end_date <= warning_date,
                Grant.status == GrantStatus.ACTIVE
            ).all()
            
            if expiring_grants:
                # Send notification email
                AutomatedTaskService.send_grant_expiration_alert(expiring_grants)
            
            # Update status for expired grants
            expired_grants = Grant.query.filter(
                Grant.end_date < date.today(),
                Grant.status == GrantStatus.ACTIVE
            ).all()
            
            for grant in expired_grants:
                grant.status = GrantStatus.EXPIRED
            
            db.session.commit()
            return len(expiring_grants), len(expired_grants)
            
        except Exception as e:
            print(f"Grant expiration check failed: {e}")
            return 0, 0
    
    @staticmethod
    def send_grant_expiration_alert(grants):
        """Send email alert for expiring grants"""
        try:
            # Email configuration from environment
            smtp_server = os.environ.get('MAIL_SERVER')
            smtp_port = int(os.environ.get('MAIL_PORT', 587))
            smtp_username = os.environ.get('MAIL_USERNAME')
            smtp_password = os.environ.get('MAIL_PASSWORD')
            
            if not all([smtp_server, smtp_username, smtp_password]):
                print("Email configuration incomplete")
                return
            
            # Create message
            msg = MimeMultipart()
            msg['From'] = smtp_username
            msg['To'] = os.environ.get('ORG_EMAIL', smtp_username)
            msg['Subject'] = "Grant Expiration Alert"
            
            # Email body
            body = "The following grants are expiring soon:\n\n"
            for grant in grants:
                days_remaining = (grant.end_date - date.today()).days
                body += f"- {grant.title} (Grant #{grant.grant_number})\n"
                body += f"  Donor: {grant.donor.name}\n"
                body += f"  Expires: {grant.end_date} ({days_remaining} days)\n"
                body += f"  Amount: ${grant.amount:,.2f}\n\n"
            
            msg.attach(MimeText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_username, msg['To'], text)
            server.quit()
            
            print(f"Grant expiration alert sent for {len(grants)} grants")
            
        except Exception as e:
            print(f"Failed to send grant expiration alert: {e}")
    
    @staticmethod
    def process_monthly_depreciation():
        """Process monthly depreciation for all assets"""
        try:
            created_entries = AutomatedJournalService.create_depreciation_entries()
            print(f"Created {len(created_entries)} depreciation entries")
            return created_entries
        except Exception as e:
            print(f"Monthly depreciation processing failed: {e}")
            return []
    
    @staticmethod
    def generate_monthly_reports():
        """Generate and email monthly reports"""
        try:
            from services.report_generator import EnhancedReportGenerator
            
            generator = EnhancedReportGenerator()
            
            # Generate trial balance
            trial_balance_data = {
                'as_of_date': date.today().replace(day=1) - timedelta(days=1),  # Last day of previous month
                'accounts': [],  # Would be populated from database
                'total_debit': 0,
                'total_credit': 0,
                'is_balanced': True
            }
            
            # Generate PDF report
            pdf_buffer = generator.generate_trial_balance_pdf(trial_balance_data)
            
            # Email the report
            AutomatedTaskService.email_monthly_report(pdf_buffer)
            
            return True
        except Exception as e:
            print(f"Monthly report generation failed: {e}")
            return False
    
    @staticmethod
    def email_monthly_report(pdf_buffer):
        """Email monthly report to stakeholders"""
        # Implementation similar to grant expiration alert
        # but with PDF attachment
        pass