"use client"
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { usePathname } from "next/navigation";
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from "next/link";
import "../styles/nav.css"



const Navbar = () => {
     const { user,logout } = useAuth();
       const pathname = usePathname();
       const [confirmLogout, setConfirmLogout] = useState(false);
     
  return (
<>
      <header className="navbar">
        <div className="navbar-brand">
          <span>شجرة العائلة</span>
        </div>
        <nav className="nav-desktop">
          <Link href="/add" className={pathname === "/add" ? "active" : ""}>
            اضافة العوائل
          </Link>
          <Link href="/view" className={pathname === "/view" ? "active" : ""}>
            عرض العوائل
          </Link>
        </nav>
        <div className="navbar-actions">
          <span className="navbar-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost"
            onClick={() => setConfirmLogout(true)}>
            خروج
          </button>
        </div>
      </header>

      {/* شريط التنقل السفلي - للجوال فقط */}
      <nav className="bottom-nav">
        <Link href="/add" className={`bottom-nav-item${pathname === "/add" ? " active" : ""}`}>
         
          <span className="bottom-nav-label">إضافة العوائل</span>
        </Link>
        <Link href="/view" className={`bottom-nav-item${pathname === "/view" ? " active" : ""}`}>
          
          <span className="bottom-nav-label">عرض العوائل</span>
        </Link>
        
      </nav>

     
      </>
  )
}

export default Navbar
