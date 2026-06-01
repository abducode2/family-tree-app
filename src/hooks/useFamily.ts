'use client';
import { useState, useEffect, useCallback } from 'react';
import { PersonPage } from '@/types';
import { getPage } from '@/lib/familyService';

export function usePage(pageId: string | null) {
  const [page, setPage]       = useState<PersonPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pageId) { setPage(null); return; }
    setLoading(true); setError(null);
    try   { setPage(await getPage(pageId)); }
    catch { setError('تعذّر تحميل البيانات'); }
    finally { setLoading(false); }
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  return { page, loading, error, refresh: load };
}
