// frontend/src/components/Charts/RevenueChart.jsx
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

const RevenueChart = ({ 
  data = [], 
  title = 'Revenue Trends',
  height = 300,
  showGrid = true,
  className = ''
}) => {
  const { formatCurrency } = useLanguage();

  // Default data if none provided
  const defaultData = [
    { month: 'Jan', grants: 30000, donations: 15000, services: 8000, total: 53000 },
    { month: 'Feb', grants: 35000, donations: 18000, services: 9000, total: 62000 },
    { month: 'Mar', grants: 28000, donations: 12000, services: 7500, total: 47500 },
    { month: 'Apr', grants: 42000, donations: 22000, services: 11000, total: 75000 },
    { month: 'May', grants: 38000, donations: 16000, services: 9500, total: 63500 },
    { month: 'Jun', grants: 45000, donations: 25000, services: 12000, total: 82000 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{`${label}`}</p>
          {payload.reverse().map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="grants"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.8}
            name="Grants"
          />
          <Area
            type="monotone"
            dataKey="donations"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.8}
            name="Donations"
          />
          <Area
            type="monotone"
            dataKey="services"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.8}
            name="Services"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Grants</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Donations</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Services</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;