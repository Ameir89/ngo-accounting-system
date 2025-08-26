// frontend/src/components/Tables/JournalEntriesTable.jsx
import { CheckCircle, Edit, Eye, Trash2, XCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const JournalEntriesTable = ({
  entries = [],
  onView,
  onEdit,
  onDelete,
  onPost,
  loading = false,
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();

  const getStatusColor = (isPosted) => {
    return isPosted ? "badge-success" : "badge-warning";
  };

  const getStatusIcon = (isPosted) => {
    return isPosted ? CheckCircle : XCircle;
  };

  if (loading) {
    return (
      // <div className="p-8 text-center">
      //   <div className="spinner mx-auto mb-4"></div>
      //   <p className="text-gray-500">{t('loading')}</p>
      // </div>
      <LoadingSpinner size="md" message={t("loading")} />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="table-header">Entry #</th>
            <th className="table-header">{t("date")}</th>
            <th className="table-header">{t("description")}</th>
            <th className="table-header">Reference</th>
            <th className="table-header">Total Amount</th>
            <th className="table-header">{t("status")}</th>
            <th className="table-header">{t("actions")}</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {entries.length > 0 ? (
            entries.map((entry) => {
              const StatusIcon = getStatusIcon(entry.is_posted);
              return (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="table-cell font-medium text-gray-900 dark:text-white">
                    {entry.entry_number}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {formatDate(entry.entry_date)}
                  </td>
                  <td className="table-cell">
                    <div className="max-w-xs truncate">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.description}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {entry.reference_number || "-"}
                  </td>
                  <td className="table-cell font-medium text-gray-900 dark:text-white">
                    {formatCurrency(entry.total_debit)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${getStatusColor(
                        entry.is_posted
                      )} flex items-center w-fit`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {entry.is_posted ? t("posted") : t("draft")}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      {onView && (
                        <button
                          onClick={() => onView(entry)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}

                      {!entry.is_posted && (
                        <>
                          {onEdit && (
                            <button
                              onClick={() => onEdit(entry)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                              title="Edit Entry"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {onPost && (
                            <button
                              onClick={() => onPost(entry)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400"
                              title="Post Entry"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              onClick={() => onDelete(entry)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400"
                              title="Delete Entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan="7"
                className="table-cell text-center text-gray-500 dark:text-gray-400 py-8"
              >
                {t("No journal entries found")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default JournalEntriesTable;
