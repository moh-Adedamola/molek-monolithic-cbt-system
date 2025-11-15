import { Check } from 'lucide-react';
import clsx from 'clsx';

const Stepper = ({
                     steps,
                     currentStep,
                     variant = 'light'
                 }) => {
    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <div key={index} className="flex flex-1 items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={clsx(
                                        'flex h-10 w-10 items-center justify-center rounded-full',
                                        'border-2 font-semibold transition-all duration-200',
                                        isCompleted && 'border-green-600 bg-green-600 text-white',
                                        isCurrent && 'border-blue-600 bg-blue-600 text-white scale-110',
                                        !isCompleted && !isCurrent && (
                                            variant === 'dark'
                                                ? 'border-gray-600 bg-gray-800 text-gray-400'
                                                : 'border-gray-300 bg-white text-gray-500'
                                        )
                                    )}
                                >
                                    {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                                </div>
                                <p
                                    className={clsx(
                                        'mt-2 text-sm font-medium text-center',
                                        (isCompleted || isCurrent)
                                            ? variant === 'dark' ? 'text-white' : 'text-gray-900'
                                            : variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                    )}
                                >
                                    {step.title}
                                </p>
                                {step.description && (
                                    <p className={clsx(
                                        'mt-1 text-xs text-center',
                                        variant === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                    )}>
                                        {step.description}
                                    </p>
                                )}
                            </div>

                            {index < steps.length - 1 && (
                                <div
                                    className={clsx(
                                        'mx-4 h-0.5 flex-1 transition-all duration-200',
                                        isCompleted
                                            ? 'bg-green-600'
                                            : variant === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Stepper;