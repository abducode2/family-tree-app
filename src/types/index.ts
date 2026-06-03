
// شخص مسجل (زوجة أو ابن أو بنت) قد يكون له صفحته الخاصة
export interface Person {
  id: string;
  name: string;
  gender: 'male' | 'female';
  // إذا كانت الزوجة/الزوج مرتبطاً بصفحة شخص آخر
  linkedPersonId?: string;
  divorced?: boolean;
  // للأبناء والبنات
  motherId?: string;
  motherName?: string;
  // للبنات: معلومات الزوج
  spouseName?: string;
  spousePageId?: string;   // معرّف صفحة الزوج إن كان مسجلاً
  spousePersonId?: string; // معرّف الابن في صفحة أبيه (لربط الاتجاه العكسي)
}

// صفحة شخص (جد، ابن أصبح أباً، أو بنت تزوجت)
export interface PersonPage {
  id: string;
  name: string;
  gender: 'male' | 'female';
  wives: Person[];
  children: Person[];
  ownerId: string;
  sharedWith: string[];
  createdAt: number;
  parentPageId?: string;
  parentPersonId?: string;
  isRoot?: boolean;
}

export interface SearchResult {
  type: 'grandfather' | 'wife' | 'son' | 'daughter';
  name: string;
  pageId: string;
  headName: string;
  personId?: string;
}
