import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'شجرة العائلة',
  description: 'تطبيق إدارة شجرة العائلة',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
