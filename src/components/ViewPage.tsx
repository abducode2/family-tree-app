'use client';
import { PersonPage, Person } from '@/types';
import { createChildPage } from '@/lib/familyService';
import { useToast } from './Toast';
import '@/styles/PersonPageView.css';

interface Props {
  page: PersonPage;
  currentUserId: string;
  onNavigate: (pageId: string) => void;
  onBack: () => void;
  onHome: () => void;
  canGoBack: boolean;
  onRefresh: () => Promise<void>;
}

export default function ViewPages({
  page, currentUserId, onNavigate, onBack, onHome, canGoBack, onRefresh,
}: Props) {
  const { showToast } = useToast();

  const sons      = page.children.filter(c => c.gender === 'male');
  const daughters = page.children.filter(c => c.gender === 'female');

  const handleOpenChild = async (child: Person) => {
    if (child.linkedPersonId) { onNavigate(child.linkedPersonId); return; }
    try {
      const newId = await createChildPage(child, currentUserId, page.id, page);
      await onRefresh();
      onNavigate(newId);
    } catch { showToast('حدث خطأ', 'error'); }
  };

  return (
    <div className="family-detail">
      {/* شريط التنقل */}
      <div className="breadcrumb">
        {canGoBack && (
          <button className="breadcrumb-btn" onClick={onBack}> رجوع</button>
        )}
        <button className="breadcrumb-btn home-btn" 
        onClick={onHome}>
           الرئيسية
        </button>
      </div>

      {/* رأس الصفحة */}
      <div className="family-header">
        <div className="family-card-header">
          <div className="container-title">
            <span className="family-header-name">{page.name}</span>
            {page.isRoot && <span className="btn-gander">الجد الأول</span>}
          </div>
        </div>
      </div>

      <div className="two-column">
        {/* ── الزوجات / الزوج ── */}
        <div className="section-box">
          <div className="section-title">
            <span>{page.gender === 'female' ? ' الزوج' : ' الزوجات'}</span>
            <span className="section-count">{page.wives.length}</span>
          </div>

          {page.wives.length === 0
            ? <div className="empty-state" style={{ padding: '1.2rem' }}>
                <p>{page.gender === 'female' ? 'لا يوجد زوج مسجل' : 'لا توجد زوجات مضافة'}</p>
              </div>
            : page.wives.map((w, i) => (
              <div key={w.id} className="person-card" style={w.divorced ? { opacity: 0.5 } : {}}>
                <div className="person-info">
                  <div className="person-number-name">
                    {page.gender === 'male' && <span className="wife-number">{i + 1}</span>}
                    <span className="person-name">{w.name}</span>
                    {w.divorced && (
                      <span style={{
                        fontSize: '0.7rem', background: '#dc323220', color: '#dc3232',
                        border: '1px solid #dc323240', borderRadius: '20px',
                        padding: '0.1rem 0.45rem', fontWeight: 600,
                      }}>{w.gender === 'male' ? 'مطلق' : 'مطلقة'}</span>
                    )}
                  </div>
                  {/* {w.linkedPersonId && (
                    <button className="link-badge" onClick={() => onNavigate(w.linkedPersonId!)}>
                      🔗 {page.gender === 'female' ? 'عرض صفحته' : 'عرض صفحتها'}
                    </button>
                  )} */}
                </div>
              </div>
            ))
          }
        </div>

        {/* ── الأبناء والبنات ── */}
        <div className="section-box">
          <div className="section-title">
            <span> الأبناء</span>
            <span className="section-count">{sons.length}</span>
          </div>

          {sons.length === 0
            ? <div className="empty-state" style={{ padding: '1rem' }}><p>لا يوجد أبناء</p></div>
            : sons.map(s => (
              <div key={s.id} className="person-card" style={{ cursor: 'pointer' }}
                onClick={() => handleOpenChild(s)}>
                <div className="person-avatar avatar-male"></div>
                <div className="person-info">
                  <div className="person-name">{s.name}</div>
                  {s.motherName && <div className="person-meta">الأم: {s.motherName}</div>}
                </div>
              </div>
            ))
          }

          <div className="section-title" style={{ marginTop: sons.length > 0 ? '1.25rem' : 0 }}>
            <span> البنات</span>
            <span className="section-count">{daughters.length}</span>
          </div>

          {daughters.length === 0
            ? <div className="empty-state" style={{ padding: '1rem' }}><p>لا يوجد بنات</p></div>
            : daughters.map(d => (
              <div key={d.id} className="person-card" style={{ cursor: 'pointer' }}
                onClick={() => handleOpenChild(d)}>
                <div className="person-avatar avatar-female"></div>
                <div className="person-info">
                  <div className="person-name">{d.name}</div>
                  {d.motherName && <div className="person-meta">الأم: {d.motherName}</div>}
                  {d.spouseName && (
                    <div className="person-meta">
                      الزوج: {d.spouseName}
                      {d.spousePageId && (
                        <button className="link-badge" style={{ fontSize: '0.68rem', marginRight: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); onNavigate(d.spousePageId!); }}>
                          🔗 صفحته
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
