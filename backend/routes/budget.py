<<<<<<< HEAD
from flask import Blueprint, request, jsonify
from utils.json_handler import json_handler
from datetime import datetime
from websocket_manager import get_websocket_manager

budget_bp = Blueprint('budget', __name__)

@budget_bp.route('', methods=['GET'])
def get_budget():
    """Get budget overview (requires budget-related permissions)"""
    try:
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': budget
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch budget'
        }), 500

@budget_bp.route('/category/<category_name>', methods=['PUT'])
def update_budget_category(category_name):
    """Update budget category (requires edit_budget permission)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        # Find and update category
        categories = budget.get('categories', [])
        category_found = False
        
        for i, category in enumerate(categories):
            if category.get('name') == category_name:
                # Update category with new data
                categories[i] = {**category, **data}
                category_found = True
                break
        
        if not category_found:
            return jsonify({
                'success': False,
                'message': 'Category not found'
            }), 404
        
        # Recalculate totals
        total_budgeted = sum(cat.get('budgeted', 0) for cat in categories)
        total_spent = sum(cat.get('spent', 0) for cat in categories)
        total_remaining = total_budgeted - total_spent
        
        budget['total'] = total_budgeted
        budget['spent'] = total_spent
        budget['remaining'] = total_remaining
        budget['categories'] = categories
        
        # Update forecast if needed
        if 'forecast' in budget:
            budget['forecast']['projectedTotal'] = total_budgeted
            budget['forecast']['overBudget'] = max(0, total_spent - total_budgeted)
        
        success = json_handler.write_json('budget.json', budget)
        
        if success:
            # Emit WebSocket event for budget update
            ws_manager = get_websocket_manager()
            if ws_manager:
                ws_manager.broadcast_budget_update(budget, 'updated')
            
            return jsonify({
                'success': True,
                'data': budget,
                'message': 'Budget category updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to update budget category'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to update budget category'
        }), 500

@budget_bp.route('/history', methods=['POST'])
def add_budget_entry():
    """Add budget history entry (requires edit_budget permission)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['amount', 'category', 'description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        # Create new history entry
        new_entry = {
            'date': data.get('date', datetime.now().strftime('%Y-%m-%d')),
            'amount': float(data['amount']),
            'category': data['category'],
            'description': data['description']
        }
        
        # Add to history
        history = budget.get('history', [])
        history.append(new_entry)
        budget['history'] = history
        
        # Update category spent amount
        categories = budget.get('categories', [])
        category_found = False
        
        for category in categories:
            if category.get('name') == data['category']:
                category['spent'] = category.get('spent', 0) + float(data['amount'])
                category['remaining'] = category.get('budgeted', 0) - category['spent']
                category_found = True
                break
        
        if not category_found:
            return jsonify({
                'success': False,
                'message': 'Category not found'
            }), 400
        
        # Recalculate totals
        total_budgeted = sum(cat.get('budgeted', 0) for cat in categories)
        total_spent = sum(cat.get('spent', 0) for cat in categories)
        total_remaining = total_budgeted - total_spent
        
        budget['total'] = total_budgeted
        budget['spent'] = total_spent
        budget['remaining'] = total_remaining
        budget['categories'] = categories
        
        # Update forecast
        if 'forecast' in budget:
            budget['forecast']['projectedTotal'] = total_budgeted
            budget['forecast']['overBudget'] = max(0, total_spent - total_budgeted)
        
        success = json_handler.write_json('budget.json', budget)
        
        if success:
            return jsonify({
                'success': True,
                'data': budget,
                'message': 'Budget entry added successfully'
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to add budget entry'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to add budget entry'
        }), 500

@budget_bp.route('/categories', methods=['GET'])
def get_budget_categories():
    """Get budget categories"""
    try:
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        categories = budget.get('categories', [])
        
        return jsonify({
            'success': True,
            'data': categories
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch budget categories'
        }), 500

@budget_bp.route('/history', methods=['GET'])
def get_budget_history():
    """Get budget history"""
    try:
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        history = budget.get('history', [])
        
        # Sort by date (newest first)
        history.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': history
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch budget history'
        }), 500

@budget_bp.route('/forecast', methods=['GET'])
def get_budget_forecast():
    """Get budget forecast"""
    try:
        budget = json_handler.read_json('budget.json', {})
        
        if not budget:
            return jsonify({
                'success': False,
                'message': 'Budget data not found'
            }), 404
        
        forecast = budget.get('forecast', {})
        
        return jsonify({
            'success': True,
            'data': forecast
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch budget forecast'
        }), 500
