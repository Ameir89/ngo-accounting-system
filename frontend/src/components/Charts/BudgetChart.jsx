// frontend/src/components/Charts/BudgetChart.jsx
import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

const BudgetChart = ({ 
  data = [], 
  title = 'Budget vs Actual',
  height = 300,
  showGrid = true,
  className = ''
}) => {
  const { formatCurrency } = useLanguage();

  // Default data if none provided
  const defaultData = [
    { category: 'Programs', budgeted: 120000, actual: 115000, variance: -5000 },
    { category: 'Administration', budgeted: 45000, actual: 48000, variance: 3000 },
    { category: 'Fundraising', budgeted: 25000, actual: 22000, variance: -3000 },
    { category: 'Operations', budgeted: 35000, actual: 37000, variance: 2000 },
    { category: 'Training', budgeted: 18000, actual: 16000, variance: -2000 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-blue-600">
            Budgeted: {formatCurrency(data.budgeted)}
          </p>
          <p className="text-sm text-green-600">
            Actual: {formatCurrency(data.actual)}
          </p>
          <p className={`text-sm ${data.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            Variance: {formatCurrency(Math.abs(data.variance))} {data.variance >= 0 ? 'over' : 'under'}
          </p>
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
        <BarChart data={chartData} barCategoryGap="20%">
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis 
            dataKey="category" 
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="budgeted" 
            fill="#3b82f6" 
            name="Budgeted"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="actual" 
            fill="#10b981" 
            name="Actual"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="flex items-center justify-center space-x-6 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Budgeted</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Actual</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetChart;