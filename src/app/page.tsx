'use client';
import { useAuth } from '@/lib/AuthContext';
import AuthPage from '@/components/AuthPage';
import HomePage from '@/components/HomePage';
import { ToastProvider } from '@/components/Toast';

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--gold)', fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</span>
      </div>
    );
  }

  return user ? 
  <ToastProvider>
  <HomePage /> 
  </ToastProvider>
  : <AuthPage />;
}
