import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Plus,
  MapPin,
  Users,
  Utensils,
  Car,
  Camera,
  Shirt,
  Download,
  Search,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../api/client';
import { toast } from 'react-hot-toast';

interface ExpenseItem {
  date: string;
  category: string;
  amount: number;
  description: string;
  type: 'rented' | 'purchased';
  item?: string;
  vendor?: string;
  location?: string;
}

interface ExpenseTrackingProps {
  budget?: unknown;
  dailyBudgetData?: unknown[];
}

export const ExpenseTracking: React.FC<ExpenseTrackingProps> = ({ budget: _budget, dailyBudgetData: _dailyBudgetData }) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      const [dailyRes, purchasedRes] = await Promise.all([
        apiClient.get('/budget/daily'),
        apiClient.get('/budget/purchased-items') // Assuming this endpoint exists
      ]);

      const expenseItems: ExpenseItem[] = [];

      // Process daily incurred costs
      Object.entries(dailyRes.data.data || {}).forEach(([date, data]: [string, any]) => {
        if (data.incurred) {
          // Add individual expense categories
          Object.entries(data.incurred).forEach(([category, amount]) => {
            if (typeof amount === 'number' && amount > 0 && category !== 'total_incurred' && category !== 'art_costume_expense') {
              expenseItems.push({
                date,
                category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                amount,
                description: `${category.replace(/_/g, ' ')} expense`,
                type: 'rented', // Default assumption
                vendor: 'Production Team'
              });
            }
          });

          // Handle art/costume expenses separately
          if (data.incurred.art_costume_expense) {
            const artExpenses = data.incurred.art_costume_expense;
            if (artExpenses.rented) {
              artExpenses.rented.forEach((item: any) => {
                expenseItems.push({
                  date,
                  category: 'Art & Costume',
                  amount: item.cost || 0,
                  description: item.item || 'Art/Costume Item',
                  type: 'rented',
                  item: item.item,
                  vendor: 'Costume Department'
                });
              });
            }
          }
        }
      });

      // Process purchased items
      if (purchasedRes.data) {
        purchasedRes.data.forEach((item: any) => {
          expenseItems.push({
            date: item.date,
            category: 'Purchased Items',
            amount: item.cost,
            description: item.item,
            type: 'purchased',
            item: item.item,
            vendor: 'Procurement'
          });
        });
      }

      setExpenses(expenseItems);
    } catch (error) {
      console.error('Failed to fetch expense data:', error);
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = expenses;

    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === filterStatus);
    }

    // Filter by view period
    const now = new Date();
    if (viewPeriod === 'daily') {
      filtered = filtered.filter(expense => 
        expense.date.toDateString() === selectedDate.toDateString()
      );
    } else if (viewPeriod === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      filtered = filtered.filter(expense => expense.date >= weekStart);
    } else if (viewPeriod === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(expense => expense.date >= monthStart);
    }

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, filterCategory, filterStatus, viewPeriod, selectedDate]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'junior_artists': return Users;
      case 'travel': return Car;
      case 'location_rent': return MapPin;
      case 'food': return Utensils;
      case 'props_costumes': return Shirt;
      case 'equipment': return Camera;
      default: return Receipt;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'junior_artists': return 'text-blue-500';
      case 'travel': return 'text-green-500';
      case 'location_rent': return 'text-purple-500';
      case 'food': return 'text-orange-500';
      case 'props_costumes': return 'text-pink-500';
      case 'equipment': return 'text-indigo-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };



  const handleAddExpense = () => {
    if (newExpense.amount && newExpense.description) {
      const expense: DailyExpense = {
        id: Date.now().toString(),
        date: newExpense.date || new Date(),
        category: newExpense.category || 'miscellaneous',
        subcategory: newExpense.subcategory || '',
        amount: newExpense.amount,
        description: newExpense.description,
        location: newExpense.location || '',
        status: 'pending',
        type: newExpense.type || 'service',
        vendor: newExpense.vendor,
        notes: newExpense.notes
      };

      setExpenses(prev => [...prev, expense]);
      setNewExpense({
        date: new Date(),
        category: 'junior_artists',
        amount: 0,
        description: '',
        location: '',
        status: 'pending',
        type: 'service'
      });
      setShowAddModal(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Expense Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track daily production expenses and budget utilization
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setViewPeriod(period)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewPeriod === period
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{budget?.spent.toLocaleString() || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₹{filteredExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                ₹{filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredExpenses.length}
              </p>
            </div>
            <Receipt className="h-8 w-8 text-purple-500" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="junior_artists">Junior Artists</option>
              <option value="travel">Travel</option>
              <option value="location_rent">Location Rent</option>
              <option value="food">Food & Catering</option>
              <option value="props_costumes">Props & Costumes</option>
              <option value="equipment">Equipment</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {viewPeriod === 'daily' && (
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Expense Entries ({filteredExpenses.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredExpenses.map((expense, index) => {
            const CategoryIcon = getCategoryIcon(expense.category);
            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${getCategoryColor(expense.category)}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {expense.description}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{expense.date.toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{expense.location}</span>
                        <span>•</span>
                        <span>{expense.vendor}</span>
                        <span>•</span>
                        <span className="capitalize">{expense.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        ₹{expense.amount.toLocaleString()}
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {expense.notes && (
                  <div className="mt-3 ml-14">
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {expense.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Expense"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={newExpense.date?.toISOString().split('T')[0]}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: new Date(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as DailyExpense['category'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="junior_artists">Junior Artists</option>
                <option value="travel">Travel</option>
                <option value="location_rent">Location Rent</option>
                <option value="food">Food & Catering</option>
                <option value="props_costumes">Props & Costumes</option>
                <option value="equipment">Equipment</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={newExpense.type}
                onChange={(e) => setNewExpense(prev => ({ ...prev, type: e.target.value as DailyExpense['type'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="service">Service</option>
                <option value="rent">Rent</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={newExpense.description}
              onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Expense description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={newExpense.location}
                onChange={(e) => setNewExpense(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vendor
              </label>
              <input
                type="text"
                value={newExpense.vendor}
                onChange={(e) => setNewExpense(prev => ({ ...prev, vendor: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Vendor name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={newExpense.notes}
              onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
