

'use client';
import { useState, useEffect, useRef } from 'react';
import { Person, PersonPage } from '@/types';

interface WifeModalProps {
  initial?: Person | null;
  allPages: PersonPage[];
  onSave: (wife: Person) => void;
  onClose: () => void;
}

export default function WifeModal({ initial, allPages, onSave, onClose }: WifeModalProps) {
  const [mode, setMode] = useState<'search' | 'manual'>(initial ? 'manual' : 'search');

  // وضع البحث
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; id: string; pageId: string; sourceLabel: string } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // وضع الكتابة اليدوية
  const [manualName, setManualName] = useState(initial?.name ?? '');

  // جمع البنات فقط من كل الصفحات (id = صفحة البنت الخاصة إن وجدت، وإلا فارغ)
  const allWomen: { name: string; id: string; pageId: string; sourceLabel: string }[] = [];
  for (const p of allPages) {
    for (const c of p.children)
      if (c.gender === 'female')
        allWomen.push({
          name: c.name,
          id: c.id,
          pageId: c.linkedPersonId ?? '',   // صفحة البنت الخاصة
          sourceLabel: `${p.name}`,
        });
  }

  const filtered = searchQuery.trim()
    ? allWomen.filter(w => w.name.includes(searchQuery.trim()))
    : [];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchMode = (m: 'search' | 'manual') => {
    setMode(m);
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedPerson(null);
    if (m === 'manual') setManualName('');
  };

  const handleSelectFromSearch = (w: { name: string; id: string; pageId: string; sourceLabel: string }) => {
    setSelectedPerson(w);
    setShowDropdown(false);
  };

  const handleSave = () => {
    if (mode === 'search') {
      if (!selectedPerson) return;
      onSave({
        id: initial?.id ?? Math.random().toString(36).slice(2),
        name: selectedPerson.name,
        gender: 'female',
        // نربط فقط بصفحتها الخاصة (إن وجدت)، لا بـ id في قائمة children
        linkedPersonId: selectedPerson.pageId || undefined,
      });
    } else {
      const name = manualName.trim();
      if (!name) return;
      onSave({
        id: initial?.id ?? Math.random().toString(36).slice(2),
        name,
        gender: 'female',
        linkedPersonId: undefined,
      });
    }
  };

  const canSave = mode === 'search' ? !!selectedPerson : !!manualName.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{initial ? 'تعديل الزوجة' : 'إضافة زوجة'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* تبديل الوضع */}
        {!initial && (
          <div className="auth-tabs" style={{ marginBottom: '1.25rem' }}>
            <button className={`auth-tab ${mode === 'search' ? 'active' : ''}`}
              onClick={() => switchMode('search')}>
              🔍 بحث في المسجلين
            </button>
            <button className={`auth-tab ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => switchMode('manual')}>
              ✏️ كتابة يدوية
            </button>
          </div>
        )}

        {mode === 'search' ? (
          <div ref={dropRef} style={{ position: 'relative' }}>
            {selectedPerson ? (
              /* عرض الشخص المختار */
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0.9rem', background: 'var(--female-bg)',
                border: '2px solid var(--female-border)', borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedPerson.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{selectedPerson.sourceLabel}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.1rem' }}>
                    {selectedPerson.pageId
                      ? '✓ لها صفحة — سيُضاف الربط تلقائياً'
                      : '✓ مسجلة في شجرة العائلة'}
                  </div>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => setSelectedPerson(null)}
                  style={{ fontSize: '0.75rem' }}>تغيير</button>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">ابحث عن اسم الزوجة</label>
                  <input
                    className="form-input"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                    placeholder="اكتب للبحث في الأسماء المسجلة..."
                    autoFocus
                    onFocus={() => searchQuery && setShowDropdown(true)}
                  />
                </div>

                {showDropdown && searchQuery.trim() && (
                  <div className="search-results" style={{ position: 'absolute', top: '100%', zIndex: 300 }}>
                    {filtered.length > 0 ? filtered.map(w => (
                      <div key={w.id} className="search-result-item" onClick={() => handleSelectFromSearch(w)}>
                        <span className="search-result-badge badge-wife">أنثى</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{w.sourceLabel}</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.6rem' }}>
                          لا توجد نتائج لـ "{searchQuery}"
                        </p>
                        <button className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => { setManualName(searchQuery); switchMode('manual'); }}>
                          + إضافة "{searchQuery}" يدوياً
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!searchQuery && (
                  <p style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center', marginTop: '0.5rem' }}>
                    أو{' '}
                    <button style={{ background: 'none', border: 'none', color: 'var(--cobalt)',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                      onClick={() => switchMode('manual')}>
                      اكتب الاسم مباشرةً
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">اسم الزوجة *</label>
            <input
              className="form-input"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              placeholder="أدخل اسم الزوجة"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && canSave && handleSave()}
            />
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}

