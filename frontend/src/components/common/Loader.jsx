import clsx from 'clsx';

const Loader = ({
                    fullScreen = false,
                    size = 'md',
                    variant = 'light',
                    text = ''
                }) => {
    const sizes = {
        sm: 'h-6 w-6 border-2',
        md: 'h-10 w-10 border-3',
        lg: 'h-16 w-16 border-4',
    };

    const loader = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={clsx(
                    'animate-spin rounded-full',
                    sizes[size],
                    variant === 'dark'
                        ? 'border-gray-600 border-t-blue-500'
                        : 'border-gray-300 border-t-blue-600'
                )}
            />
            {text && (
                <p className={clsx(
                    'text-sm font-medium',
                    variant === 'dark' ? 'text-gray-300' : 'text-gray-700'
                )}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className={clsx(
                'fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
                variant === 'dark' ? 'bg-black/50' : 'bg-white/90'
            )}>
                {loader}
            </div>
        );
    }

    return loader;
};

export default Loader;