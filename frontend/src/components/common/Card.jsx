import clsx from 'clsx';

const Card = ({ title, subtitle, icon: Icon, value, trend, className = '' }) => {
  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between">
        <div>
          {title && <p className="text-sm font-medium text-gray-600">{title}</p>}
          {value !== undefined && (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-full bg-blue-100 p-3">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span
            className={clsx(
              'text-sm font-medium',
              trend.positive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="ml-2 text-sm text-gray-600">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default Card;