'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import AuthPage from '@/components/AuthPage';

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/view');
  }, [user, loading]);

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--gold)', fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</span>
      </div>
    );
  }

  if (user) return null;

  return <AuthPage />;
}
