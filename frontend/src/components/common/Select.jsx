import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = ({
                    label,
                    error,
                    options = [],
                    placeholder = 'Select...',
                    className = '',
                    variant = 'light',
                    required = false,
                    ...props
                }) => {
    const baseClasses = clsx(
        'w-full px-4 py-2.5 rounded-lg border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'appearance-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'dark'
            ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
            : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500',
        error && (variant === 'dark' ? 'border-red-500 focus:ring-red-500' : 'border-red-500 focus:ring-red-500'),
        className
    );

    return (
        <div className="w-full">
            {label && (
                <label className={clsx(
                    'mb-2 block text-sm font-medium',
                    variant === 'dark' ? 'text-gray-300' : 'text-gray-700'
                )}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    className={baseClasses}
                    required={required}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className={clsx(
                    'absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none',
                    variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )} />
            </div>
            {error && (
                <p className={clsx(
                    'mt-1.5 text-sm',
                    variant === 'dark' ? 'text-red-400' : 'text-red-600'
                )}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Select;