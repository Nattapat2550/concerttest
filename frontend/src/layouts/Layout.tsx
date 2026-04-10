import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import NewsPopup from '../components/NewsPopup';

// นำเข้ารูปภาพจาก assets
import logoImg from '../assets/logo.png';
import settingImg from '../assets/setting.png';
import logoutImg from '../assets/logout.png';
import userImg from '../assets/user.png';

export default function Layout() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = token ? (user?.role || 'user') : 'guest';

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // สลับธีม
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ปิด Dropdown Profile เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ปิดเมนูมือถืออัตโนมัติเมื่อเปลี่ยนหน้าเว็บ
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname.includes(path) ? "text-brand font-bold" : "text-text-sub hover:text-brand transition";
  
  // สไตล์สำหรับปุ่มเมนูในมือถือ
  const isMobileActive = (path: string) => location.pathname.includes(path) ? "text-brand font-bold block px-3 py-2 rounded-md bg-brand/10" : "text-text-sub hover:text-brand transition block px-3 py-2 rounded-md hover:bg-bg-main";

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-300">
      <NewsPopup />
      
      <nav className="bg-bg-card border-b border-outline shadow-sm relative z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* ซ้าย: โลโก้ และ เมนูสำหรับจอคอม (md:flex) */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center mr-6 shrink-0">
                <img src={logoImg} alt="ConcertTick Logo" className="w-8 h-8 mr-2 object-contain" />
                <span className="text-xl font-bold tracking-wider text-brand">ConcertTick</span>
              </Link>
              
              {/* เมนูจอคอม */}
              <div className="hidden md:flex items-center space-x-5 lg:space-x-6 text-sm lg:text-base">
                <Link to="/about" className={isActive('/about')}>About</Link>
                <Link to="/contact" className={isActive('/contact')}>Contact</Link>
                <Link to="/download" className={isActive('/download')}>Download</Link>
                {role !== 'guest' && (
                  <>
                    <Link to="/concerts" className={isActive('/concerts')}>Concerts</Link>
                    <Link to="/my-bookings" className={isActive('/my-bookings')}>My Bookings</Link>
                  </>
                )}
                {role === 'admin' && (
                  <Link to="/admin" className="bg-brand px-3 py-1 rounded hover:bg-brand-hover font-bold text-white ml-2 transition">Admin Panel</Link>
                )}
              </div>
            </div>

            {/* ขวา: โหมดกลางคืน + Profile/Login + ปุ่ม Hamburger */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* หมายเหตุ: ปุ่มธีมยังใช้ Emoji เพราะไม่มีรูป Sun/Moon ใน assets */}
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-bg-main text-text-main transition">
                {theme === 'dark' ? '../assets/light.png' : '../assets/dark.png'}
              </button>
              
              <div className="hidden md:block border-l border-outline h-6 mx-2"></div>

              {role === 'guest' ? (
                <div className="hidden md:flex items-center space-x-4 text-sm lg:text-base">
                  <Link to="/login" className="text-text-sub hover:text-brand transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-brand px-4 py-2 rounded text-white hover:bg-brand-hover transition">สมัครสมาชิก</Link>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 text-text-sub hover:text-brand transition focus:outline-none">
                    <img src={userImg} alt="User" className="w-7 h-7 rounded-full bg-bg-main object-cover" />
                    <span className="hidden sm:block max-w-30 truncate text-sm">{user?.first_name || user?.username || 'User'}</span>
                    <svg className={`w-4 h-4 transform transition ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-bg-card rounded-md shadow-lg py-1 border border-outline transition-all z-50">
                      <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-text-main hover:bg-bg-main transition">
                        <img src={settingImg} alt="Settings" className="w-4 h-4 mr-2" />
                        ตั้งค่าโปรไฟล์
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-hot-fuchsia hover:bg-bg-main transition">
                        <img src={logoutImg} alt="Logout" className="w-4 h-4 mr-2" />
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ปุ่ม Hamburger Menu (โผล่มาเฉพาะจอมือถือ) */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="md:hidden ml-2 p-2 rounded-md text-text-sub hover:text-brand hover:bg-bg-main focus:outline-none transition"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

            </div>
          </div>
        </div>

        {/* เมนูแบบ Dropdown สำหรับหน้าจอมือถือ */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-bg-card border-t border-outline shadow-xl absolute w-full left-0 z-40 transition-colors">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <Link to="/about" className={isMobileActive('/about')}>About</Link>
              <Link to="/contact" className={isMobileActive('/contact')}>Contact</Link>
              <Link to="/download" className={isMobileActive('/download')}>Download</Link>
              
              {role !== 'guest' && (
                <>
                  <Link to="/concerts" className={isMobileActive('/concerts')}>Concerts</Link>
                  <Link to="/my-bookings" className={isMobileActive('/my-bookings')}>My Bookings</Link>
                </>
              )}
              
              {role === 'admin' && (
                <Link to="/admin" className="block px-3 py-2 mt-2 bg-brand rounded font-bold text-white hover:bg-brand-hover transition">Admin Panel</Link>
              )}

              {/* ปุ่ม Login/Register ในมือถือ */}
              {role === 'guest' && (
                <div className="pt-4 mt-2 border-t border-outline space-y-2">
                  <Link to="/login" className="block px-3 py-2 text-base font-medium text-text-sub hover:text-brand hover:bg-bg-main rounded-md">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="block px-3 py-2 text-base font-medium bg-brand text-white rounded-md hover:bg-brand-hover text-center transition">สมัครสมาชิก</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="grow w-full"><Outlet /></main>
      
      <footer className="bg-bg-card border-t border-outline text-text-sub text-center py-4 mt-auto transition-colors">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}