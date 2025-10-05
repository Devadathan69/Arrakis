import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';

const localizer = momentLocalizer(moment);

// Data interfaces
interface DailyEstimate {
  junior_artist_wage: number;
  location_rent: number;
  travel_expense: number;
  food_expense: number;
  art_costume_expense: number;
  total_estimated: number;
}

interface IncurredCost {
  date: string;
  junior_artist_wage?: number;
  location_rent?: number;
  travel_expense?: number;
  food_expense?: number;
  others?: number;
  art_costume_expense?: {
    rented: { item: string; cost: number }[];
    purchased: { item: string; cost: number }[];
  };
  total_incurred?: number;
}

interface BudgetView {
  estimated: number;
  incurred: number;
  variation: number | null;
}

export const ProducerBudgetView: React.FC = () => {
  const [dailyData, setDailyData] = useState<Record<string, { estimated: Partial<DailyEstimate>, incurred: Partial<IncurredCost> }>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, BudgetView>>({});
  const [monthlyData, setMonthlyData] = useState<Record<string, BudgetView>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchBudgetData = async () => {
    try {
      const dailyRes = await apiClient.get('/budget/daily');
      setDailyData(dailyRes.data);

      const weeklyRes = await apiClient.get('/budget/weekly');
      setWeeklyData(weeklyRes.data);

      const monthlyRes = await apiClient.get('/budget/monthly');
      setMonthlyData(monthlyRes.data);

      const calendarEvents = Object.entries(dailyRes.data).map(([date, data]: [string, any]) => ({
        title: `Est: ${data.estimated?.total_estimated || 0} | Inc: ${data.incurred?.total_incurred || 0}`,
        start: new Date(date),
        end: new Date(date),
        allDay: true,
        resource: data,
      }));
      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to fetch budget data:", error);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const handleDownloadReport = async () => {
    try {
      const response = await apiClient.get('/budget/final-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'final_budget_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download report:", error);
    }
  };

  const renderDailyView = () => (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
      />
    </div>
  );

  const renderWeeklyView = () => (
    <div className="space-y-4">
      {Object.entries(weeklyData).map(([week, data]) => (
        <div key={week} className="p-4 border dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{week.replace('_', ' ')}</h3>
          <p className="text-gray-700 dark:text-gray-300">Estimated: <span className="font-mono">{data.estimated.toLocaleString()}</span></p>
          <p className="text-gray-700 dark:text-gray-300">Incurred: <span className="font-mono">{data.incurred.toLocaleString()}</span></p>
          <p className="text-gray-700 dark:text-gray-300">Variation: <span className={`font-bold ${data.variation === null ? 'text-gray-500' : data.variation > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.variation !== null ? `${data.variation.toFixed(2)}%` : 'N/A'}</span></p>
        </div>
      ))}
    </div>
  );

  const renderMonthlyView = () => (
    <div className="space-y-4">
      {Object.entries(monthlyData).map(([month, data]) => (
        <div key={month} className="p-4 border dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{month.replace('_', ' ')}</h3>
          <p className="text-gray-700 dark:text-gray-300">Estimated: <span className="font-mono">{data.estimated.toLocaleString()}</span></p>
          <p className="text-gray-700 dark:text-gray-300">Incurred: <span className="font-mono">{data.incurred.toLocaleString()}</span></p>
          <p className="text-gray-700 dark:text-gray-300">Variation: <span className={`font-bold ${data.variation === null ? 'text-gray-500' : data.variation > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.variation !== null ? `${data.variation.toFixed(2)}%` : 'N/A'}</span></p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Producer Budget View</h1>
        <Button onClick={handleDownloadReport} variant="secondary">Download Final Report</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex gap-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setView('daily')} className={`py-2 px-4 font-medium ${view === 'daily' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Daily</button>
          <button onClick={() => setView('weekly')} className={`py-2 px-4 font-medium ${view === 'weekly' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Weekly</button>
          <button onClick={() => setView('monthly')} className={`py-2 px-4 font-medium ${view === 'monthly' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Monthly</button>
        </div>

        <div>
          {view === 'daily' && renderDailyView()}
          {view === 'weekly' && renderWeeklyView()}
          {view === 'monthly' && renderMonthlyView()}
        </div>
      </div>
    </div>
  );
};