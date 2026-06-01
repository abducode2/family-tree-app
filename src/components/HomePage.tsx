
'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { PersonPage, SearchResult } from '@/types';
import { getUserPages, getRootPages, createRootPage, searchPeople } from '@/lib/familyService';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { usePage } from '@/hooks/useFamily';
import { ToastProvider, useToast } from '@/components/Toast';
import PersonPageView from '@/components/PersonPageView';
import ConfirmDialog from '@/components/ConfirmDialog';

function HomeInner() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { current, navigate, goBack, goHome, canGoBack } = useNavigationHistory();
  const { page, loading: pageLoading, refresh: refreshPage } = usePage(current);

  const [allPages,      setAllPages]    = useState<PersonPage[]>([]);
  const [rootPages,     setRootPages]   = useState<PersonPage[]>([]);
  const [loadingList,   setLoadingList] = useState(true);

  // إضافة جد
  const [showAddModal, setShowAddModal] = useState(false);
  const [grandName,    setGrandName]    = useState('');
  const [adding,       setAdding]       = useState(false);

  // فلترة الأجداد في الصفحة الرئيسية
  const [filterQ, setFilterQ] = useState('');

  // بحث عام (في الشريط العلوي)
  const [searchQ,    setSearchQ]    = useState('');
  const [searchRes,  setSearchRes]  = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [confirmLogout, setConfirmLogout] = useState(false);

  // ── تحميل البيانات ──
  const loadAll = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const [roots, pages] = await Promise.all([
        getRootPages(user.uid),
        getUserPages(user.uid),
      ]);
      setRootPages(roots);
      setAllPages(pages);
    } finally { setLoadingList(false); }
  };

  useEffect(() => { loadAll(); }, [user]);

  // ── بحث عام ──
  useEffect(() => {
    if (!user || !searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const r = await searchPeople(user.uid, searchQ);
      setSearchRes(r); setShowSearch(true);
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ, user]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearch(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── إضافة جد ──
  const handleAddRoot = async () => {
    if (!grandName.trim() || !user) return;
    setAdding(true);
    try {
      const id = await createRootPage(grandName.trim(), user.uid);
      showToast(`تمت إضافة ${grandName}`, 'success');
      setGrandName(''); setShowAddModal(false);
      await loadAll();
      navigate(id);
    } catch (e) { console.error(e); showToast('حدث خطأ', 'error'); }
    finally { setAdding(false); }
  };

  const handleRefresh = async () => { await refreshPage(); await loadAll(); };
  const handleDeleted = async () => { await loadAll(); goHome(); };

  // الأجداد المفلترة بحسب خانة البحث
  const filteredRoots = filterQ.trim()
    ? rootPages.filter(r => r.name.includes(filterQ.trim()))
    : rootPages;

  const typeBadge: Record<SearchResult['type'], { label: string; cls: string }> = {
    grandfather: { label: 'جد',   cls: 'badge-grandfather' },
    wife:        { label: 'زوجة', cls: 'badge-wife'        },
    son:         { label: 'ابن',  cls: 'badge-son'         },
    daughter:    { label: 'بنت',  cls: 'badge-daughter'    },
  };

  return (
    <div className="app-container">
      {/* ── شريط التنقل ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🌳</span>
          <span>شجرة العائلة</span>
        </div>
        <div className="navbar-actions">
          <span className="navbar-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost"
            style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={() => setConfirmLogout(true)}>
            خروج
          </button>
        </div>
      </nav>

      <div className="main-layout">

        {/* ── بحث عام (دائم الظهور) ── */}
        <div className="search-bar" ref={searchRef} style={{ marginBottom: '1.5rem' }}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="ابحث عن أي شخص في شجرة العائلة..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onFocus={() => searchRes.length > 0 && setShowSearch(true)}
          />
          {showSearch && (
            <div className="search-results">
              {searchRes.length > 0 ? searchRes.map((r, i) => {
                const b = typeBadge[r.type];
                return (
                  <div key={i} className="search-result-item"
                    onClick={() => { navigate(r.pageId); setShowSearch(false); setSearchQ(''); }}>
                    <span className={`search-result-badge ${b.cls}`}>{b.label}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>صفحة {r.headName}</div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem' }}>
                  لا توجد نتائج
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── المحتوى ── */}
        {current ? (
          /* صفحة شخص */
          pageLoading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : page ? (
            <PersonPageView
              page={page}
              allPages={allPages}
              currentUserId={user!.uid}
              currentUserEmail={user!.email!}
              onNavigate={navigate}
              onBack={goBack}
              onHome={goHome}
              canGoBack={canGoBack}
              onRefresh={handleRefresh}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">😕</div>
              <p>تعذّر تحميل الصفحة</p>
              <button className="btn btn-ghost" onClick={goHome} style={{ marginTop: '1rem' }}>
                الرئيسية
              </button>
            </div>
          )
        ) : (
          /* ── الصفحة الرئيسية: قائمة الأجداد ── */
          <>
            {/* رأس القسم */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <h2 style={{ fontFamily: 'Scheherazade New, serif', fontSize: '1.6rem', color: 'var(--cobalt)' }}>
                الأجداد
                {rootPages.length > 0 && (
                  <span style={{ fontSize: '0.85rem', fontFamily: 'Cairo, sans-serif',
                    marginRight: '0.5rem', background: 'var(--gold-pale)',
                    border: '1px solid var(--gold)', color: 'var(--gold)',
                    padding: '0.15rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                    {rootPages.length}
                  </span>
                )}
              </h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + إضافة جد
              </button>
            </div>

            {/* خانة فلترة الأجداد */}
            {rootPages.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <span style={{ position: 'absolute', right: '0.9rem', top: '50%',
                  transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', opacity: 0.45 }}>
                  🔎
                </span>
                <input
                  className="form-input"
                  style={{ paddingRight: '2.4rem', background: 'white' }}
                  placeholder="ابحث باسم الجد..."
                  value={filterQ}
                  onChange={e => setFilterQ(e.target.value)}
                />
              </div>
            )}

            {/* القائمة */}
            {loadingList ? (
              <div className="loading-spinner"><div className="spinner" /><span>جاري التحميل...</span></div>
            ) : rootPages.length === 0 ? (
              <div className="empty-state" style={{ marginTop: '3rem' }}>
                <div className="empty-state-icon">🌳</div>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>لا يوجد أجداد بعد</p>
                <p style={{ opacity: 0.6, marginBottom: '1.5rem' }}>ابدأ ببناء شجرة عائلتك</p>
                <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
                  + إضافة أول جد
                </button>
              </div>
            ) : filteredRoots.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>لا توجد نتائج لـ "{filterQ}"</p>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}
                  onClick={() => setFilterQ('')}>مسح البحث</button>
              </div>
            ) : (
              <div className="families-grid">
                {filteredRoots.map(r => (
                  <div key={r.id} className="family-card" onClick={() => navigate(r.id)}>
                    {/* حرف أبجدي كبير */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, marginBottom: '0.75rem',
                      background: 'linear-gradient(135deg, var(--cobalt), var(--cobalt-light))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Scheherazade New, serif', fontSize: '1.5rem',
                      color: 'white', fontWeight: 700,
                    }}>
                      {r.name.charAt(0)}
                    </div>
                    <div className="family-card-head">{r.name}</div>
                    <div className="family-card-stats">
                      <span className="family-card-stat"> {(r.wives ?? []).length}</span>
                      <span className="family-card-stat"> {(r.children ?? []).filter(c => c.gender === 'male').length}</span>
                      <span className="family-card-stat"> {(r.children ?? []).filter(c => c.gender === 'female').length}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── مودال إضافة جد ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">إضافة جد</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">اسم الجد *</label>
              <input
                className="form-input"
                value={grandName}
                onChange={e => setGrandName(e.target.value)}
                placeholder="أدخل اسم الجد"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddRoot()}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleAddRoot}
                disabled={adding || !grandName.trim()}>
                {adding ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLogout && (
        <ConfirmDialog title="تسجيل الخروج" message="هل تريد الخروج؟"
          confirmLabel="خروج" onConfirm={logout} onCancel={() => setConfirmLogout(false)} />
      )}
    </div>
  );
}

export default function HomePage() {
  return <ToastProvider><HomeInner /></ToastProvider>;
}
