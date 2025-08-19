// frontend/src/components/Tables/DataTable.jsx

import {
    ChevronDown, ChevronUp, Download, Filter,
    Search
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportUtils } from '../../services/utils';

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  pagination = null,
  onPageChange = () => {},
  onSort = () => {},
  onFilter = () => {},
  onRowAction = () => {},
  searchable = true,
  exportable = true,
  selectable = false,
  actions = []
}) => {
  const { t, isRTL } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
    onSort({ key, direction: sortConfig.direction });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(processedData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (id, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleExport = (format) => {
    const exportData = selectedRows.size > 0 
      ? processedData.filter(row => selectedRows.has(row.id))
      : processedData;

    if (format === 'csv') {
      exportUtils.downloadCsv(exportData, 'data-export');
    } else if (format === 'json') {
      exportUtils.downloadJson(exportData, 'data-export');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column.key) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary ${showFilters ? 'bg-gray-100' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('filter')}
            </button>

            {/* Export */}
            {exportable && (
              <div className="relative">
                <button className="btn-secondary dropdown-toggle">
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </button>
                <div className="dropdown-menu">
                  <button onClick={() => handleExport('csv')} className="dropdown-item">
                    Export as CSV
                  </button>
                  <button onClick={() => handleExport('json')} className="dropdown-item">
                    Export as JSON
                  </button>
                </div>
              </div>
            )}

            {/* Selection Info */}
            {selectedRows.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedRows.size} {t('selected')}
              </span>
            )}
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.filter(col => col.filterable).map(column => (
                <div key={column.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {column.title}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Filter by ${column.title}`}
                    onChange={(e) => onFilter(column.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && <SortIcon column={column} />}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50">
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => handleRowSelect(row.id, e.target.checked)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => onRowAction(action.key, row)}
                          className={`p-1 rounded-md ${action.className || 'text-gray-400 hover:text-gray-600'}`}
                          title={action.title}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {processedData.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">{t('noData')}</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.current_page - 1))}
              disabled={pagination.current_page === 1}
              className="btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(pagination.pages, pagination.current_page + 1))}
              disabled={pagination.current_page === pagination.pages}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.current_page - 1) * 20) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * 20, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 text-sm rounded-md ${
                      pagination.current_page === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;