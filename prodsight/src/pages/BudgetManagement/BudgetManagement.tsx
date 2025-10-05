
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../api/client';
import { toast } from 'react-hot-toast';
import { Zap } from 'lucide-react';

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

const IncurredCostForm: React.FC<{ date: Date; onClose: () => void; refreshData: () => void; }> = ({ date, onClose, refreshData }) => {
  const { register, control, handleSubmit } = useForm<IncurredCost>({
    defaultValues: {
      date: moment(date).format('YYYY-MM-DD'),
      art_costume_expense: { rented: [], purchased: [] }
    }
  });

  const { fields: rentedFields, append: appendRented } = useFieldArray({ control, name: "art_costume_expense.rented" });
  const { fields: purchasedFields, append: appendPurchased } = useFieldArray({ control, name: "art_costume_expense.purchased" });

  const [artTab, setArtTab] = useState('rented');

  const onSubmit = async (data: IncurredCost) => {
    try {
      await apiClient.post('/budget/incurred', data);
      refreshData();
      onClose();
    } catch (error) {
      console.error("Failed to submit incurred costs:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg">
      <input type="number" placeholder="Junior Artist Wage" {...register("junior_artist_wage", { valueAsNumber: true })} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
      <input type="number" placeholder="Location Rent" {...register("location_rent", { valueAsNumber: true })} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
      <input type="number" placeholder="Travel Expense" {...register("travel_expense", { valueAsNumber: true })} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
      <input type="number" placeholder="Food Expense" {...register("food_expense", { valueAsNumber: true })} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
      <input type="number" placeholder="Others" {...register("others", { valueAsNumber: true })} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />

      <div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Art/Costume Expense</h3>
        <div className="flex gap-2 mt-2 mb-2">
          <Button type="button" onClick={() => setArtTab('rented')} variant={artTab === 'rented' ? 'default' : 'secondary'}>Rented</Button>
          <Button type="button" onClick={() => setArtTab('purchased')} variant={artTab === 'purchased' ? 'default' : 'secondary'}>Purchased</Button>
        </div>
        {artTab === 'rented' && (
          <div className="space-y-2">
            {rentedFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input {...register(`art_costume_expense.rented.${index}.item`)} placeholder="Item name" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                <input type="number" {...register(`art_costume_expense.rented.${index}.cost`, { valueAsNumber: true })} placeholder="Cost" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
              </div>
            ))}
            <Button type="button" onClick={() => appendRented({ item: '', cost: 0 })}>Add Rented Item</Button>
          </div>
        )}
        {artTab === 'purchased' && (
          <div className="space-y-2">
            {purchasedFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input {...register(`art_costume_expense.purchased.${index}.item`)} placeholder="Item name" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                <input type="number" {...register(`art_costume_expense.purchased.${index}.cost`, { valueAsNumber: true })} placeholder="Cost" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
              </div>
            ))}
            <Button type="button" onClick={() => appendPurchased({ item: '', cost: 0 })}>Add Purchased Item</Button>
          </div>
        )}
      </div>

      <Button type="submit">Save Incurred Cost</Button>
    </form>
  );
};

const DayDetailsModal: React.FC<{ event: any; onClose: () => void; onAddIncurred: () => void; }> = ({ event, onClose, onAddIncurred }) => {
  if (!event) return null;

  const { estimated, incurred } = event.resource;

  return (
    <Modal isOpen={true} onClose={onClose} title={event.title}>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Budget Details</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-bold text-gray-700 dark:text-gray-300">Estimated Budget</h4>
            {estimated && Object.keys(estimated).length > 0 ? (
              <ul>
                {Object.entries(estimated).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span className="capitalize text-gray-600 dark:text-gray-400">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{Number(value).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500 dark:text-gray-400">No estimates available.</p>}
          </div>
          <div>
            <h4 className="font-bold text-gray-700 dark:text-gray-300">Incurred Costs</h4>
            {incurred && Object.keys(incurred).length > 0 ? (
              <ul>
                {Object.entries(incurred).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span className="capitalize text-gray-600 dark:text-gray-400">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{typeof value === 'object' ? 'See details' : Number(value).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500 dark:text-gray-400">No costs incurred yet.</p>}
          </div>
        </div>

        <Button onClick={onAddIncurred}>Add Incurred Cost</Button>
      </div>
    </Modal>
  );
};

export const BudgetManagement: React.FC = () => {
  const [dailyData, setDailyData] = useState<Record<string, { estimated: Partial<DailyEstimate>, incurred: Partial<IncurredCost> }>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, BudgetView>>({});
  const [monthlyData, setMonthlyData] = useState<Record<string, BudgetView>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showCostModal, setShowCostModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchBudgetData = async () => {
    try {
      const dailyRes = await apiClient.get('/budget/daily');
      setDailyData(dailyRes.data);

      const weeklyRes = await apiClient.get('/budget/weekly');
      setWeeklyData(weeklyRes.data);

      const monthlyRes = await apiClient.get('/budget/monthly');
      setMonthlyData(monthlyRes.data);

      const sortedDates = Object.keys(dailyRes.data).sort();
      const calendarEvents = sortedDates.map((date, index) => {
        const data = dailyRes.data[date];
        const variation = (data.incurred?.total_incurred && data.estimated?.total_estimated) 
          ? ((data.incurred.total_incurred - data.estimated.total_estimated) / data.estimated.total_estimated) * 100
          : 0;
        return {
          title: `Day ${index + 1}: Est: ${data.estimated?.total_estimated || 0} | Inc: ${data.incurred?.total_incurred || 0}`,
          start: new Date(date),
          end: new Date(date),
          allDay: true,
          resource: { ...data, variation },
        };
      });
      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to fetch budget data:", error);
      toast.error('Failed to fetch budget data');
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const handleAIEstimate = async () => {
    try {
      setIsLoading(true);
      
      if (!events.length) {
        toast.error('No schedule data available');
        return;
      }

      const response = await apiClient.post('/budget/ai-estimate', {});

      if (!response.data) {
        throw new Error('No data received from AI estimate');
      }

      fetchBudgetData(); // Refresh all data
      toast.success('AI Budget Estimate generated successfully');
    } catch (error: any) {
      console.error("Failed to get AI budget estimate:", error);
      toast.error(error.response?.data?.message || 'Failed to generate AI Budget Estimate');
    } finally {
      setIsLoading(false);
    }
  };

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
      toast.error('Failed to download report');
    }
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const openIncurredCostModal = () => {
    setShowDetailsModal(false);
    setSelectedDate(selectedEvent.start);
    setShowCostModal(true);
  };

  const renderDailyView = () => (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={handleSelectEvent}
        selectable
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Budget Management</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleAIEstimate} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Get AI Budget Estimate</span>
              </>
            )}
          </Button>
          <Button onClick={handleDownloadReport} variant="secondary">Download Final Report</Button>
        </div>
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

      {showDetailsModal && selectedEvent && (
        <DayDetailsModal 
          event={selectedEvent} 
          onClose={() => setShowDetailsModal(false)} 
          onAddIncurred={openIncurredCostModal} 
        />
      )}

      {showCostModal && selectedDate && (
        <Modal isOpen={showCostModal} onClose={() => setShowCostModal(false)} title={`Add Incurred Cost for ${moment(selectedDate).format('YYYY-MM-DD')}`}>
          <IncurredCostForm date={selectedDate} onClose={() => setShowCostModal(false)} refreshData={fetchBudgetData} />
        </Modal>
      )}
    </div>
  );
};
