#  backend/services/report_scheduler.py

from datetime import datetime, timedelta
from models import db, User, Grant, Project
from services.report_generator import EnhancedReportGenerator
from services.analytics_service import AdvancedAnalyticsService
import smtplib
from email.mime.multipart import MimeMultipart
from email.mime.text import MimeText
from email.mime.base import MimeBase
from email import encoders
import os

class ReportScheduler:
    """Automated report generation and distribution service"""
    
    def __init__(self):
        self.report_generator = EnhancedReportGenerator()
        self.analytics_service = AdvancedAnalyticsService()
    
    def generate_monthly_board_report(self):
        """Generate comprehensive monthly report for board of directors"""
        end_date = date.today().replace(day=1) - timedelta(days=1)  # Last day of previous month
        start_date = end_date.replace(day=1)  # First day of previous month
        
        # Get analytics data
        dashboard_data = self.analytics_service.get_financial_dashboard_data(start_date, end_date)
        
        # Generate trial balance data
        trial_balance_data = self._get_trial_balance_data(end_date)
        
        # Generate income statement data
        income_statement_data = self._get_income_statement_data(start_date, end_date)
        
        # Create comprehensive report
        report_content = {
            'report_title': f'Monthly Financial Report - {start_date.strftime("%B %Y")}',
            'period': f'{start_date.strftime("%B %d, %Y")} to {end_date.strftime("%B %d, %Y")}',
            'executive_summary': self._create_executive_summary(dashboard_data),
            'financial_position': trial_balance_data,
            'financial_performance': income_statement_data,
            'analytics': dashboard_data,
            'key_metrics': self._calculate_board_metrics(dashboard_data),
            'alerts_and_recommendations': self._generate_recommendations(dashboard_data)
        }
        
        # Generate PDF report
        pdf_buffer = self.report_generator.generate_board_report_pdf(report_content)
        
        # Generate Excel workbook with detailed data
        excel_buffer = self.report_generator.generate_board_report_excel(report_content)
        
        # Send to board members
        board_emails = self._get_board_member_emails()
        self._email_board_report(pdf_buffer, excel_buffer, report_content, board_emails)
        
        return report_content
    
    def generate_donor_reports(self):
        """Generate individual reports for each active donor"""
        active_grants = Grant.query.filter_by(status='active').all()
        
        donor_reports = {}
        
        for grant in active_grants:
            donor_id = grant.donor_id
            
            if donor_id not in donor_reports:
                donor_reports[donor_id] = {
                    'donor': grant.donor,
                    'grants': [],
                    'total_funding': 0,
                    'total_utilized': 0
                }
            
            # Calculate grant utilization
            grant_utilization = self._calculate_grant_utilization(grant)
            
            donor_reports[donor_id]['grants'].append({
                'grant': grant,
                'utilization': grant_utilization
            })
            donor_reports[donor_id]['total_funding'] += float(grant.amount)
            donor_reports[donor_id]['total_utilized'] += grant_utilization['utilized_amount']
        
        # Generate individual donor reports
        for donor_id, donor_data in donor_reports.items():
            self._generate_individual_donor_report(donor_data)
        
        return len(donor_reports)
    
    def generate_compliance_reports(self):
        """Generate compliance reports for regulatory requirements"""
        reports_generated = []
        
        # Generate annual tax-exempt compliance report
        if self._is_year_end():
            tax_report = self._generate_tax_exempt_report()
            reports_generated.append('tax_exempt_compliance')
        
        # Generate quarterly regulatory reports
        if self._is_quarter_end():
            regulatory_report = self._generate_regulatory_report()
            reports_generated.append('quarterly_regulatory')
        
        # Generate monthly internal compliance report
        internal_report = self._generate_internal_compliance_report()
        reports_generated.append('internal_compliance')
        
        return reports_generated
    
    def _create_executive_summary(self, dashboard_data):
        """Create executive summary for board report"""
        revenue = dashboard_data['revenue_analysis']['total_revenue']
        expenses = dashboard_data['expense_analysis']['total_expenses']
        net_income = revenue - expenses
        cash_position = dashboard_data['cash_position']['total_cash']
        
        summary = f"""
        EXECUTIVE SUMMARY
        
        Financial Performance:
        • Total Revenue: ${revenue:,.2f}
        • Total Expenses: ${expenses:,.2f}
        • Net Income: ${net_income:,.2f}
        • Cash Position: ${cash_position:,.2f}
        
        Key Highlights:
        • Program Expense Ratio: {dashboard_data['expense_analysis']['expense_ratios']['program_ratio']:.1f}%
        • Administrative Expense Ratio: {dashboard_data['expense_analysis']['expense_ratios']['admin_ratio']:.1f}%
        • Grant Utilization Rate: {dashboard_data['grant_utilization']['overall_utilization_rate']:.1f}%
        
        Alerts:
        """
        
        for alert in dashboard_data['alerts']:
            summary += f"• {alert['message']}\n"
        
        return summary
    
    def _email_board_report(self, pdf_buffer, excel_buffer, report_content, recipients):
        """Email board report to recipients"""
        try:
            # Email configuration
            smtp_server = os.environ.get('MAIL_SERVER')
            smtp_port = int(os.environ.get('MAIL_PORT', 587))
            smtp_username = os.environ.get('MAIL_USERNAME')
            smtp_password = os.environ.get('MAIL_PASSWORD')
            
            # Create message
            msg = MimeMultipart()
            msg['From'] = smtp_username
            msg['Subject'] = report_content['report_title']
            
            # Email body
            body = f"""
            Dear Board Members,
            
            Please find attached the monthly financial report for {report_content['period']}.
            
            {report_content['executive_summary']}
            
            The attached files include:
            1. Comprehensive PDF report with charts and analysis
            2. Excel workbook with detailed financial data
            
            Please contact the finance team if you have any questions.
            
            Best regards,
            NGO Accounting System
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            # Attach PDF
            pdf_attachment = MimeBase('application', 'octet-stream')
            pdf_attachment.set_payload(pdf_buffer.read())
            encoders.encode_base64(pdf_attachment)
            pdf_attachment.add_header(
                'Content-Disposition',
                f'attachment; filename="monthly_report_{datetime.now().strftime("%Y%m")}.pdf"'
            )
            msg.attach(pdf_attachment)
            
            # Attach Excel
            excel_attachment = MimeBase('application', 'octet-stream')
            excel_attachment.set_payload(excel_buffer.read())
            encoders.encode_base64(excel_attachment)
            excel_attachment.add_header(
                'Content-Disposition',
                f'attachment; filename="monthly_data_{datetime.now().strftime("%Y%m")}.xlsx"'
            )
            msg.attach(excel_attachment)
            
            # Send to each recipient
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            
            for email in recipients:
                msg['To'] = email
                server.sendmail(smtp_username, email, msg.as_string())
                del msg['To']
            
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"Failed to send board report: {e}")
            return False