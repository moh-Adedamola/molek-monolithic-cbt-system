import clsx from 'clsx';

const Input = ({
                   label,
                   error,
                   type = 'text',
                   className = '',
                   variant = 'light',
                   required = false,
                   ...props
               }) => {
    const baseClasses = clsx(
        'w-full px-4 py-2.5 rounded-lg border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'dark'
            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500',
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
            <input
                type={type}
                className={baseClasses}
                required={required}
                {...props}
            />
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

export default Input;