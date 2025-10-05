
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
    """Generate a comprehensive final budget report PDF."""
    estimated_data = read_json_file(DAILY_BUDGET_FILE)
    incurred_data = read_json_file(INCURRED_COSTS_FILE)
    purchased_items = read_json_file(PURCHASED_ITEMS_FILE, default_data=[])

    # Calculate totals
    total_estimated = sum(est.get('total_estimated', 0) for est in estimated_data.values())
    total_incurred = sum(inc.get('total_incurred', 0) for inc in incurred_data.values())
    overall_variation = calculate_variation(total_estimated, total_incurred)

    # Get weekly and monthly summaries
    weekly_data = get_weekly_budget_data()
    monthly_data = get_monthly_budget_data()

    report_path = os.path.join(DATA_DIR, 'final_budget_report.pdf')
    doc = SimpleDocTemplate(report_path, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title = Paragraph("Final Budget Report", styles['h1'])
    elements.append(title)
    elements.append(Paragraph(" ", styles['Normal']))  # Spacer

    # Summary section
    summary_data = [
        ['Total Estimated Budget', f'₹{total_estimated:,.2f}'],
        ['Total Incurred Budget', f'₹{total_incurred:,.2f}'],
        ['Overall Variation', f'{overall_variation:.2f}%' if overall_variation is not None else 'N/A'],
        ['Report Generated', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
    ]

    summary_table = Table(summary_data, colWidths=[200, 200])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(summary_table)
    elements.append(Paragraph(" ", styles['Normal']))  # Spacer

    # Weekly Summary
    if weekly_data:
        elements.append(Paragraph("Weekly Budget Summary", styles['h2']))
        weekly_table_data = [['Week', 'Estimated', 'Incurred', 'Variation']]
        for week, data in weekly_data.items():
            weekly_table_data.append([
                week.replace('_', ' ').title(),
                f'₹{data["estimated"]:,.2f}',
                f'₹{data["incurred"]:,.2f}',
                f'{data["variation"]:.2f}%' if data["variation"] is not None else 'N/A'
            ])

        weekly_table = Table(weekly_table_data, colWidths=[100, 120, 120, 100])
        weekly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(weekly_table)
        elements.append(Paragraph(" ", styles['Normal']))

    # Monthly Summary
    if monthly_data:
        elements.append(Paragraph("Monthly Budget Summary", styles['h2']))
        monthly_table_data = [['Month', 'Estimated', 'Incurred', 'Variation']]
        for month, data in monthly_data.items():
            monthly_table_data.append([
                month.replace('_', ' ').title(),
                f'₹{data["estimated"]:,.2f}',
                f'₹{data["incurred"]:,.2f}',
                f'{data["variation"]:.2f}%' if data["variation"] is not None else 'N/A'
            ])

        monthly_table = Table(monthly_table_data, colWidths=[100, 120, 120, 100])
        monthly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(monthly_table)
        elements.append(Paragraph(" ", styles['Normal']))

    # Daily Breakdown
    if estimated_data or incurred_data:
        elements.append(Paragraph("Daily Budget Breakdown", styles['h2']))
        daily_table_data = [['Date', 'Estimated', 'Incurred', 'Variation']]
        all_dates = set(estimated_data.keys()) | set(incurred_data.keys())

        for date in sorted(all_dates):
            est = estimated_data.get(date, {}).get('total_estimated', 0)
            inc = incurred_data.get(date, {}).get('total_incurred', 0)
            var = calculate_variation(est, inc)
            daily_table_data.append([
                date,
                f'₹{est:,.2f}',
                f'₹{inc:,.2f}',
                f'{var:.2f}%' if var is not None else 'N/A'
            ])

        daily_table = Table(daily_table_data, colWidths=[100, 120, 120, 100])
        daily_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(daily_table)
        elements.append(Paragraph(" ", styles['Normal']))

    # Purchased Items
    if purchased_items:
        elements.append(Paragraph("Purchased Items", styles['h2']))
        purchased_table_data = [['Date', 'Item', 'Cost']]
        for item in purchased_items:
            purchased_table_data.append([
                item.get('date', 'N/A'),
                item.get('item', 'N/A'),
                f'₹{item.get("cost", 0):,.2f}'
            ])

        purchased_table = Table(purchased_table_data, colWidths=[100, 200, 120])
        purchased_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(purchased_table)

    doc.build(elements)
    return report_path
