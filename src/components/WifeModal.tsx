
'use client';
import { useState, useEffect, useRef } from 'react';
import { Person, PersonPage } from '@/types';

interface WifeModalProps {
  initial?: Person | null;
  allPages: PersonPage[];
  pageGender?: 'male' | 'female';
  onSave: (wife: Person) => void;
  onClose: () => void;
}

export default function WifeModal({ initial, allPages, pageGender = 'male', onSave, onClose }: WifeModalProps) {
  const [inputValue,     setInputValue]     = useState(initial?.name ?? '');
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; id: string; pageId: string; sourceLabel: string } | null>(null);
  const [divorced,       setDivorced]       = useState(initial?.divorced ?? false);
  const dropRef = useRef<HTMLDivElement>(null);

  const targetGender = pageGender === 'female' ? 'male' : 'female';

  // جمع الأشخاص المسجلين
  const seenPageIds = new Set<string>();
  const allPersons: { name: string; id: string; pageId: string; sourceLabel: string }[] = [];
  for (const p of allPages) {
    for (const c of p.children)
      if (c.gender === targetGender) {
        if (c.linkedPersonId) seenPageIds.add(c.linkedPersonId);
        allPersons.push({ name: c.name, id: c.id, pageId: c.linkedPersonId ?? '', sourceLabel: p.name });
      }
  }
  for (const p of allPages) {
    if (p.gender === targetGender && !seenPageIds.has(p.id))
      allPersons.push({ name: p.name, id: p.id, pageId: p.id, sourceLabel: 'صفحة مستقلة' });
  }

  const uniquePersons = allPersons.reduce<typeof allPersons>((acc, w) => {
    const idx = acc.findIndex(x => x.id === w.id);
    if (idx === -1) { acc.push(w); }
    else if (!acc[idx].pageId && w.pageId) { acc[idx] = w; }
    return acc;
  }, []);

  const filtered = inputValue.trim() && !selectedPerson
    ? uniquePersons.filter(w => w.name.includes(inputValue.trim()))
    : [];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (w: { name: string; id: string; pageId: string; sourceLabel: string }) => {
    setSelectedPerson(w);
    setInputValue(w.name);
    setShowDropdown(false);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setSelectedPerson(null);
    setShowDropdown(true);
  };

  const handleSave = () => {
    const name = inputValue.trim();
    if (!name) return;
    onSave({
      id: initial?.id ?? Math.random().toString(36).slice(2),
      name,
      gender: targetGender,
      linkedPersonId: selectedPerson?.pageId || undefined,
      divorced: divorced || undefined,
    });
  };

  const isLinked = !!selectedPerson?.pageId;
  const label = pageGender === 'female' ? 'اسم الزوج' : 'اسم الزوجة';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {initial ? 'تعديل' : pageGender === 'female' ? 'إضافة الزوج' : 'إضافة زوجة'}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group" ref={dropRef} style={{ position: 'relative' }}>
          <label className="form-label">{label} *</label>

          {isLinked ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              background: pageGender === 'female' ? 'var(--male-bg)' : 'var(--female-bg)',
              border: `2px solid ${pageGender === 'female' ? 'var(--male-border)' : 'var(--female-border)'}`,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedPerson!.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{selectedPerson!.sourceLabel}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.1rem' }}>
                  ✓ مسجل — سيُضاف الربط تلقائياً
                </div>
              </div>
              <button className="btn btn-sm btn-ghost"
                onClick={() => { setSelectedPerson(null); setInputValue(''); }}
                style={{ fontSize: '0.75rem' }}>تغيير</button>
            </div>
          ) : (
            <>
              <input
                className="form-input"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => inputValue.trim() && setShowDropdown(true)}
                placeholder={pageGender === 'female' ? 'اكتب اسم الزوج...' : 'اكتب اسم الزوجة...'}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !!inputValue.trim() && handleSave()}
              />

              {showDropdown && filtered.length > 0 && (
                <div className="search-results" style={{ position: 'absolute', top: 'calc(100% + 2px)', zIndex: 300, width: '100%' }}>
                  {filtered.map(w => (
                    <div key={w.id} className="search-result-item" onClick={() => handleSelect(w)}>
                      <span className={`search-result-badge ${pageGender === 'female' ? 'badge-son' : 'badge-wife'}`}>
                        {pageGender === 'female' ? 'ذكر' : 'أنثى'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.name}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                          {w.sourceLabel}
                          {w.pageId && <span style={{ color: 'var(--sage)', marginRight: '0.3rem' }}> · له صفحة</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem',
        }}>
          <input
            type="checkbox"
            checked={divorced}
            onChange={e => setDivorced(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span>{pageGender === 'female' ? 'مطلق' : 'مطلقة'}</span>
        </label>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!inputValue.trim()}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
