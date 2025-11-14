import { Check } from 'lucide-react';
import clsx from 'clsx';

const Stepper = ({ steps, currentStep }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={index} className="flex flex-1 items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors',
                    isCompleted && 'border-green-600 bg-green-600 text-white',
                    isCurrent && 'border-blue-600 bg-blue-600 text-white',
                    !isCompleted && !isCurrent && 'border-gray-300 bg-white text-gray-500'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                </div>
                <p
                  className={clsx(
                    'mt-2 text-sm font-medium',
                    (isCompleted || isCurrent) ? 'text-gray-900' : 'text-gray-500'
                  )}
                >
                  {step.title}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-4 h-0.5 flex-1 transition-colors',
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
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