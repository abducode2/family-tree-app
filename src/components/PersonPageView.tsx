
'use client';
import { useState } from 'react';
import { PersonPage, Person } from '@/types';
import {
  addWife, updateWife, removeWife,
  addChild, updateChild, removeChild,
  createChildPage, updatePageName, deletePageCascade,
  sharePageWith, unsharePageWith,
  syncHusbandOnWifePage,
  syncWifeOnHusbandPage,
  syncChildOnMotherPage,
  removeChildrenByMother,
} from '@/lib/familyService';
import WifeModal from './WifeModal';
import ChildModal from './ChildModal';
import ShareModal from './ShareModal';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import '@/styles/PersonPageView.css';


interface Props {
  page: PersonPage;
  allPages: PersonPage[];
  currentUserId: string;
  currentUserEmail: string;
  onNavigate: (pageId: string) => void;
  onBack: () => void;
  onHome: () => void;
  canGoBack: boolean;
  onRefresh: () => Promise<void>;
  onDeleted: () => Promise<void>;
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

      if (!wifeModal.wife && wife.linkedPersonId) {
        if (page.gender === 'female') {
          // صفحة الزوجة: أضف الزوجة (الصفحة الحالية) في صفحة الزوج
          await syncWifeOnHusbandPage(page.id, page.name, wife.linkedPersonId, 'add');
        } else {
          // صفحة الزوج: أضف الزوج في صفحة الزوجة
          await syncHusbandOnWifePage(page.id, page.name, wife.linkedPersonId, 'add');
        }
      }

      showToast(wifeModal.wife ? 'تم التعديل' : 'تمت الإضافة', 'success');
      setWifeModal({ open: false });
      onRefresh();
    } catch (e) { console.error('addWife error:', e); showToast('حدث خطأ أثناء الحفظ', 'error'); }
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
  const handleSaveChild = async (child: Person) => {
    try {
      // على صفحة الأنثى: نحفظ مرجع الزوج قبل مسح motherId
      let fatherEntry: Person | undefined;
      if (page.gender === 'female') {
        fatherEntry = page.wives.find(w => w.id === child.motherId);
        child = { ...child, motherId: undefined, motherName: page.name };
      }

      if (childModal.child) await updateChild(page.id, child, page);
      else                  await addChild(page.id, child, page);

      // مزامنة الطفل في صفحة الأب (صفحة الأنثى)
      if (page.gender === 'female' && fatherEntry?.linkedPersonId) {
        await syncChildOnMotherPage(
          fatherEntry.linkedPersonId,
          child,
          childModal.child ? 'update' : 'add'
        );
      }

      // مزامنة الطفل في صفحة الأم (صفحة الذكر)
      if (page.gender === 'male') {
        const motherWife = page.wives.find(w => w.id === child.motherId);
        if (motherWife?.linkedPersonId) {
          await syncChildOnMotherPage(
            motherWife.linkedPersonId,
            child,
            childModal.child ? 'update' : 'add'
          );
        }
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
      // showToast(`تم إنشاء صفحة ${child.name}`, 'success');
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
      await deletePageCascade(page.id, currentUserId);
      setConfirmDel(false);
      showToast('تم الحذف', 'success');
      await onDeleted();
    } catch (e) { console.error('deletePage error:', e); showToast('حدث خطأ أثناء الحذف', 'error'); }
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
      <div className="family-header" >
        <div className="family-card-header">
          {editingName ? (
            <div className='form-header'>
              <input
                className="form-input btn-style"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button className="btn btn-sm btn-save"  onClick={handleSaveName}>حفظ</button>
              <button className="btn btn-sm btn-ghost btn-close"  onClick={() => setEditingName(false)}>إلغاء</button>
            </div>
          ) : (
            <>
              <div className='container-title'>
                
                <span className="family-header-name">{page.name}</span>
                {page.isRoot && (
                  <span className='btn-gander'>
                    الجد الأول
                  </span>
                )}
              </div>
             
            </>
          )}
        </div>

        {isOwner && (
          <div className='containers-btn'>
            <button className="btn btn-sm btn-edit-share" 
              onClick={() => { setNewName(page.name); setEditingName(true); }}>✏️ تعديل</button>
            <button className="btn btn-sm btn-edit-share" 
              onClick={() => setShareModal(true)}>🔗 مشاركة</button>
            <button className="btn btn-sm btn-delet" 
              onClick={() => setConfirmDel(true)}>🗑</button>
          </div>
        )}
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
                    {page.gender === 'male' &&
                    <span className="wife-number">{i + 1}</span>}
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
                {isOwner && (
                  <div className="person-actions">
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setWifeModal({ open: true, wife: w })}>✏️</button>
                    <button className="btn btn-sm btn-delet" onClick={() => setConfirmWife(w)}>🗑</button>
                  </div>
                )}
              </div>
            ))
          }

          {isOwner && (
            <button className="btn btn-ghost section-add-btn" onClick={() => setWifeModal({ open: true })}>
              {page.gender === 'female' ? '+ إضافة الزوج' : '+ إضافة زوجة'}
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
                  
                </div>
                {isOwner && (
                  <div className="person-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setChildModal({ open: true, child: s })}>✏️</button>
                    <button className="btn btn-sm btn-delet" onClick={() => setConfirmChild(s)}>🗑</button>
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
                  {/* {d.spouseName && (
                    <div className="person-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>الزوج: {d.spouseName}</span>
                      {d.spousePageId && (
                        <button className="link-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}
                          onClick={e => { e.stopPropagation(); onNavigate(d.spousePageId!); }}>
                          🔗 صفحته
                        </button>
                      )}
                    </div>
                  )} */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--cobalt)', marginTop: '0.15rem' }}>
                    {d.linkedPersonId ? '' : ''}
                  </div>
                </div>
                {isOwner && (
                  <div className="person-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setChildModal({ open: true, child: d })}>✏️</button>
                    <button className="btn btn-sm btn-delet" onClick={() => setConfirmChild(d)}>🗑</button>
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
          pageGender={page.gender}
          onSave={handleSaveWife}
          onClose={() => setWifeModal({ open: false })}
        />
      )}
      {childModal.open && (
        <ChildModal
          initial={childModal.child}
          wives={page.wives.filter(w =>
            page.gender === 'female' ? w.gender === 'male' : w.gender === 'female'
          )}
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