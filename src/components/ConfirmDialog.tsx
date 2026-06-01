'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'تأكيد', onConfirm, onCancel, danger = false
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p className="confirm-msg" dangerouslySetInnerHTML={{ __html: message }} />
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={danger ? { background: 'var(--terracotta)', color: 'white' } : {}}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
