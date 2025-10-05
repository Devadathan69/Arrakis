
import json
import os
from datetime import datetime
from collections import defaultdict
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DAILY_BUDGET_FILE = os.path.join(DATA_DIR, 'daily_budget.json')
INCURRED_COSTS_FILE = os.path.join(DATA_DIR, 'incurred_costs.json')

def read_json_file(file_path, default_data={}):
    if not os.path.exists(file_path):
        return default_data
    with open(file_path, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default_data

def calculate_variation(estimated, incurred):
    if estimated == 0:
        return None if incurred > 0 else 0
    return ((incurred - estimated) / estimated) * 100

def get_weekly_budget_data():
    estimated_data = read_json_file(DAILY_BUDGET_FILE)
    incurred_data = read_json_file(INCURRED_COSTS_FILE)

    weekly_summary = defaultdict(lambda: {'estimated': 0, 'incurred': 0})

    all_dates = set(estimated_data.keys()) | set(incurred_data.keys())

    for date_str in all_dates:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            week_number = date_obj.isocalendar()[1]
            
            est_total = estimated_data.get(date_str, {}).get('total_estimated', 0)
            inc_total = incurred_data.get(date_str, {}).get('total_incurred', 0)

            weekly_summary[week_number]['estimated'] += est_total
            weekly_summary[week_number]['incurred'] += inc_total
        except ValueError:
            continue # Skip malformed date strings

    response = {}
    for week, totals in weekly_summary.items():
        response[f'week_{week}'] = {
            'estimated': totals['estimated'],
            'incurred': totals['incurred'],
            'variation': calculate_variation(totals['estimated'], totals['incurred'])
        }
    return response

def get_monthly_budget_data():
    estimated_data = read_json_file(DAILY_BUDGET_FILE)
    incurred_data = read_json_file(INCURRED_COSTS_FILE)

    monthly_summary = defaultdict(lambda: {'estimated': 0, 'incurred': 0})

    all_dates = set(estimated_data.keys()) | set(incurred_data.keys())

    for date_str in all_dates:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            month_number = date_obj.month
            
            est_total = estimated_data.get(date_str, {}).get('total_estimated', 0)
            inc_total = incurred_data.get(date_str, {}).get('total_incurred', 0)

            monthly_summary[month_number]['estimated'] += est_total
            monthly_summary[month_number]['incurred'] += inc_total
        except ValueError:
            continue # Skip malformed date strings

    response = {}
    for month, totals in monthly_summary.items():
        response[f'month_{month}'] = {
            'estimated': totals['estimated'],
            'incurred': totals['incurred'],
            'variation': calculate_variation(totals['estimated'], totals['incurred'])
        }
    return response

def generate_final_report_pdf():
    # This is a placeholder for the PDF generation logic
    # It will be implemented properly later
    report_path = os.path.join(DATA_DIR, 'final_budget_report.pdf')
    doc = SimpleDocTemplate(report_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    elements = [Paragraph("Final Budget Report", styles['h1'])]

    # Mock data for now
    total_estimated = 300000
    total_incurred = 325000
    variation = calculate_variation(total_estimated, total_incurred)

    data = [
        ['Description', 'Amount'],
        ['Total Estimated Budget', f'Rs. {total_estimated:,.2f}'],
        ['Total Incurred Budget', f'Rs. {total_incurred:,.2f}'],
        ['Overall Variation', f'{variation:.2f}%']
    ]

    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    elements.append(table)
    doc.build(elements)
    return report_path
