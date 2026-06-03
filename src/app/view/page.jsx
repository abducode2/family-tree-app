'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';
import { ToastProvider } from '@/components/Toast';
import ViewPages from '@/components/ViewPage';
import { usePage } from '@/hooks/useFamily';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useAuth } from '@/lib/AuthContext';
import { getRootPages, searchPeople } from '@/lib/familyService';
import '../../styles/HomePage.Model.css';

function ViewContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const urlId         = searchParams.get('id') ?? '';
  const { user } = useAuth();
  const { current, navigate, goBack, goHome, canGoBack } = useNavigationHistory(urlId || null);

  useEffect(() => {
    if (!user) router.push('/');
  }, [user]);
  const { page, loading, refresh } = usePage(current);

  // قائمة الأجداد عند عدم وجود id
  const [roots,       setRoots]       = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // بحث عام
  const [searchQ,    setSearchQ]    = useState('');
  const [searchRes,  setSearchRes]  = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (current || !user) return;
    setLoadingList(true);
    getRootPages(user.uid)
      .then(setRoots)
      .finally(() => setLoadingList(false));
  }, [current, user]);

  useEffect(() => {
    if (!user || !searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      const r = await searchPeople(user.uid, searchQ);
      setSearchRes(r); setShowSearch(true);
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ, user]);

  useEffect(() => {
    const h = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowSearch(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── عرض قائمة الأجداد ── */
  if (!current) {
    return (
      <div className="app-container">
        <div className="main-layout">
          <div className="search-bar" ref={searchRef}>
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
                {searchRes.length > 0 ? (() => {
                  const seen = new Set();
                  return searchRes.filter(r => {
                    if (seen.has(r.name)) return false;
                    seen.add(r.name);
                    return true;
                  }).map((r, i) => (
                    <div key={i} className="search-result-item"
                      onClick={() => { navigate(r.pageId); setShowSearch(false); setSearchQ(''); }}>
                      <div className="search-result-title">{r.name}</div>
                    </div>
                  ));
                })() : (
                  <div className="search-no-result">لا توجد نتائج</div>
                )}
              </div>
            )}
          </div>
          <div className="header-container" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'Scheherazade New, serif', fontSize: '1.6rem', color: 'var(--cobalt)' }}>
              الأجداد
            {roots.length > 0 && (
                  <span >
                    {roots.length}
                  </span>
                )}
            </h2>
          </div>



          {loadingList ? (
            <div className="loading-spinner">
              <div className="spinner" />
              </div>
          ) : roots.length === 0 ? (
            <div className="empty-state">
              <p>لا يوجد أجداد</p>
              </div>
          ) : (
            <div className="families-grid">
              {roots.map(r => (
                <div key={r.id} className="family-card"
                  onClick={() => navigate(r.id)}>
                  <div className='family-charat' >
                    {r.name.charAt(0)}
                  </div>
                  <div className="family-card-head">{r.name}
                    
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── عرض الصفحة ── */
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <p>الصفحة غير موجودة</p>
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }}
          onClick={() => router.push('/view')}>
          العودة
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="main-layout">
        <ViewPages
          page={page}
          currentUserId={user?.uid ?? ''}
          onNavigate={navigate}
          onBack={goBack}
          onHome={goHome}
          canGoBack={canGoBack && current !== urlId}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="loading-spinner" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
        </div>
      }>
        <ViewContent />
      </Suspense>
    </ToastProvider>
  );
}
