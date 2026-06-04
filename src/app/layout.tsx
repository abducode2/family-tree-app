import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'شجرة عوائل سلنارتي',
  description: 'تطبيق إدارة شجرة عوائل سلنارتي',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
          <Navbar/>
          {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
