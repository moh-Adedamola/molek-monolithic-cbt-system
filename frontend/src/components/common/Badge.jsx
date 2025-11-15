import clsx from 'clsx';

const Badge = ({
                   children,
                   variant = 'default',
                   size = 'md',
                   className = ''
               }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-800 border-gray-200',
        success: 'bg-green-100 text-green-800 border-green-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        primary: 'bg-blue-600 text-white border-blue-700',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-full font-medium border',
                'transition-all duration-200',
                variants[variant],
                sizes[size],
                className
            )}
        >
            {children}
        </span>
    );
};

export default Badge;