import Button from './Button';
import Modal from './Modal';
import clsx from 'clsx';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    loading = false,
    variant = 'light',
    confirmDisabled = false,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            variant={variant}
        >
            <div className="space-y-6">
                <div className={clsx(
                    'text-base',
                    variant === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                    {message}
                </div>
                <div className="flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                        disabled={confirmDisabled || loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;