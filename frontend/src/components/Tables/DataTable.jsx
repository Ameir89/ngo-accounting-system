// frontend/src/components/Tables/DataTable.jsx - Optimized Version
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Download, Filter, MoreHorizontal, Search
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportUtils } from '../../services/utils';
import LoadingSpinner from '../UI/LoadingSpinner';

// Memoized Table Row Component
const TableRow = memo(({ 
  row, 
  columns, 
  actions, 
  onRowAction, 
  selectable, 
  isSelected, 
  onRowSelect,
  index 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr 
      className={`
        border-b border-gray-200 dark:border-gray-700 transition-colors duration-150
        ${isHovered ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {selectable && (
        <td className="px-6 py-4 whitespace-nowrap w-12">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
            checked={isSelected}
            onChange={(e) => onRowSelect(row.id, e.target.checked)}
            aria-label={`Select row ${index + 1}`}
          />
        </td>
      )}
      
      {columns.map((column) => (
        <td 
          key={column.key} 
          className={`px-6 py-4 text-sm ${column.className || ''}`}
          style={{ width: column.width }}
        >
          <div className={column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}>
            {column.render ? (
              column.render(row[column.key], row, index)
            ) : (
              <span className="text-gray-900 dark:text-gray-100">
                {row[column.key] || '-'}
              </span>
            )}
          </div>
        </td>
      ))}
      
      {actions?.length > 0 && (
        <td className="px-6 py-4 whitespace-nowrap text-center w-32">
          <ActionDropdown 
            actions={actions} 
            onAction={(actionKey) => onRowAction(actionKey, row)}
            row={row}
          />
        </td>
      )}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// Action Dropdown Component
const ActionDropdown = memo(({ actions, onAction, row }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleActions = actions.filter(action => 
    !action.condition || action.condition(row)
  );

  if (visibleActions.length === 0) return null;

  if (visibleActions.length <= 3) {
    // Show icons directly for few actions
    return (
      <div className="flex items-center justify-center space-x-2">
        {visibleActions.map((action, index) => (
          <button
            key={index}
            onClick={() => onAction(action.key)}
            className={`p-1 rounded-md transition-colors ${action.className || 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
            title={action.title}
            disabled={action.disabled?.(row)}
          >
            {action.icon}
          </button>
        ))}
      </div>
    );
  }

  // Use dropdown for many actions
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="py-1">
            {visibleActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  onAction(action.key);
                  setIsOpen(false);
                }}
                disabled={action.disabled?.(row)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {action.icon && <span className="mr-3">{action.icon}</span>}
                {action.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ActionDropdown.displayName = 'ActionDropdown';

// Sort Icon Component
const SortIcon = memo(({ column, sortConfig }) => {
  if (!column.sortable) return null;
  
  if (sortConfig.key !== column.key) {
    return <ChevronDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
  }
  
  return sortConfig.direction === 'asc' 
    ? <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    : <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
});

SortIcon.displayName = 'SortIcon';

// Main DataTable Component
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
  actions = [],
  emptyMessage = 'No data available',
  className = '',
  stickyHeader = false,
  virtualScrolling = false,
  rowsPerPage = 20
}) => {
  const { t, isRTL } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({});
  
  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoized processed data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (debouncedSearchTerm && searchable) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = data.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value && value.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply local filters
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const rowValue = row[key];
          return rowValue && rowValue.toString().toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = aVal.toString().toLowerCase();
        const bStr = bVal.toString().toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, debouncedSearchTerm, localFilters, sortConfig, columns, searchable]);

  const handleSort = useCallback((key) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
    onSort({ key, direction: newDirection });
  }, [sortConfig, onSort]);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedRows(new Set(processedData.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  }, [processedData]);

  const handleRowSelect = useCallback((id, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  }, [selectedRows]);

  const handleExport = useCallback((format) => {
    const exportData = selectedRows.size > 0 
      ? processedData.filter(row => selectedRows.has(row.id))
      : processedData;

    const processedExportData = exportData.map(row => {
      const processed = {};
      columns.forEach(column => {
        processed[column.title || column.key] = row[column.key];
      });
      return processed;
    });

    if (format === 'csv') {
      exportUtils.downloadCsv(processedExportData, 'data-export');
    } else if (format === 'json') {
      exportUtils.downloadJson(processedExportData, 'data-export');
    }
  }, [processedData, selectedRows, columns]);

  const handleFilterChange = useCallback((key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    onFilter(key, value);
  }, [onFilter]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="p-8 text-center">
          <LoadingSpinner size="md" message={t('loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}>
      {/* Table Header Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
              className={`btn-secondary ${showFilters ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('filter')}
            </button>

            {/* Export */}
            {exportable && (
              <div className="relative group">
                <button className="btn-secondary">
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <button 
                      onClick={() => handleExport('csv')} 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Export as CSV
                    </button>
                    <button 
                      onClick={() => handleExport('json')} 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Export as JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selection Info */}
            {selectedRows.size > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded">
                {selectedRows.size} {t('selected')}
              </div>
            )}
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.filter(col => col.filterable).map(column => (
                <div key={column.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {column.title}
                  </label>
                  <input
                    type="text"
                    className="form-input bg-white dark:bg-gray-800"
                    placeholder={`Filter by ${column.title}`}
                    value={localFilters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={`bg-gray-50 dark:bg-gray-700 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedRows.size === processedData.length && processedData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`
                      px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                      ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group' : ''}
                      ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                    onClick={() => column.sortable && handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      <SortIcon column={column} sortConfig={sortConfig} />
                    </div>
                  </th>
                ))}
                
                {actions?.length > 0 && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    {t('actions')}
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {processedData.length > 0 ? (
                processedData.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    row={row}
                    columns={columns}
                    actions={actions}
                    onRowAction={onRowAction}
                    selectable={selectable}
                    isSelected={selectedRows.has(row.id)}
                    onRowSelect={handleRowSelect}
                    index={index}
                  />
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions?.length > 0 ? 1 : 0)} 
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.current_page - 1))}
              disabled={pagination.current_page === 1}
              className="btn-secondary flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
              {pagination.current_page} of {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(pagination.pages, pagination.current_page + 1))}
              disabled={pagination.current_page === pagination.pages}
              className="btn-secondary flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.current_page - 1) * rowsPerPage) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * rowsPerPage, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(Math.max(1, pagination.current_page - 1))}
                disabled={pagination.current_page === 1}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {[...Array(Math.min(7, pagination.pages))].map((_, index) => {
                let page;
                if (pagination.pages <= 7) {
                  page = index + 1;
                } else if (pagination.current_page <= 4) {
                  page = index + 1;
                } else if (pagination.current_page >= pagination.pages - 3) {
                  page = pagination.pages - 6 + index;
                } else {
                  page = pagination.current_page - 3 + index;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      pagination.current_page === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => onPageChange(Math.min(pagination.pages, pagination.current_page + 1))}
                disabled={pagination.current_page === pagination.pages}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DataTable);