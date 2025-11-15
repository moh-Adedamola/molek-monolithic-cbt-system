import { X } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';

const Modal = ({
                   isOpen,
                   onClose,
                   title,
                   children,
                   size = 'md',
                   variant = 'light',
                   footer,
               }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
    };

    const modalClasses = clsx(
        'relative w-full mx-4 rounded-xl shadow-2xl',
        'transform transition-all duration-300 ease-out',
        sizes[size],
        variant === 'dark'
            ? 'bg-gray-900 text-white border border-gray-700'
            : 'bg-white border border-gray-200'
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            <div className={modalClasses} style={{ maxHeight: '90vh' }}>
                <div className="flex flex-col h-full max-h-[90vh]">
                    <div className={clsx(
                        'flex items-center justify-between p-6 border-b',
                        variant === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    )}>
                        <h2 className={clsx(
                            'text-xl font-bold',
                            variant === 'dark' ? 'text-white' : 'text-gray-900'
                        )}>
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className={clsx(
                                'rounded-lg p-2 transition-all duration-200 hover:scale-110',
                                variant === 'dark'
                                    ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                            )}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {children}
                    </div>

                    {footer && (
                        <div className={clsx(
                            'border-t p-6',
                            variant === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        )}>
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;