'use client';
import { useState } from 'react';

interface ShareModalProps {
  family: { id: string; headName: string; sharedWith: string[] };
  currentUserEmail: string;
  onShare: (email: string) => void;
  onUnshare: (email: string) => void;
  onClose: () => void;
}

export default function ShareModal({ family, currentUserEmail, onShare, onUnshare, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');

  const handleShare = () => {
    const t = email.trim().toLowerCase();
    if (!t || !t.includes('@') || t === currentUserEmail) return;
    onShare(t);
    setEmail('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">مشاركة صفحة {family.headName}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className="form-input" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني" dir="ltr"
            onKeyDown={e => e.key === 'Enter' && handleShare()} />
          <button className="btn btn-primary" onClick={handleShare} style={{ flexShrink: 0 }}>مشاركة</button>
        </div>
        {family.sharedWith.length > 0 ? (
          <div className="share-list">
            {family.sharedWith.map(e => (
              <div key={e} className="share-item">
                <span dir="ltr" style={{ fontSize: '0.85rem' }}>{e}</span>
                <button className="btn btn-sm btn-danger" onClick={() => onUnshare(e)}>إزالة</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', opacity: 0.5, textAlign: 'center' }}>لا يوجد مشاركون</p>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
