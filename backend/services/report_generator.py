# Report generation
# backend/services/report_generator.py
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime

class ReportGenerator:
    @staticmethod
    def generate_trial_balance_pdf(trial_balance_data):
        """Generate PDF for trial balance report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            alignment=1,  # Center
            spaceAfter=30
        )
        
        # Title
        title = Paragraph("Trial Balance Report", title_style)
        elements.append(title)
        
        # Date
        date_text = f"As of: {trial_balance_data['as_of_date']}"
        date_para = Paragraph(date_text, styles['Normal'])
        elements.append(date_para)
        elements.append(Spacer(1, 20))
        
        # Table data
        data = [['Account Code', 'Account Name', 'Debit', 'Credit']]
        
        for account in trial_balance_data['accounts']:
            debit = f"${account['debit_amount']:,.2f}" if account['debit_amount'] > 0 else "-"
            credit = f"${account['credit_amount']:,.2f}" if account['credit_amount'] > 0 else "-"
            
            data.append([
                account['account_code'],
                account['account_name'],
                debit,
                credit
            ])
        
        # Totals row
        data.append([
            'TOTAL',
            '',
            f"${trial_balance_data['total_debit']:,.2f}",
            f"${trial_balance_data['total_credit']:,.2f}"
        ])
        
        # Create table
        table = Table(data, colWidths=[1.5*inch, 3*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -2), 'LEFT'),  # Account names left-aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer