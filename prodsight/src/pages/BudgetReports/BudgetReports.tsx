import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  BarChart3,
  DollarSign,
  Target,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { toast } from 'react-hot-toast';

interface BudgetData {
  estimated: {
    junior_artist_wage?: number;
    location_rent?: number;
    travel_expense?: number;
    food_expense?: number;
    art_costume_expense?: number;
    total_estimated?: number;
  };
  incurred: {
    junior_artist_wage?: number;
    location_rent?: number;
    travel_expense?: number;
    food_expense?: number;
    others?: number;
  art_costume_expense?: Record<string, unknown>;
    total_incurred?: number;
  };
}

interface WeeklyMonthlyData {
  estimated: number;
  incurred: number;
  variation: number | null;
}

interface BudgetReportsProps {
  dailyBudgetData?: unknown[];
}

export const BudgetReports: React.FC<BudgetReportsProps> = ({ dailyBudgetData: _dailyBudgetData }) => {
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyData, setDailyData] = useState<Record<string, BudgetData>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, WeeklyMonthlyData>>({});
  const [monthlyData, setMonthlyData] = useState<Record<string, WeeklyMonthlyData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        apiClient.get('/budget/daily'),
        apiClient.get('/budget/weekly'),
        apiClient.get('/budget/monthly')
      ]);

      setDailyData(dailyRes.data.data || {});
      setWeeklyData(weeklyRes.data.data || {});
      setMonthlyData(monthlyRes.data.data || {});
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      toast.error('Failed to load budget reports');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    switch (reportPeriod) {
      case 'daily':
        return Object.entries(dailyData).map(([date, data]) => ({
          period: date,
          estimated: data.estimated?.total_estimated || 0,
          incurred: data.incurred?.total_incurred || 0,
          variation: calculateVariation(data.estimated?.total_estimated || 0, data.incurred?.total_incurred || 0)
        }));
      case 'weekly':
        return Object.entries(weeklyData).map(([week, data]) => ({
          period: week.replace('_', ' ').replace('week', 'Week'),
          estimated: data.estimated,
          incurred: data.incurred,
          variation: data.variation
        }));
      case 'monthly':
        return Object.entries(monthlyData).map(([month, data]) => ({
          period: month.replace('_', ' ').replace('month', 'Month'),
          estimated: data.estimated,
          incurred: data.incurred,
          variation: data.variation
        }));
      default:
        return [];
    }
  };

  const calculateVariation = (estimated: number, incurred: number): number | null => {
    if (estimated === 0) return incurred > 0 ? null : 0;
    return ((incurred - estimated) / estimated) * 100;
  };

  const getTotalEstimated = () => getCurrentData().reduce((sum, item) => sum + item.estimated, 0);
  const getTotalIncurred = () => getCurrentData().reduce((sum, item) => sum + item.incurred, 0);
  const getTotalVariation = () => {
    const totalEst = getTotalEstimated();
    const totalInc = getTotalIncurred();
    return calculateVariation(totalEst, totalInc);
  };

  const getVariationColor = (variation: number | null) => {
    if (variation === null) return 'text-gray-600 dark:text-gray-400';
    return variation > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  };

  const handleExportReport = async () => {
    try {
      const response = await apiClient.get('/budget/final-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'budget_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Budget Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI estimated budgets vs actual incurred costs with variance analysis
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setReportPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  reportPeriod === period
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total AI Estimated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{getTotalEstimated().toLocaleString()}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Incurred</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{getTotalIncurred().toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getTotalEstimated() > 0 ? ((getTotalIncurred() / getTotalEstimated()) * 100).toFixed(1) : 0}% of estimate
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Variation</p>
              <p className={`text-2xl font-bold ${getVariationColor(getTotalVariation())}`}>
                {getTotalVariation() !== null ? `${getTotalVariation()!.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getTotalVariation() !== null && getTotalVariation()! > 0 ? 'Over budget' : 'Under budget'}
              </p>
            </div>
            {getTotalVariation() !== null && getTotalVariation()! > 0 ?
              <TrendingUp className="h-8 w-8 text-red-500" /> :
              <TrendingDown className="h-8 w-8 text-green-500" />
            }
          </div>
        </motion.div>
      </div>

      {/* Budget Variance Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Budget Variance Analysis
            </h2>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Report
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Period</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">AI Estimated</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Incurred</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Variance</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentData().map((item, index) => (
                  <motion.tr
                    key={item.period}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.period}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                      ₹{item.estimated.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900 dark:text-gray-100 font-medium">
                      ₹{item.incurred.toLocaleString()}
                    </td>
                    <td className={`py-4 px-4 text-right font-medium ${getVariationColor(item.variation)}`}>
                      {item.variation !== null ? `${item.variation.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {item.variation !== null && item.variation > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : item.variation !== null && item.variation < 0 ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                        <span className={`text-xs font-medium ${
                          item.variation !== null && item.variation > 0 ? 'text-red-600' :
                          item.variation !== null && item.variation < 0 ? 'text-green-600' :
                          'text-blue-600'
                        }`}>
                          {item.variation !== null && item.variation > 0 ? 'Over' :
                           item.variation !== null && item.variation < 0 ? 'Under' :
                           'On Track'}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};