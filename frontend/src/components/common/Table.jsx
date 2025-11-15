import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import clsx from 'clsx';

const Table = ({
                   columns,
                   data,
                   loading = false,
                   pagination = true,
                   searchable = true,
                   onRowClick,
                   emptyMessage = 'No data available',
                   variant = 'light',
               }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const filteredData = searchTerm
        ? data.filter((row) =>
            Object.values(row).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
        : data;

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-4">
            {searchable && (
                <div className="relative">
                    <Search className={clsx(
                        'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2',
                        variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    )} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className={clsx(
                            'w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all duration-200',
                            'focus:outline-none focus:ring-2 focus:ring-offset-0',
                            variant === 'dark'
                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                        )}
                    />
                </div>
            )}

            <div className={clsx(
                'overflow-x-auto rounded-lg border',
                variant === 'dark' ? 'border-gray-700' : 'border-gray-200'
            )}>
                <table className="w-full">
                    <thead className={variant === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={clsx(
                                    'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider',
                                    variant === 'dark' ? 'text-gray-300' : 'text-gray-500'
                                )}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody className={clsx(
                        'divide-y',
                        variant === 'dark' ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'
                    )}>
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-12 text-center">
                                <div className="flex justify-center">
                                    <div className={clsx(
                                        'h-8 w-8 animate-spin rounded-full border-4',
                                        variant === 'dark'
                                            ? 'border-gray-600 border-t-blue-500'
                                            : 'border-gray-300 border-t-blue-600'
                                    )} />
                                </div>
                            </td>
                        </tr>
                    ) : paginatedData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className={clsx(
                                'px-6 py-12 text-center',
                                variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            )}>
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        paginatedData.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                onClick={() => onRowClick?.(row)}
                                className={clsx(
                                    'transition-colors',
                                    onRowClick && 'cursor-pointer',
                                    variant === 'dark'
                                        ? 'hover:bg-gray-800'
                                        : 'hover:bg-gray-50'
                                )}
                            >
                                {columns.map((column) => (
                                    <td key={column.key} className={clsx(
                                        'whitespace-nowrap px-6 py-4 text-sm',
                                        variant === 'dark' ? 'text-gray-300' : 'text-gray-900'
                                    )}>
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {pagination && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className={clsx(
                        'text-sm',
                        variant === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    )}>
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of{' '}
                        {filteredData.length} results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={clsx(
                                'p-2 rounded-lg border transition-colors',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                variant === 'dark'
                                    ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className={clsx(
                            'px-4 text-sm',
                            variant === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        )}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={clsx(
                                'p-2 rounded-lg border transition-colors',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                variant === 'dark'
                                    ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Table;