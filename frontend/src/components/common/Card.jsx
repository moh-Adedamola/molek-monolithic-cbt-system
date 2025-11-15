import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Card = ({
                  title,
                  subtitle,
                  icon: Icon,
                  value,
                  trend,
                  className = '',
                  variant = 'light',
                  children
              }) => {
    const baseClasses = clsx(
        'p-6 rounded-xl border transition-all duration-200 shadow-sm',
        'hover:shadow-md',
        variant === 'dark'
            ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300',
        className
    );

    return (
        <div className={baseClasses}>
            {children ? (
                children
            ) : (
                <>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            {title && (
                                <p className={clsx(
                                    'text-sm font-medium mb-1',
                                    variant === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                )}>
                                    {title}
                                </p>
                            )}
                            {value !== undefined && (
                                <p className={clsx(
                                    'text-3xl font-bold',
                                    variant === 'dark' ? 'text-white' : 'text-gray-900'
                                )}>
                                    {value}
                                </p>
                            )}
                            {subtitle && (
                                <p className={clsx(
                                    'mt-1 text-sm',
                                    variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                )}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {Icon && (
                            <div className={clsx(
                                'rounded-full p-3 ml-4',
                                variant === 'dark'
                                    ? 'bg-blue-900/30'
                                    : 'bg-blue-100'
                            )}>
                                <Icon className={clsx(
                                    'h-6 w-6',
                                    variant === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                )} />
                            </div>
                        )}
                    </div>
                    {trend && (
                        <div className="mt-4 flex items-center">
                            <span className={clsx(
                                'inline-flex items-center text-sm font-medium',
                                trend.positive
                                    ? variant === 'dark' ? 'text-green-400' : 'text-green-600'
                                    : variant === 'dark' ? 'text-red-400' : 'text-red-600'
                            )}>
                                {trend.positive ? (
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                {trend.value}
                            </span>
                            <span className={clsx(
                                'ml-2 text-sm',
                                variant === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            )}>
                                {trend.label}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Card;