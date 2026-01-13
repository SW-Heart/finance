import React, { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '确定',
    cancelText = '取消',
    type = 'info' // danger, info, success
}) => {

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && onConfirm) onConfirm();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onConfirm]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle size={24} />;
            case 'success': return <CheckCircle size={24} />;
            default: return <Info size={24} />;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
                <div className="confirm-header">
                    <div className={`confirm-icon-wrapper ${type}`}>
                        {getIcon()}
                    </div>
                    <div className="confirm-text-content">
                        <h3>{title}</h3>
                        <p>{message}</p>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button className="btn-confirm-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    {onConfirm && (
                        <button
                            className={`btn-confirm-action ${type}`}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
