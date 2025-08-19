// frontend/src/components/Tables/ResponsiveTable.jsx

import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useState } from 'react';

const ResponsiveTable = ({ data, columns, onRowClick }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Mobile card view
  const MobileCard = ({ row }) => {
    const isExpanded = expandedRows.has(row.id);
    const primaryColumn = columns[0];
    const secondaryColumn = columns[1];

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        {/* Card header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              {row[primaryColumn.key]}
            </div>
            {secondaryColumn && (
              <div className="text-sm text-gray-500">
                {row[secondaryColumn.key]}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onRowClick && (
              <button
                onClick={() => onRowClick(row)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={() => toggleRow(row.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <dl className="space-y-2">
              {columns.slice(2).map(column => (
                <div key={column.key} className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">
                    {column.title}:
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map(column => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden">
        {data.map(row => (
          <MobileCard key={row.id} row={row} />
        ))}
      </div>
    </>
  );
};

export default ResponsiveTable;