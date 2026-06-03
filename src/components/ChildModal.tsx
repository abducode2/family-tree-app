'use client';
import { useState } from 'react';
import { Person } from '@/types';

interface ChildModalProps {
  initial?: Person | null;
  wives: Person[];
  fatherName: string;
  pageGender?: 'male' | 'female';
  onSave: (child: Person) => void;
  onClose: () => void;
}

export default function ChildModal({
  initial, wives, fatherName, pageGender = 'male', onSave, onClose
}: ChildModalProps) {
  const [name,     setName]     = useState(initial?.name ?? '');
  const [gender,   setGender]   = useState<'male' | 'female'>(initial?.gender ?? 'male');
  const [motherId, setMotherId] = useState(initial?.motherId ?? '');

  const effectiveFatherName = pageGender === 'female'
    ? (wives.find(w => w.id === motherId)?.name ?? fatherName)
    : fatherName;

  const fullName = !initial && name.trim()
    ? `${name.trim()} ${effectiveFatherName}`
    : name.trim();

  const handleSave = () => {
    if (!name.trim()) return;
    if (wives.length > 0 && !motherId) return;

    onSave({
      id: initial?.id ?? Math.random().toString(36).slice(2),
      name: fullName,
      gender,
      motherId: motherId || undefined,
      motherName: wives.find(w => w.id === motherId)?.name,
      linkedPersonId: initial?.linkedPersonId,
    });
  };

  const canSave = wives.length > 0 && !!name.trim() && !!motherId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{initial ? 'تعديل' : 'إضافة ابن / بنت'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* الجنس */}
        <div className="form-group">
          <label className="form-label">الجنس *</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['male', 'female'] as const).map(g => (
              <label key={g} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.4rem', cursor: 'pointer', padding: '0.55rem', borderRadius: '8px',
                border: '2px solid',
                borderColor: gender === g ? (g === 'male' ? 'var(--male-border)' : 'var(--female-border)') : 'var(--border-light)',
                background: gender === g ? (g === 'male' ? 'var(--male-bg)' : 'var(--female-bg)') : 'white',
                fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.15s',
              }}>
                <input type="radio" name="gender" value={g} checked={gender === g}
                  onChange={() => setGender(g)} style={{ display: 'none' }} />
                {g === 'male' ? 'الأبناء' : 'البنات'}
              </label>
            ))}
          </div>
        </div>

        {/* الأم / الأب */}
        <div className="form-group">
          <label className="form-label">{pageGender === 'female' ? 'الأب *' : 'الأم *'}</label>
          {wives.length === 0 ? (
            <div style={{
              padding: '0.6rem 0.9rem', background: 'var(--gold-pale)',
              border: '1px solid var(--gold)', borderRadius: '8px',
              fontSize: '0.85rem', color: 'var(--ink)',
            }}>
              {pageGender === 'female'
                ? 'يجب إضافة الزوج أولاً قبل إضافة الأبناء'
                : 'يجب إضافة زوجة أولاً قبل إضافة الأبناء'}
            </div>
          ) : (
            <select
              className="form-select"
              value={motherId}
              onChange={e => setMotherId(e.target.value)}
              style={{ borderColor: !motherId ? 'var(--gold)' : 'var(--border-light)' }}
            >
              <option value="">— اختر —</option>
              {wives.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.divorced ? (w.gender === 'male' ? ' (مطلق)' : ' (مطلقة)') : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* الاسم مع معاينة */}
        <div className="form-group">
          <label className="form-label">الاسم *</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="أدخل الاسم"
            autoFocus={wives.length > 0}
            disabled={wives.length === 0}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={wives.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          />
          {name.trim() && !initial && (
            <div style={{
              marginTop: '0.4rem', padding: '0.45rem 0.75rem',
              background: 'var(--gold-pale)', border: '1px solid var(--gold)',
              borderRadius: '8px', fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <span style={{ opacity: 0.6 }}>سيُسجَّل باسم:</span>
              <strong>{fullName}</strong>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
