import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';

const Alert = ({
                   type = 'info',
                   message,
                   onClose,
                   duration = 5000,
                   variant = 'light'
               }) => {
    useEffect(() => {
        if (duration && onClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle,
        info: Info,
    };

    const styles = variant === 'dark' ? {
        success: 'bg-green-900/20 text-green-300 border-green-800/30',
        error: 'bg-red-900/20 text-red-300 border-red-800/30',
        warning: 'bg-yellow-900/20 text-yellow-300 border-yellow-800/30',
        info: 'bg-blue-900/20 text-blue-300 border-blue-800/30',
    } : {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200',
    };

    const Icon = icons[type];

    return (
        <div className={clsx(
            'flex items-center gap-3 rounded-lg border p-4 shadow-sm',
            'transition-all duration-200 animate-in slide-in-from-top-2',
            styles[type]
        )}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{message}</p>
            {onClose && (
                <button
                    onClick={onClose}
                    className={clsx(
                        'flex-shrink-0 rounded-lg p-1 transition-all duration-200',
                        'hover:scale-110 active:scale-95',
                        variant === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'
                    )}
                    aria-label="Close alert"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

export default Alert;