
'use client';
import { useState } from 'react';
import { PersonPage, Person } from '@/types';
import {
  addWife, updateWife, removeWife,
  addChild, updateChild, removeChild,
  createChildPage, updatePageName, deletePage,
  sharePageWith, unsharePageWith,
  linkSpouses, 
  syncHusbandOnWifePage,
  syncChildOnMotherPage,
  removeChildrenByMother,
} from '@/lib/familyService';
import WifeModal from './WifeModal';
import ChildModal from './ChildModal';
import ShareModal from './ShareModal';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';

interface Props {
  page: PersonPage;
  allPages: PersonPage[];
  currentUserId: string;
  currentUserEmail: string;
  onNavigate: (pageId: string) => void;
  onBack: () => void;
  onHome: () => void;
  canGoBack: boolean;
  onRefresh: () => void;
  onDeleted: () => void;
}

export default function PersonPageView({
  page, allPages, currentUserId, currentUserEmail,
  onNavigate, onBack, onHome, canGoBack, onRefresh, onDeleted,
}: Props) {
  const { showToast } = useToast();
  const isOwner = page.ownerId === currentUserId;

  const [wifeModal,    setWifeModal]    = useState<{ open: boolean; wife?: Person }>({ open: false });
  const [childModal,   setChildModal]   = useState<{ open: boolean; child?: Person }>({ open: false });
  const [shareModal,   setShareModal]   = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [newName,      setNewName]      = useState(page.name);
  const [confirmWife,  setConfirmWife]  = useState<Person | null>(null);
  const [confirmChild, setConfirmChild] = useState<Person | null>(null);
  const [confirmDel,   setConfirmDel]   = useState(false);

  const sons      = page.children.filter(c => c.gender === 'male');
  const daughters = page.children.filter(c => c.gender === 'female');

  // ── زوجات ──
  const handleSaveWife = async (wife: Person) => {
    try {
      if (wifeModal.wife) await updateWife(page.id, wife, page);
      else                await addWife(page.id, wife, page);

      // ربط عكسي: إضافة الزوج في صفحة الزوجة إن كان لها صفحة
      if (!wifeModal.wife && wife.linkedPersonId) {
        await syncHusbandOnWifePage(page.id, page.name, wife.linkedPersonId, 'add');
      }

      showToast(wifeModal.wife ? 'تم تعديل الزوجة' : 'تمت إضافة الزوجة', 'success');
      setWifeModal({ open: false });
      onRefresh();
    } catch (e) { console.error('addWife error:', e); showToast('حدث خطأ أثناء حفظ الزوجة', 'error'); }
  };

  const handleDeleteWife = async (w: Person) => {
    try {
      await removeWife(page.id, w.id, page);

      // حذف الزوج من صفحتها الخاصة
      if (w.linkedPersonId) {
        await syncHusbandOnWifePage(page.id, page.name, w.linkedPersonId, 'remove');
      }

      // حذف أبناء وبنات هذه الأم
      const removed = await removeChildrenByMother(page.id, w.id, page);

      // مزامنة الحذف في صفحة الأم (إن كان لها صفحة)
      if (w.linkedPersonId) {
        for (const child of removed) {
          await syncChildOnMotherPage(w.linkedPersonId, child, 'remove');
        }
      }

      showToast('تم الحذف', 'success');
      setConfirmWife(null); onRefresh();
    } catch (e) { console.error('removeWife error:', e); showToast('حدث خطأ', 'error'); }
  };

  // ── أبناء ──
  const handleSaveChild = async (
    child: Person,
    spouseInfo?: { husbandPageId: string; husbandPersonId: string; husbandName: string }
  ) => {
    try {
      if (childModal.child) await updateChild(page.id, child, page);
      else                  await addChild(page.id, child, page);

      // ربط الزوجين في الاتجاهين إذا تم اختيار زوج مسجل
      if (spouseInfo?.husbandPageId && child.gender === 'female') {
        // نجلب الصفحة المحدّثة بعد الحفظ لضمان الحصول على id الابنة الصحيح
        await linkSpouses(
          page.id,
          child.id,
          spouseInfo.husbandPageId,
          spouseInfo.husbandPersonId,
          spouseInfo.husbandName,
          child.name,
          child.linkedPersonId
        );
      }

      // مزامنة الطفل في صفحة الأم إن كان لها صفحة خاصة
      const motherWife = page.wives.find(w => w.id === child.motherId);
      if (motherWife?.linkedPersonId) {
        await syncChildOnMotherPage(
          motherWife.linkedPersonId,
          child,
          childModal.child ? 'update' : 'add'
        );
      }

      showToast(childModal.child ? 'تم التعديل' : 'تمت الإضافة', 'success');
      setChildModal({ open: false }); onRefresh();
    } catch (e) { console.error('addChild error:', e); showToast('حدث خطأ', 'error'); }
  };

  const handleDeleteChild = async (c: Person) => {
    try {
      await removeChild(page.id, c.id, page);

      // مزامنة الحذف في صفحة الأم
      const motherWife = page.wives.find(w => w.id === c.motherId);
      if (motherWife?.linkedPersonId) {
        await syncChildOnMotherPage(motherWife.linkedPersonId, c, 'remove');
      }

      showToast('تم الحذف', 'success');
      setConfirmChild(null); onRefresh();
    } catch (e) { console.error('removeChild error:', e); showToast('حدث خطأ', 'error'); }
  };

  // ── فتح صفحة الابن (إنشاء إذا لم تكن موجودة) ──
  const handleOpenChild = async (child: Person) => {
    if (child.linkedPersonId) {
      onNavigate(child.linkedPersonId);
      return;
    }
    try {
      const newId = await createChildPage(child, currentUserId, page.id, page);
      showToast(`تم إنشاء صفحة ${child.name}`, 'success');
      onRefresh();
      onNavigate(newId);
    } catch { showToast('حدث خطأ', 'error'); }
  };

  // ── تعديل الاسم ──
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updatePageName(page.id, newName.trim());
      showToast('تم التعديل', 'success');
      setEditingName(false); onRefresh();
    } catch { showToast('حدث خطأ', 'error'); }
  };

  // ── مشاركة ──
  const handleShare   = async (email: string) => { try { await sharePageWith(page.id, email, page);   showToast('تمت المشاركة', 'success'); onRefresh(); } catch { showToast('خطأ', 'error'); } };
  const handleUnshare = async (email: string) => { try { await unsharePageWith(page.id, email, page); showToast('تم الإلغاء', 'success');   onRefresh(); } catch { showToast('خطأ', 'error'); } };

  // ── حذف ──
  const handleDelete = async () => {
    try {
      await deletePage(page.id);
      showToast('تم الحذف', 'success');
      setConfirmDel(false); onDeleted();
    } catch { showToast('حدث خطأ', 'error'); }
  };

  return (
    <div className="family-detail">
      {/* شريط التنقل */}
      <div className="breadcrumb">
        {canGoBack && (
          <button className="breadcrumb-btn" onClick={onBack}> رجوع</button>
        )}
        <button className="breadcrumb-btn" style={{ background: 'var(--gold)' }} onClick={onHome}>
           الرئيسية
        </button>
      </div>

      {/* رأس الصفحة */}
      <div className="family-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', minWidth: 180 }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button className="btn btn-sm" style={{ background: 'var(--gold)', color: 'white' }} onClick={handleSaveName}>حفظ</button>
              <button className="btn btn-sm btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => setEditingName(false)}>إلغاء</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{page.gender === 'male' ? '' : ''}</span>
                <span className="family-header-name">{page.name}</span>
                {page.isRoot && (
                  <span style={{ fontSize: '0.7rem', background: 'var(--gold)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                    الجد الأول
                  </span>
                )}
              </div>
              <div className="family-header-sub">
                {page.wives.length > 0 && `${page.wives.length} زوجة · `}
                {sons.length > 0 && `${sons.length}  · `}
                {daughters.length > 0 && `${daughters.length} `}
              </div>
            </>
          )}
        </div>

        {isOwner && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}
              onClick={() => { setNewName(page.name); setEditingName(true); }}>✏️ تعديل</button>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}
              onClick={() => setShareModal(true)}>🔗 مشاركة</button>
            <button className="btn btn-sm" style={{ background: 'rgba(220,50,50,0.25)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => setConfirmDel(true)}>🗑</button>
          </div>
        )}
      </div>

      <div className="two-column">
        {/* ── الزوجات / الزوج ── */}
        <div className="section-box">
          <div className="section-title">
            <span>{page.gender === 'female' ? '💍 الزوج' : ' الزوجات'}</span>
            <span className="section-count">{page.wives.length}</span>
          </div>

          {page.wives.length === 0
            ? <div className="empty-state" style={{ padding: '1.2rem' }}>
                <p>{page.gender === 'female' ? 'لا يوجد زوج مسجل' : 'لا توجد زوجات مضافة'}</p>
              </div>
            : page.wives.map((w, i) => (
              <div key={w.id} className="person-card">
                <div className="person-avatar avatar-wife">{page.gender === 'female' ? '' : ''}</div>
                <div className="person-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {page.gender === 'male' && <span className="wife-number">{i + 1}</span>}
                    <span className="person-name">{w.name}</span>
                  </div>
                  {w.linkedPersonId && (
                    <button className="link-badge" onClick={() => onNavigate(w.linkedPersonId!)}>
                      🔗 {page.gender === 'female' ? 'عرض صفحته' : 'عرض صفحتها'}
                    </button>
                  )}
                </div>
                {isOwner && (
                  <div className="person-actions">
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setWifeModal({ open: true, wife: w })}>✏️</button>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setConfirmWife(w)}>🗑</button>
                  </div>
                )}
              </div>
            ))
          }

          {isOwner && page.gender === 'male' && (
            <button className="btn btn-ghost section-add-btn" onClick={() => setWifeModal({ open: true })}>
              + إضافة زوجة
            </button>
          )}
        </div>

        {/* ── الأبناء والبنات ── */}
        <div className="section-box">
          {/* أبناء */}
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--cobalt)', marginTop: '0.15rem' }}>
                    {s.linkedPersonId ? '📂 له صفحة — اضغط للفتح' : '➕ اضغط لإنشاء صفحته'}
                  </div>
                </div>
                {isOwner && (
                  <div className="person-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setChildModal({ open: true, child: s })}>✏️</button>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setConfirmChild(s)}>🗑</button>
                  </div>
                )}
              </div>
            ))
          }

          {/* بنات */}
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
                  {d.motherName  && <div className="person-meta">الأم: {d.motherName}</div>}
                  {d.spouseName && (
                    <div className="person-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>الزوج: {d.spouseName}</span>
                      {d.spousePageId && (
                        <button className="link-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}
                          onClick={e => { e.stopPropagation(); onNavigate(d.spousePageId!); }}>
                          🔗 صفحته
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: 'var(--cobalt)', marginTop: '0.15rem' }}>
                    {d.linkedPersonId ? '📂 لها صفحة — اضغط للفتح' : '➕ اضغط لإنشاء صفحتها'}
                  </div>
                </div>
                {isOwner && (
                  <div className="person-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setChildModal({ open: true, child: d })}>✏️</button>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setConfirmChild(d)}>🗑</button>
                  </div>
                )}
              </div>
            ))
          }

          {isOwner && (
            <button className="btn btn-ghost section-add-btn" onClick={() => setChildModal({ open: true })}>
              + إضافة ابن / بنت
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {wifeModal.open && (
        <WifeModal
          initial={wifeModal.wife}
          allPages={allPages.filter(p => p.id !== page.id)}
          onSave={handleSaveWife}
          onClose={() => setWifeModal({ open: false })}
        />
      )}
      {childModal.open && (
        <ChildModal
          initial={childModal.child}
          wives={page.wives}
          allPages={allPages}
          currentUserId={currentUserId}
          pageGender={page.gender}
          fatherName={
            page.gender === 'female'
              ? (page.wives.find(w => w.gender === 'male')?.name ?? page.name)
              : page.name
          }
          onSave={handleSaveChild}
          onClose={() => setChildModal({ open: false })}
        />
      )}
      {shareModal && (
        <ShareModal
          family={{ id: page.id, headName: page.name, sharedWith: page.sharedWith } as any}
          currentUserEmail={currentUserEmail}
          onShare={handleShare}
          onUnshare={handleUnshare}
          onClose={() => setShareModal(false)}
        />
      )}

      {/* ── Confirms ── */}
      {confirmWife && (
        <ConfirmDialog title="حذف الزوجة"
          message={`هل تريد حذف <span class="confirm-name">${confirmWife.name}</span>؟`}
          confirmLabel="حذف" danger
          onConfirm={() => handleDeleteWife(confirmWife)}
          onCancel={() => setConfirmWife(null)} />
      )}
      {confirmChild && (
        <ConfirmDialog title="حذف الشخص"
          message={`هل تريد حذف <span class="confirm-name">${confirmChild.name}</span>؟`}
          confirmLabel="حذف" danger
          onConfirm={() => handleDeleteChild(confirmChild)}
          onCancel={() => setConfirmChild(null)} />
      )}
      {confirmDel && (
        <ConfirmDialog title="حذف الصفحة"
          message={`سيتم حذف صفحة <span class="confirm-name">${page.name}</span> بشكل نهائي. هل أنت متأكد؟`}
          confirmLabel="حذف نهائي" danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)} />
      )}
    </div>
  );
}