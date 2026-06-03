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

  const exportToPDF = () => {
    const date = new Date().toLocaleDateString('ar-SA');
    const wivesRows = page.wives.length === 0
      ? '<p style="opacity:0.5;font-size:0.9rem">لا يوجد</p>'
      : page.wives.map((w, i) => `
          <div class="row">
            ${page.gender === 'male' ? `<span class="num">${i + 1}</span>` : ''}
            <span class="name">${w.name}</span>
            ${w.divorced ? '<span class="tag">مطلق/ة</span>' : ''}
          </div>`).join('');
    const sonsRows = sons.length === 0
      ? '<p style="opacity:0.5;font-size:0.9rem">لا يوجد</p>'
      : sons.map((s, i) => `
          <div class="row">
            <span class="num">${i + 1}</span>
            <span class="name">${s.name}</span>
            ${s.motherName ? `<span class="tag">الأم: ${s.motherName}</span>` : ''}
          </div>`).join('');
    const daughtersRows = daughters.length === 0
      ? '<p style="opacity:0.5;font-size:0.9rem">لا يوجد</p>'
      : daughters.map((d, i) => `
          <div class="row">
            <span class="num">${i + 1}</span>
            <span class="name">${d.name}</span>
            ${d.motherName ? `<span class="tag">الأم: ${d.motherName}</span>` : ''}
          </div>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${page.name} - شجرة العائلة</title>
  <link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',sans-serif;direction:rtl;color:#1a1208;padding:2rem;background:#fff;font-size:14px}
    .header{background:#1e3a5f;color:#fff;padding:1.25rem 1.5rem;border-radius:8px;margin-bottom:1.75rem}
    .header h1{font-family:'Scheherazade New',serif;font-size:1.8rem;margin-bottom:0.2rem}
    .header p{font-size:0.82rem;opacity:0.7}
    .section{margin-bottom:1.5rem;page-break-inside:avoid}
    .section-title{font-family:'Scheherazade New',serif;font-size:1.15rem;color:#1e3a5f;border-bottom:2px solid #c9b882;padding-bottom:0.35rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem}
    .badge{background:#b8860b;color:#fff;font-size:0.7rem;padding:0.1rem 0.45rem;border-radius:12px;font-family:'Cairo',sans-serif}
    .row{padding:0.45rem 0;border-bottom:1px solid #e2d5a8;display:flex;align-items:center;gap:0.6rem}
    .row:last-child{border-bottom:none}
    .num{background:#1e3a5f;color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0}
    .name{flex:1;font-weight:600}
    .tag{font-size:0.68rem;background:#f5e6b8;border:1px solid #b8860b;color:#7a5a00;padding:0.1rem 0.4rem;border-radius:10px;white-space:nowrap}
    @media print{@page{margin:1.5cm;size:A4}body{padding:0}}
  </style>
</head>
<body>
  <div class="header">
    <h1>${page.name}</h1>
    <p>شجرة العائلة · ${date}</p>
  </div>
  <div class="section">
    <div class="section-title">
      ${page.gender === 'female' ? 'الزوج' : 'الزوجات'}
      <span class="badge">${page.wives.length}</span>
    </div>
    ${wivesRows}
  </div>
  <div class="section">
    <div class="section-title">الأبناء <span class="badge">${sons.length}</span></div>
    ${sonsRows}
  </div>
  <div class="section">
    <div class="section-title">البنات <span class="badge">${daughters.length}</span></div>
    ${daughtersRows}
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { showToast('يرجى السماح بالنوافذ المنبثقة', 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

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
        <div className="containers-btn">
          <button className="btn btn-sm btn-edit-share" onClick={exportToPDF}>📄 PDF</button>
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
                  {/* {d.spouseName && (
                    <div className="person-meta">
                      الزوج: {d.spouseName}
                      {d.spousePageId && (
                        <button className="link-badge" style={{ fontSize: '0.68rem', marginRight: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); onNavigate(d.spousePageId!); }}>
                          🔗 صفحته
                        </button>
                      )} 
                    </div>
                  )}*/}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
