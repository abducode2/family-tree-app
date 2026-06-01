

'use client';
import { useState, useEffect, useRef } from 'react';
import { Person, PersonPage } from '@/types';
import { searchSons, SonSearchResult } from '@/lib/familyService';

interface ChildModalProps {
  initial?: Person | null;
  wives: Person[];
  allPages: PersonPage[];
  currentUserId: string;
  fatherName: string;
  pageGender?: 'male' | 'female';
  onSave: (child: Person, spouseInfo?: { husbandPageId: string; husbandPersonId: string; husbandName: string }) => void;
  onClose: () => void;
}

export default function ChildModal({
  initial, wives, allPages, currentUserId, fatherName, pageGender = 'male', onSave, onClose
}: ChildModalProps) {
  const [name,       setName]       = useState(initial?.name ?? '');
  const [gender,     setGender]     = useState<'male' | 'female'>(initial?.gender ?? 'male');
  const [motherId,   setMotherId]   = useState(initial?.motherId ?? '');

  // بحث الزوج
  const [spouseQuery,    setSpouseQuery]    = useState(initial?.spouseName ?? '');
  const [spouseResults,  setSpouseResults]  = useState<SonSearchResult[]>([]);
  const [showSpouseDrop, setShowSpouseDrop] = useState(false);
  const [selectedSpouse, setSelectedSpouse] = useState<SonSearchResult | null>(null);
  // إذا كان اسماً يدوياً فقط
  const [spouseManual,   setSpouseManual]   = useState(
    initial?.spouseName && !initial.spousePageId ? initial.spouseName : ''
  );
  const [spouseMode,     setSpouseMode]     = useState<'search' | 'manual'>(
    initial?.spousePageId ? 'search' : 'manual'
  );

  const spouseRef = useRef<HTMLDivElement>(null);

  // إغلاق dropdown عند النقر خارجه
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (spouseRef.current && !spouseRef.current.contains(e.target as Node))
        setShowSpouseDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // بحث فوري
  useEffect(() => {
    if (spouseMode !== 'search' || !spouseQuery.trim()) { setSpouseResults([]); return; }
    const t = setTimeout(async () => {
      const res = await searchSons(currentUserId, spouseQuery);
      setSpouseResults(res);
      setShowSpouseDrop(true);
    }, 250);
    return () => clearTimeout(t);
  }, [spouseQuery, spouseMode, currentUserId]);

  const handleSelectSpouse = (s: SonSearchResult) => {
    setSelectedSpouse(s);
    setSpouseQuery(s.name);
    setShowSpouseDrop(false);
  };

  const clearSpouse = () => {
    setSelectedSpouse(null);
    setSpouseQuery('');
    setSpouseManual('');
  };

  const fullName = !initial && name.trim()
    ? `${name.trim()} ${gender === 'male' ? '' : ''} ${fatherName}`
    : name.trim();

  const handleSave = () => {
    if (!name.trim()) return;
    if (wives.length > 0 && !motherId) return;

    const spouseName = spouseMode === 'search'
      ? selectedSpouse?.name
      : spouseManual.trim() || undefined;

    const child: Person = {
      id: initial?.id ?? Math.random().toString(36).slice(2),
      name: fullName,
      gender,
      motherId: motherId || undefined,
      motherName: wives.find(w => w.id === motherId)?.name,
      linkedPersonId: initial?.linkedPersonId,
      spouseName,
      spousePageId: spouseMode === 'search' ? selectedSpouse?.pageId || undefined : undefined,
      spousePersonId: spouseMode === 'search' ? selectedSpouse?.personId || undefined : undefined,
    };

    const spouseInfo = (spouseMode === 'search' && selectedSpouse?.pageId)
      ? { husbandPageId: selectedSpouse.pageId, husbandPersonId: selectedSpouse.personId, husbandName: selectedSpouse.name }
      : undefined;

    onSave(child, spouseInfo);
  };

  const canSave = name.trim() && (wives.length === 0 || !!motherId);

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
                {g === 'male' ? 'الابناء ' : ' البنات'}
              </label>
            ))}
          </div>
        </div>

        {/* الأم — مطلوبة دائماً */}
        <div className="form-group">
          <label className="form-label">{pageGender === 'female' ? 'الأب *' : 'الأم *'}</label>
          {wives.length === 0 ? (
            <div style={{
              padding: '0.6rem 0.9rem', background: 'var(--gold-pale)',
              border: '1px solid var(--gold)', borderRadius: '8px',
              fontSize: '0.85rem', color: 'var(--ink)',
            }}>
              يجب إضافة زوجة أولاً قبل إضافة الأبناء
            </div>
          ) : (
            <select
              className="form-select"
              value={motherId}
              onChange={e => setMotherId(e.target.value)}
              style={{ borderColor: !motherId ? 'var(--gold)' : 'var(--border-light)' }}
            >
              <option value="">— اختر  —</option>
              {wives.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
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

        {/* زوج البنت — فقط للإناث */}
        {gender === 'female' && (
          <div className="form-group">
            <label className="form-label">
              الزوج
              <span style={{ marginRight: '0.4rem', fontSize: '0.72rem', opacity: 0.55,
                background: 'var(--parchment-dark)', padding: '0.1rem 0.45rem',
                borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                اختياري
              </span>
            </label>

            {/* تبديل الوضع */}
            <div className="auth-tabs" style={{ marginBottom: '0.75rem' }}>
              <button
                className={`auth-tab ${spouseMode === 'search' ? 'active' : ''}`}
                onClick={() => { setSpouseMode('search'); setSpouseManual(''); }}
              >
                🔍 بحث في المسجلين
              </button>
              <button
                className={`auth-tab ${spouseMode === 'manual' ? 'active' : ''}`}
                onClick={() => { setSpouseMode('manual'); clearSpouse(); }}
              >
                ✏️ كتابة يدوية
              </button>
            </div>

            {spouseMode === 'search' ? (
              <div ref={spouseRef} style={{ position: 'relative' }}>
                {selectedSpouse ? (
                  /* عرض الزوج المحدد */
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.9rem', background: 'var(--male-bg)',
                    border: '2px solid var(--male-border)', borderRadius: '8px',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedSpouse.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>ابن {selectedSpouse.parentName}</div>
                      {selectedSpouse.pageId && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.1rem' }}>
                          ✓ له صفحة — سيُضاف الربط تلقائياً
                        </div>
                      )}
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={clearSpouse}
                      style={{ fontSize: '0.75rem' }}>تغيير</button>
                  </div>
                ) : (
                  <>
                    <input
                      className="form-input"
                      value={spouseQuery}
                      onChange={e => { setSpouseQuery(e.target.value); setShowSpouseDrop(true); }}
                      placeholder="ابحث باسم الزوج..."
                      onFocus={() => spouseResults.length > 0 && setShowSpouseDrop(true)}
                    />
                    {showSpouseDrop && spouseQuery.trim() && (
                      <div className="search-results" style={{ position: 'absolute', top: 'calc(100% + 4px)', zIndex: 300 }}>
                        {spouseResults.length > 0 ? spouseResults.map((s, i) => (
                          <div key={i} className="search-result-item" onClick={() => handleSelectSpouse(s)}>
                            <span className="search-result-badge badge-son">ابن</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                ابن {s.parentName}
                                {s.pageId && <span style={{ color: 'var(--sage)', marginRight: '0.3rem' }}> · له صفحة</span>}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div style={{ padding: '0.75rem 1rem' }}>
                            <p style={{ fontSize: '0.82rem', opacity: 0.6, marginBottom: '0.5rem' }}>
                              لا توجد نتائج
                            </p>
                            <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                              onClick={() => { setSpouseMode('manual'); setSpouseManual(spouseQuery); setShowSpouseDrop(false); }}>
                              + إضافة "{spouseQuery}" يدوياً
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <input
                className="form-input"
                value={spouseManual}
                onChange={e => setSpouseManual(e.target.value)}
                placeholder="اسم الزوج"
              />
            )}
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
