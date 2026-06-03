"use client"
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from "next/link";
import "../styles/nav.css"

const Navbar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [confirmLogout, setConfirmLogout] = useState(false);

  // إعادة ضبط الـ dialog عند تغيّر حالة المستخدم
  useEffect(() => {
    setConfirmLogout(false);
  }, [user]);

  if (!user) return null;

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          <span>شجرة العائلة</span>
        </div>

        <nav className="nav-desktop">
          <Link href="/add" className={pathname === "/add" ? "active" : ""}>
            إضافة العوائل
          </Link>
          <Link href="/view" className={pathname === "/view" ? "active" : ""}>
            عرض العوائل
          </Link>
        </nav>

        <div className="navbar-actions">
          <span className="navbar-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmLogout(true)}>
            خروج
          </button>
        </div>
      </header>

      {/* شريط التنقل السفلي — جوال فقط */}
      <nav className="bottom-nav">
        <Link href="/add" className={`bottom-nav-item${pathname === "/add" ? " active" : ""}`}>
          <span className="bottom-nav-icon">➕</span>
          <span className="bottom-nav-label">إضافة</span>
        </Link>
        <Link href="/view" className={`bottom-nav-item${pathname === "/view" ? " active" : ""}`}>
          <span className="bottom-nav-icon">👁️</span>
          <span className="bottom-nav-label">عرض</span>
        </Link>
      </nav>

      {confirmLogout && (
        <ConfirmDialog
          title="تسجيل الخروج"
          message="هل تريد الخروج؟"
          confirmLabel="خروج"
          onConfirm={() => { setConfirmLogout(false); logout(); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </>
  );
};

export default Navbar;