=======
from flask import Blueprint, jsonify, request, send_file
import json
import os

from utils.budget_helpers import (
    get_weekly_budget_data,
    get_monthly_budget_data,
    generate_final_report_pdf
)
from utils.gemini_budget import GeminiBudget

budget_bp = Blueprint('budget_bp', __name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
SCHEDULE_FILE = os.path.join(DATA_DIR, 'production_schedule.json')
DAILY_BUDGET_FILE = os.path.join(DATA_DIR, 'daily_budget.json')
INCURRED_COSTS_FILE = os.path.join(DATA_DIR, 'incurred_costs.json')
PURCHASED_ITEMS_FILE = os.path.join(DATA_DIR, 'purchased_items.json')

def read_json_file(file_path, default_data={}):
    if not os.path.exists(file_path):
        return default_data
    with open(file_path, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default_data

def write_json_file(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

from datetime import date, timedelta

@budget_bp.route('/ai-estimate', methods=['POST'])
def ai_budget_estimate():
    schedule_data = read_json_file(SCHEDULE_FILE)
    if not schedule_data:
        return jsonify({"error": "Schedule data not found"}), 404

    scenes = schedule_data.get('shooting_schedule', [])
    
    # Group scenes by location
    locations = {}
    for scene in scenes:
        location = scene.get('location')
        if location not in locations:
            locations[location] = []
        locations[location].append(scene)

    # Create daily schedules with assigned dates
    daily_schedules = []
    current_date = date.today()
    for location, scenes_in_location in locations.items():
        daily_schedules.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "scenes": scenes_in_location
        })
        current_date += timedelta(days=1)

    # Create the structure expected by GeminiBudget
    processed_schedule = {"daily_schedules": daily_schedules}

    gemini_budget = GeminiBudget()
    estimated_budget = gemini_budget.generate_budget(processed_schedule)

    if "error" in estimated_budget:
        return jsonify({"success": False, "message": estimated_budget.get("error"), "raw_response": estimated_budget.get("raw_response")}), 500

    write_json_file(DAILY_BUDGET_FILE, estimated_budget)
    return jsonify({"success": True, "data": estimated_budget})

@budget_bp.route('/incurred', methods=['POST'])
def add_incurred_cost():
    data = request.get_json()
    date = data.get('date')
    if not date:
        return jsonify({"error": "Date is required"}), 400

    incurred_costs = read_json_file(INCURRED_COSTS_FILE)
    
    # Calculate total incurred for the day
    total_incurred = sum(v for k, v in data.items() if k != 'date' and isinstance(v, (int, float)))
    
    # Handle art_costume_expense separately
    art_costume_total = 0
    if 'art_costume_expense' in data:
        rented = data['art_costume_expense'].get('rented', [])
        purchased = data['art_costume_expense'].get('purchased', [])
        art_costume_total += sum(item.get('cost', 0) for item in rented)
        art_costume_total += sum(item.get('cost', 0) for item in purchased)
        
        if purchased:
            purchased_items = read_json_file(PURCHASED_ITEMS_FILE, default_data=[])
            for item in purchased:
                item['date'] = date
                purchased_items.append(item)
            write_json_file(PURCHASED_ITEMS_FILE, purchased_items)

    data['total_incurred'] = total_incurred + art_costume_total
    incurred_costs[date] = data

    write_json_file(INCURRED_COSTS_FILE, incurred_costs)
    return jsonify({"success": True, "message": "Incurred cost added successfully"}), 201

@budget_bp.route('/daily', methods=['GET'])
def get_daily_budget():
    estimated = read_json_file(DAILY_BUDGET_FILE)
    incurred = read_json_file(INCURRED_COSTS_FILE)
    
    response = {}
    all_dates = set(estimated.keys()) | set(incurred.keys())

    for date in sorted(list(all_dates)):
        response[date] = {
            "estimated": estimated.get(date, {}),
            "incurred": incurred.get(date, {})
        }
    return jsonify({"success": True, "data": response})

@budget_bp.route('/weekly', methods=['GET'])
def get_weekly_budget():
    weekly_data = get_weekly_budget_data()
    return jsonify({"success": True, "data": weekly_data})

@budget_bp.route('/monthly', methods=['GET'])
def get_monthly_budget():
    monthly_data = get_monthly_budget_data()
    return jsonify({"success": True, "data": monthly_data})

@budget_bp.route('/final-report', methods=['GET'])
def get_final_report():
    try:
        report_path = generate_final_report_pdf()
        return send_file(report_path, as_attachment=True, download_name='final_budget_report.pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500
>>>>>>> master
