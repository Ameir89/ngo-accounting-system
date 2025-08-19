// frontend/src/pages/Reports.jsx
import { Calendar, Download, Eye, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import { useLanguage } from '../contexts/LanguageContext';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('trial-balance');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st
    end_date: new Date().toISOString().split('T')[0] // Today
  });
  const [filters, setFilters] = useState({
    account_type: '',
    project_id: '',
    cost_center_id: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { t, formatCurrency, formatDate } = useLanguage();

  const reportTypes = [
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      nameAr: 'ميزان المراجعة',
      description: 'Summary of all account balances',
      icon: FileSpreadsheet,
      color: 'bg-blue-500'
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      nameAr: 'الميزانية العمومية',
      description: 'Assets, liabilities, and equity summary',
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      id: 'income-statement',
      name: 'Income Statement',
      nameAr: 'قائمة الدخل',
      description: 'Revenue and expenses summary',
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      nameAr: 'قائمة التدفق النقدي',
      description: 'Cash inflows and outflows',
      icon: FileText,
      color: 'bg-orange-500'
    },
    {
      id: 'general-ledger',
      name: 'General Ledger',
      nameAr: 'دفتر الأستاذ العام',
      description: 'Detailed account transactions',
      icon: FileSpreadsheet,
      color: 'bg-indigo-500'
    },
    {
      id: 'journal-entries',
      name: 'Journal Entries Report',
      nameAr: 'تقرير قيود اليومية',
      description: 'All journal entries for the period',
      icon: FileText,
      color: 'bg-pink-500'
    }
  ];

  const accountTypes = [
    { value: '', label: 'All Account Types' },
    { value: 'asset', label: t('asset') },
    { value: 'liability', label: t('liability') },
    { value: 'equity', label: t('equity') },
    { value: 'revenue', label: t('revenue') },
    { value: 'expense', label: t('expense') }
  ];

  const selectedReportConfig = reportTypes.find(r => r.id === selectedReport);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      // Simulate API call - replace with actual API hook
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data for demonstration
      const mockData = generateMockReportData(selectedReport);
      setReportData(mockData);
      setShowPreview(true);
      
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error('Report generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = async (format) => {
    if (!reportData) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      // Simulate export - replace with actual export logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const generateMockReportData = (reportType) => {
    // Mock data generation based on report type
    switch (reportType) {
      case 'trial-balance':
        return {
          title: 'Trial Balance',
          period: `${formatDate(dateRange.start_date)} to ${formatDate(dateRange.end_date)}`,
          data: [
            { account_code: '1100', account_name: 'Cash and Cash Equivalents', debit: 50000, credit: 0 },
            { account_code: '1200', account_name: 'Accounts Receivable', debit: 25000, credit: 0 },
            { account_code: '2100', account_name: 'Accounts Payable', debit: 0, credit: 15000 },
            { account_code: '3100', account_name: 'Equity', debit: 0, credit: 45000 },
            { account_code: '4100', account_name: 'Grant Revenue', debit: 0, credit: 30000 },
            { account_code: '5100', account_name: 'Program Expenses', debit: 15000, credit: 0 }
          ],
          totals: { debit: 90000, credit: 90000 }
        };
      case 'balance-sheet':
        return {
          title: 'Balance Sheet',
          period: `As of ${formatDate(dateRange.end_date)}`,
          assets: {
            current: [
              { name: 'Cash and Cash Equivalents', amount: 50000 },
              { name: 'Accounts Receivable', amount: 25000 }
            ],
            total: 75000
          },
          liabilities: {
            current: [
              { name: 'Accounts Payable', amount: 15000 }
            ],
            total: 15000
          },
          equity: {
            items: [
              { name: 'Retained Earnings', amount: 45000 },
              { name: 'Current Year Surplus', amount: 15000 }
            ],
            total: 60000
          }
        };
      default:
        return { title: 'Report Data', data: [] };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
          {t('reports')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate and export financial reports for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Report Type
              </h3>
            </div>
            <div className="card-body p-0">
              <div className="space-y-1">
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedReport === report.id ? 'bg-indigo-50 dark:bg-indigo-900 border-r-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className={`${report.color} rounded-md p-2`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {report.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {report.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedReportConfig?.name} Configuration
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                {/* Date Range */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Report Period
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Start Date
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          className="form-input pl-10"
                          value={dateRange.start_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Date
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          className="form-input pl-10"
                          value={dateRange.end_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Filters (Optional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Type
                      </label>
                      <select
                        className="form-select mt-1"
                        value={filters.account_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, account_type: e.target.value }))}
                      >
                        {accountTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project
                      </label>
                      <select
                        className="form-select mt-1"
                        value={filters.project_id}
                        onChange={(e) => setFilters(prev => ({ ...prev, project_id: e.target.value }))}
                      >
                        <option value="">All Projects</option>
                        <option value="1">Education Program</option>
                        <option value="2">Health Initiative</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cost Center
                      </label>
                      <select
                        className="form-select mt-1"
                        value={filters.cost_center_id}
                        onChange={(e) => setFilters(prev => ({ ...prev, cost_center_id: e.target.value }))}
                      >
                        <option value="">All Cost Centers</option>
                        <option value="1">Administration</option>
                        <option value="2">Programs</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Report will be generated for the selected period and filters
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleGenerateReport}
                      disabled={generating}
                      className="btn-primary"
                    >
                      {generating ? (
                        <>
                          <div className="spinner h-4 w-4 mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Reports
          </h3>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="table-header">Report Type</th>
                  <th className="table-header">Period</th>
                  <th className="table-header">Generated</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="table-cell">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-5 w-5 text-blue-500 mr-2" />
                      Trial Balance
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    Jan 2024 - Dec 2024
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {formatDate(new Date())}
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Completed</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 dark:text-green-400">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`${reportData?.title} Preview`}
        size="xl"
      >
        {reportData && (
          <ReportPreview 
            data={reportData} 
            reportType={selectedReport}
            onExport={handleExportReport}
          />
        )}
      </Modal>
    </div>
  );
};

// Report Preview Component
const ReportPreview = ({ data, reportType, onExport }) => {
  const { formatCurrency } = useLanguage();

  const renderTrialBalance = () => (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold">{data.title}</h2>
        <p className="text-gray-600">{data.period}</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Account Code</th>
              <th className="text-left py-2">Account Name</th>
              <th className="text-right py-2">Debit</th>
              <th className="text-right py-2">Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{item.account_code}</td>
                <td className="py-2">{item.account_name}</td>
                <td className="py-2 text-right">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                <td className="py-2 text-right">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold">
              <td colSpan="2" className="py-2">Total</td>
              <td className="py-2 text-right">{formatCurrency(data.totals.debit)}</td>
              <td className="py-2 text-right">{formatCurrency(data.totals.credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold">{data.title}</h2>
        <p className="text-gray-600">{data.period}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Assets */}
        <div>
          <h3 className="text-lg font-semibold mb-4">ASSETS</h3>
          <div className="space-y-2">
            <h4 className="font-medium">Current Assets</h4>
            {data.assets.current.map((item, index) => (
              <div key={index} className="flex justify-between pl-4">
                <span>{item.name}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="border-t pt-2 font-semibold flex justify-between">
              <span>Total Assets</span>
              <span>{formatCurrency(data.assets.total)}</span>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div>
          <h3 className="text-lg font-semibold mb-4">LIABILITIES & EQUITY</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Current Liabilities</h4>
              {data.liabilities.current.map((item, index) => (
                <div key={index} className="flex justify-between pl-4">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium">Equity</h4>
              {data.equity.items.map((item, index) => (
                <div key={index} className="flex justify-between pl-4">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 font-semibold flex justify-between">
              <span>Total Liabilities & Equity</span>
              <span>{formatCurrency(data.liabilities.total + data.equity.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Report Content */}
      <div className="bg-white p-6 border rounded-lg max-h-96 overflow-y-auto">
        {reportType === 'trial-balance' && renderTrialBalance()}
        {reportType === 'balance-sheet' && renderBalanceSheet()}
        {!['trial-balance', 'balance-sheet'].includes(reportType) && (
          <div className="text-center py-8 text-gray-500">
            Report preview for {reportType} would be displayed here
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-500">
          Report generated successfully. Choose export format:
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onExport('pdf')}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={() => onExport('excel')}
            className="btn-secondary"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={() => onExport('csv')}
            className="btn-secondary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;