

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { PersonPage, Person, SearchResult } from '@/types';

const PAGES = 'pages';

// ── جلب كل الصفحات التي يملكها المستخدم أو شارك فيها ──
export async function getUserPages(uid: string): Promise<PersonPage[]> {
  const [owned, shared] = await Promise.all([
    getDocs(query(collection(db, PAGES), where('ownerId', '==', uid))),
    getDocs(query(collection(db, PAGES), where('sharedWith', 'array-contains', uid))),
  ]);
  const map = new Map<string, PersonPage>();
  [...owned.docs, ...shared.docs].forEach(d =>
    map.set(d.id, { id: d.id, ...d.data() } as PersonPage)
  );
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// ── جلب كل الأجداد الجذر مرتبين أبجدياً ──
export async function getRootPages(uid: string): Promise<PersonPage[]> {
  const snap = await getDocs(
    query(collection(db, PAGES), where('ownerId', '==', uid), where('isRoot', '==', true))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PersonPage))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

// ── جلب صفحة واحدة ──
export async function getPage(pageId: string): Promise<PersonPage | null> {
  const snap = await getDoc(doc(db, PAGES, pageId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PersonPage;
}

// ── إنشاء صفحة الجد الأول ──
export async function createRootPage(name: string, ownerId: string): Promise<string> {
  const ref = await addDoc(collection(db, PAGES), {
    name, gender: 'male',
    wives: [], children: [],
    ownerId, sharedWith: [],
    createdAt: Date.now(),
    isRoot: true,
  });
  return ref.id;
}

// ── إنشاء صفحة ابن/بنت عند النقر عليه ──
export async function createChildPage(
  person: Person,
  ownerId: string,
  parentPageId: string,
  parentPage: PersonPage
): Promise<string> {
  const ref = await addDoc(collection(db, PAGES), {
    name: person.name,
    gender: person.gender,
    wives: [], children: [],
    ownerId, sharedWith: [],
    createdAt: Date.now(),
    isRoot: false,
    parentPageId,
    parentPersonId: person.id,
  });
  // ربط الابن/البنت في صفحة الأب
  const children = parentPage.children.map(c =>
    c.id === person.id ? { ...c, linkedPersonId: ref.id } : c
  );
  await updateDoc(doc(db, PAGES, parentPageId), { children });

  // إذا كانت البنت مرتبطة بزوج مسجل، أضف الزوج في صفحتها الجديدة
  // وحدّث سجل البنت في صفحة الزوج ليشير لصفحتها الجديدة
  if (person.gender === 'female' && person.spousePageId && person.spouseName) {
    const husbandEntry: Person = clean({
      id: Math.random().toString(36).slice(2),
      name: person.spouseName,
      gender: 'male' as const,
      linkedPersonId: person.spousePageId,
    });
    await updateDoc(doc(db, PAGES, ref.id), { wives: [husbandEntry] });

    // تحديث سجل البنت في صفحة الزوج ليحمل linkedPersonId الصحيح
    const husbandPage = await getPage(person.spousePageId);
    if (husbandPage) {
      const updatedWives = (husbandPage.wives ?? []).map(w =>
        w.name === person.name && !w.linkedPersonId
          ? clean({ ...w, linkedPersonId: ref.id })
          : w
      );
      await updateDoc(doc(db, PAGES, person.spousePageId), { wives: updatedWives });
    }
  }

  return ref.id;
}

// ── تحديث اسم الصفحة في كل قواعد البيانات ──
export async function updatePageName(pageId: string, name: string): Promise<void> {
  await updateDoc(doc(db, PAGES, pageId), { name });
}

export async function updatePageNameEverywhere(
  pageId: string,
  newName: string,
  uid: string
): Promise<void> {
  // 1. تحديث اسم الصفحة نفسها
  await updateDoc(doc(db, PAGES, pageId), { name: newName });

  const allPages = await getUserPages(uid);

  for (const p of allPages) {
    if (p.id === pageId) continue;

    let childrenChanged = false;
    let wivesChanged    = false;

    // 2. تحديث الاسم في قائمة children (linkedPersonId يشير لهذه الصفحة)
    let updatedChildren = (p.children ?? []).map(c => {
      if (c.linkedPersonId === pageId) {
        childrenChanged = true;
        return clean({ ...c, name: newName });
      }
      return c;
    });

    // 3. تحديث motherName في الأبناء (عندما تكون هذه الصفحة هي الأم)
    const wifeEntry = (p.wives ?? []).find(w => w.linkedPersonId === pageId);
    if (wifeEntry) {
      updatedChildren = updatedChildren.map(c => {
        if (c.motherId === wifeEntry.id) {
          childrenChanged = true;
          return clean({ ...c, motherName: newName });
        }
        return c;
      });
    }

    // 4. تحديث الاسم في قائمة wives (linkedPersonId يشير لهذه الصفحة)
    const updatedWives = (p.wives ?? []).map(w => {
      if (w.linkedPersonId === pageId) {
        wivesChanged = true;
        return clean({ ...w, name: newName });
      }
      return w;
    });

    if (childrenChanged || wivesChanged) {
      await updateDoc(doc(db, PAGES, p.id), {
        ...(childrenChanged ? { children: updatedChildren } : {}),
        ...(wivesChanged    ? { wives: updatedWives }    : {}),
      });
    }
  }
}

// ── مساعد: تنظيف كائن من undefined قبل الإرسال لـ Firestore ──
function clean<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ── إضافة / تعديل / حذف زوجة/زوج ──
export async function addWife(pageId: string, wife: Person): Promise<void> {
  const freshPage = await getPage(pageId);
  if (!freshPage) return;
  const current = freshPage.wives ?? [];

  // موجود مسبقاً بنفس الربط — تجاهل
  if (wife.linkedPersonId && current.some(w => w.linkedPersonId === wife.linkedPersonId)) return;

  // يوجد نسخة بنفس الاسم والجنس لكن بدون ربط — حدّثها بدلاً من إضافة جديد
  if (wife.linkedPersonId) {
    const unlinked = current.find(w => !w.linkedPersonId && w.name === wife.name && w.gender === wife.gender);
    if (unlinked) {
      const wives = current.map(w => w.id === unlinked.id ? clean({ ...w, linkedPersonId: wife.linkedPersonId }) : w);
      await updateDoc(doc(db, PAGES, pageId), { wives });
      return;
    }
  }

  // إضافة يدوية بدون ربط — تجاهل التكرار بالاسم والجنس
  if (!wife.linkedPersonId && current.some(w => w.name === wife.name && w.gender === wife.gender)) return;

  // شخص جديد — أضف
  await updateDoc(doc(db, PAGES, pageId), { wives: [...current, clean(wife)] });
}
export async function updateWife(pageId: string, wife: Person, page: PersonPage): Promise<void> {
  const wives = (page.wives ?? []).map(w => w.id === wife.id ? wife : w).map(clean);
  await updateDoc(doc(db, PAGES, pageId), { wives });
}
export async function removeWife(pageId: string, wifeId: string, page: PersonPage): Promise<void> {
  const wives = (page.wives ?? []).filter(w => w.id !== wifeId).map(clean);
  await updateDoc(doc(db, PAGES, pageId), { wives });
}

// ── إضافة / تعديل / حذف ابن أو بنت ──
export async function addChild(pageId: string, child: Person, page: PersonPage): Promise<void> {
  const children = [...(page.children ?? []), child].map(clean);
  await updateDoc(doc(db, PAGES, pageId), { children });
}
export async function updateChild(pageId: string, child: Person, page: PersonPage): Promise<void> {
  const children = (page.children ?? []).map(c => c.id === child.id ? child : c).map(clean);
  await updateDoc(doc(db, PAGES, pageId), { children });
}
export async function removeChild(pageId: string, childId: string, page: PersonPage): Promise<void> {
  const children = (page.children ?? []).filter(c => c.id !== childId).map(clean);
  await updateDoc(doc(db, PAGES, pageId), { children });
}

// ── حذف جميع أبناء/بنات أم معينة دفعة واحدة ──
export async function removeChildrenByMother(
  pageId: string,
  motherId: string,
  page: PersonPage
): Promise<Person[]> {
  const removed  = (page.children ?? []).filter(c => c.motherId === motherId);
  const remaining = (page.children ?? []).filter(c => c.motherId !== motherId).map(clean);
  await updateDoc(doc(db, PAGES, pageId), { children: remaining });
  return removed;
}

// ── مشاركة ──
export async function sharePageWith(pageId: string, email: string, page: PersonPage): Promise<void> {
  if (!page.sharedWith.includes(email))
    await updateDoc(doc(db, PAGES, pageId), { sharedWith: [...page.sharedWith, email] });
}
export async function unsharePageWith(pageId: string, email: string, page: PersonPage): Promise<void> {
  await updateDoc(doc(db, PAGES, pageId), {
    sharedWith: page.sharedWith.filter(e => e !== email)
  });
}

// ── حذف صفحة ──
export async function deletePage(pageId: string): Promise<void> {
  await deleteDoc(doc(db, PAGES, pageId));
}

// ── حذف صفحة مع جميع المرتبطين بها (أبناء + زوجات + أحفاد...) ──
export async function deletePageCascade(startPageId: string, uid: string): Promise<void> {
  const allPages = await getUserPages(uid);
  const pageMap  = new Map(allPages.map(p => [p.id, p]));

  const toDelete = new Set<string>([startPageId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const p of allPages) {
      if (toDelete.has(p.id)) continue;

      // 1) صفحة ابن/بنت (parentPageId يشير لصفحة في المجموعة)
      if (p.parentPageId && toDelete.has(p.parentPageId)) {
        toDelete.add(p.id); changed = true; continue;
      }

      // 2) صفحة زوجة/زوج (linkedPersonId في wives لأي صفحة في المجموعة)
      for (const pid of toDelete) {
        const pg = pageMap.get(pid);
        if (pg?.wives.some(w => w.linkedPersonId === p.id)) {
          toDelete.add(p.id); changed = true; break;
        }
      }
    }
  }

  // حذف دفعي — Firestore يقبل 500 عملية كحد أقصى لكل batch
  const ids = [...toDelete];
  for (let i = 0; i < ids.length; i += 500) {
    const batch = writeBatch(db);
    ids.slice(i, i + 500).forEach(id => batch.delete(doc(db, PAGES, id)));
    await batch.commit();
  }
}

// ── البحث ──
export async function searchPeople(uid: string, q: string): Promise<SearchResult[]> {
  const pages = await getUserPages(uid);
  const lq = q.trim().toLowerCase();
  if (!lq) return [];
  const results: SearchResult[] = [];
  for (const p of pages) {
    if (p.name.toLowerCase().includes(lq))
      results.push({ type: p.isRoot ? 'grandfather' : p.gender === 'male' ? 'son' : 'daughter',
        name: p.name, pageId: p.id, headName: p.name });
    for (const w of p.wives)
      if (w.gender !== 'male' && w.name.toLowerCase().includes(lq))
        results.push({ type: 'wife', name: w.name, pageId: p.id, headName: p.name, personId: w.id });
    for (const c of p.children)
      if (c.name.toLowerCase().includes(lq))
        results.push({ type: c.gender === 'male' ? 'son' : 'daughter',
          name: c.name, pageId: p.id, headName: p.name, personId: c.id });
  }
  return results;
}

// ── جلب كل الأبناء الذكور من كل الصفحات (للبحث عن زوج) ──
export interface SonSearchResult {
  personId: string;   // معرّف الابن في صفحة أبيه
  pageId: string;     // معرّف صفحة الابن الخاصة (إن وُجدت)
  parentPageId: string;
  name: string;
  parentName: string;
}

export async function searchSons(uid: string, q: string): Promise<SonSearchResult[]> {
  const pages = await getUserPages(uid);
  const lq = q.trim();
  if (!lq) return [];
  const rootPageIds = new Set(pages.filter(p => p.isRoot).map(p => p.id));
  const results: SonSearchResult[] = [];
  for (const p of pages) {
    for (const c of (p.children ?? [])) {
      if (c.gender === 'male' && c.name.includes(lq) && !rootPageIds.has(c.linkedPersonId ?? '')) {
        results.push({
          personId: c.id,
          pageId: c.linkedPersonId ?? '',
          parentPageId: p.id,
          name: c.name,
          parentName: p.name,
        });
      }
    }
  }
  return results;
}

// ── ربط بنت بزوجها (في الاتجاهين) ──
// daughterPageId  : صفحة أب البنت
// daughterId      : معرّف البنت في قائمة children
// husbandPageId   : صفحة الزوج الخاصة (linkedPersonId)
// husbandPersonId : معرّف الزوج في قائمة children أبيه
// husbandName     : اسم الزوج
export async function linkSpouses(
  daughterParentPageId: string,
  daughterId: string,
  husbandPageId: string,
  husbandPersonId: string,
  husbandName: string,
  daughterName: string,
  daughterOwnPageId?: string
): Promise<void> {
  // 1) نجلب الصفحة الطازجة من Firestore (بعد حفظ البنت فيها)
  const freshPage = await getPage(daughterParentPageId);
  if (!freshPage) return;

  const children = (freshPage.children ?? []).map(c =>
    c.id === daughterId
      ? clean({ ...c, spouseName: husbandName, spousePageId: husbandPageId, spousePersonId: husbandPersonId })
      : c
  );
  await updateDoc(doc(db, PAGES, daughterParentPageId), { children });

  // 2) إضافة البنت كزوجة في صفحة الزوج
  const husbandPage = await getPage(husbandPageId);
  if (!husbandPage) return;

  // تجنب التكرار (نتحقق من كلا الشكلين لدعم البيانات القديمة)
  const alreadyLinked = (husbandPage.wives ?? []).some(
    w => w.linkedPersonId === daughterId ||
    (daughterOwnPageId && w.linkedPersonId === daughterOwnPageId)
  );
  if (alreadyLinked) return;

  const newWife: Person = clean({
    id: Math.random().toString(36).slice(2),
    name: daughterName,
    gender: 'female' as const,
    linkedPersonId: daughterOwnPageId || undefined,
  });
  const wives = [...(husbandPage.wives ?? []), newWife];
  await updateDoc(doc(db, PAGES, husbandPageId), { wives });

  // 3) إذا كان للبنت صفحة خاصة، أضف الزوج في صفحتها أيضاً
  if (daughterOwnPageId) {
    await syncHusbandOnWifePage(husbandPageId, husbandName, daughterOwnPageId, 'add');
  }
}

// ── مزامنة الأبناء في صفحة الأم ──
export async function syncChildOnMotherPage(
  motherPageId: string,
  child: Person,
  action: 'add' | 'update' | 'remove'
): Promise<void> {
  const motherPage = await getPage(motherPageId);
  if (!motherPage) return;

  let children: Person[];
  if (action === 'add') {
    if ((motherPage.children ?? []).some(c => c.id === child.id)) return;
    children = [...(motherPage.children ?? []), child].map(clean);
  } else if (action === 'update') {
    children = (motherPage.children ?? []).map(c => c.id === child.id ? child : c).map(clean);
  } else {
    children = (motherPage.children ?? []).filter(c => c.id !== child.id).map(clean);
  }
  await updateDoc(doc(db, PAGES, motherPageId), { children });
}

// ── مزامنة الزوج في صفحة الزوجة (إضافة / حذف) ──
export async function syncHusbandOnWifePage(
  husbandPageId: string,
  husbandName: string,
  wifeOwnPageId: string,
  action: 'add' | 'remove'
): Promise<void> {
  if (action === 'add') {
    // addWife تقرأ أحدث نسخة وتتحقق من التكرار تلقائياً
    await addWife(wifeOwnPageId, clean({
      id: Math.random().toString(36).slice(2),
      name: husbandName,
      gender: 'male' as const,
      linkedPersonId: husbandPageId,
    }));
  } else {
    const page = await getPage(wifeOwnPageId);
    if (!page) return;
    await updateDoc(doc(db, PAGES, wifeOwnPageId), {
      wives: (page.wives ?? []).filter(w => w.linkedPersonId !== husbandPageId).map(clean),
    });
  }
}

// ── مزامنة الزوجة في صفحة الزوج (إضافة / حذف) ──
export async function syncWifeOnHusbandPage(
  wifePageId: string,
  wifeName: string,
  husbandOwnPageId: string,
  action: 'add' | 'remove'
): Promise<void> {
  if (action === 'add') {
    // addWife تقرأ أحدث نسخة وتتحقق من التكرار تلقائياً
    await addWife(husbandOwnPageId, clean({
      id: Math.random().toString(36).slice(2),
      name: wifeName,
      gender: 'female' as const,
      linkedPersonId: wifePageId,
    }));
  } else {
    const page = await getPage(husbandOwnPageId);
    if (!page) return;
    await updateDoc(doc(db, PAGES, husbandOwnPageId), {
      wives: (page.wives ?? []).filter(w => w.linkedPersonId !== wifePageId).map(clean),
    });
  }
}

// ── فك ربط الزوجين ──
export async function unlinkSpouses(
  daughterParentPageId: string,
  daughterId: string,
  husbandPageId: string,
  daughterParentPage: PersonPage
): Promise<void> {
  // 1) إزالة معلومات الزوج من البنت
  const children = (daughterParentPage.children ?? []).map(c =>
    c.id === daughterId
      ? clean({ ...c, spouseName: undefined, spousePageId: undefined, spousePersonId: undefined })
      : c
  );
  await updateDoc(doc(db, PAGES, daughterParentPageId), { children });

  // 2) إزالة البنت من قائمة زوجات الزوج
  const husbandPage = await getPage(husbandPageId);
  if (!husbandPage) return;
  const wives = (husbandPage.wives ?? []).filter(w => w.linkedPersonId !== daughterId);
  await updateDoc(doc(db, PAGES, husbandPageId), { wives });
}

 