import React from 'react';
import { FiChevronLeft, FiChevronRight, FiInbox } from 'react-icons/fi';

const DataTable = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found',
  emptyAction = null,
  pagination = null,
  onPageChange = null,
  renderMobileCard = null,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Loading Overlay */}
      {loading ? (
        <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Loading data...</span>
        </div>
      ) : data && data.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-cyan-500/10 rounded-2xl bg-slate-900/90 shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-cyan-500/10">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`px-6 py-4 font-bold text-slate-300 ${col.className || ''}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.map((row, rowIndex) => (
                  <tr
                    key={row._id || rowIndex}
                    className="hover:bg-slate-800/60 transition-colors duration-150 group"
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                        {col.cell ? col.cell(row) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="block md:hidden space-y-3">
            {data.map((row, rowIndex) => (
              <div
                key={row._id || rowIndex}
                className="p-4 bg-slate-900 border border-cyan-500/10 rounded-xl space-y-3 shadow-md"
              >
                {renderMobileCard ? (
                  renderMobileCard(row)
                ) : (
                  <div className="space-y-2 text-xs">
                    {columns.map((col, colIndex) => (
                      <div key={colIndex} className="flex items-center justify-between border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-semibold text-slate-400">{col.header}:</span>
                        <span className="text-slate-200 font-medium">{col.cell ? col.cell(row) : row[col.accessor]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 px-2">
              <div>
                Showing page <span className="font-bold text-white">{pagination.page}</span> of{' '}
                <span className="font-bold text-white">{pagination.pages}</span> (
                <span className="font-bold text-cyan-400">{pagination.total}</span> total items)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange && onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 flex items-center space-x-1 cursor-pointer transition"
                >
                  <FiChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => onPageChange && onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 flex items-center space-x-1 cursor-pointer transition"
                >
                  <span>Next</span>
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="py-16 px-4 text-center bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-slate-800/80 text-cyan-400 rounded-2xl">
            <FiInbox className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">{emptyMessage}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Get started by adding a new record or modifying your search filter parameters.
            </p>
          </div>
          {emptyAction && <div className="pt-2">{emptyAction}</div>}
        </div>
      )}
    </div>
  );
};

export default DataTable;
