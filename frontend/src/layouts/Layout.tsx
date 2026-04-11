// frontend/src/layouts/Layout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import api from '../services/api'; // เพิ่ม import api
import NewsPopup from '../components/NewsPopup';

import logoImg from '../assets/logo.png';
import settingImg from '../assets/settings.png'; 
import logoutImg from '../assets/logout.png';
import userImg from '../assets/user.png';
import lightImg from '../assets/light.png';
import darkImg from '../assets/dark.png';

export default function Layout() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  
  const [user, setUser] = useState<any>(null);

  // โหลด User ครั้งแรก และซิงค์ข้อมูลใหม่จาก Server
  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try { setUser(JSON.parse(userStr)); } catch(e) {}
      }
    };
    loadUser();

    // หากมี Token ให้ดึงข้อมูลล่าสุดจาก Server เพื่อป้องกันปัญหาข้อมูลค้างจากหน้า Login/Google
    if (token) {
      api.get('/api/auth/status')
        .then(res => {
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        })
        .catch(err => console.error("Failed to load user status", err));
    }

    // ดักฟัง Event กรณีข้อมูลเปลี่ยนในแท็บอื่น หรือแท็บเดียวกัน
    window.addEventListener('storage', loadUser);
    window.addEventListener('user-updated', loadUser);
    return () => {
      window.removeEventListener('storage', loadUser);
      window.removeEventListener('user-updated', loadUser);
    };
  }, [token]);

  // ซิงค์จาก LocalStorage ใหม่เสมอเมื่อเปลี่ยนหน้า (เช่น ทำให้อัปเดตทันทีที่กลับมาจากหน้า Settings)
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setUser(JSON.parse(userStr)); } catch(e) {}
    }
  }, [location.pathname]);

  const role = token ? (user?.role || 'user') : 'guest';

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname.includes(path) ? "text-brand font-black" : "text-text-sub hover:text-brand font-medium transition-colors";
  const isMobileActive = (path: string) => location.pathname.includes(path) ? "text-brand font-black block px-4 py-3 rounded-xl bg-brand/10" : "text-text-sub hover:text-brand font-medium transition block px-4 py-3 rounded-xl hover:bg-bg-main";

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-300 font-sans">
      <NewsPopup />
      
      <nav className="sticky top-0 bg-bg-card/80 backdrop-blur-lg border-b border-outline shadow-[0_4px_30px_rgba(0,0,0,0.03)] z-50 transition-colors duration-300">
        <div className="w-full px-6 lg:px-12 2xl:px-20">
          <div className="flex justify-between h-20 items-center">
            
            <div className="flex items-center">
              <Link to="/" className="flex items-center mr-10 shrink-0 group">
                <div className="p-2 bg-brand/10 rounded-xl mr-3 group-hover:scale-105 transition-transform">
                  <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-brand to-purple-600">ConcertTick</span>
              </Link>
              
              <div className="hidden lg:flex items-center space-x-8 text-base">
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
                  <Link to="/admin" className="bg-linear-to-r from-brand to-purple-600 px-5 py-2 rounded-xl text-white font-bold shadow-lg shadow-brand/30 hover:shadow-brand/50 transform hover:-translate-y-0.5 transition-all">
                    Admin Workspace
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 md:space-x-5">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-full hover:bg-bg-main text-text-main transition-all flex items-center justify-center border border-transparent hover:border-outline">
                <img src={theme === 'dark' ? lightImg : darkImg} alt="Theme" className="w-5 h-5 object-contain opacity-80" />
              </button>
              
              <div className="hidden md:block w-px h-8 bg-outline mx-2"></div>

              {role === 'guest' ? (
                <div className="hidden md:flex items-center space-x-4 text-base font-bold">
                  <Link to="/login" className="text-text-sub hover:text-brand transition-colors px-4 py-2">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-text-main text-bg-main px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md">สมัครสมาชิก</Link>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 p-1.5 pr-4 rounded-full border border-outline hover:border-brand/50 hover:bg-bg-main transition-all focus:outline-none">
                    <img src={user?.profile_picture_url || userImg} alt="User" className="w-9 h-9 rounded-full bg-brand/10 p-1 object-cover" />
                    <span className="hidden sm:block max-w-32 truncate text-sm font-bold">{user?.username || user?.first_name || 'User'}</span>
                    <svg className={`w-4 h-4 text-text-sub transform transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-4 w-56 bg-bg-card rounded-2xl shadow-2xl py-2 border border-outline transition-all z-50 animate-fade-in-up">
                      <div className="px-5 py-3 border-b border-outline mb-1">
                        <p className="text-sm font-bold truncate">{user?.email}</p>
                        <p className="text-xs text-text-sub uppercase tracking-wider mt-1">{role}</p>
                      </div>
                      <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center px-5 py-3 text-sm font-bold text-text-main hover:bg-bg-main transition-colors">
                        <img src={settingImg} alt="Settings" className="w-5 h-5 mr-3 opacity-70 dark:invert" />
                        ตั้งค่าโปรไฟล์
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left flex items-center px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <img src={logoutImg} alt="Logout" className="w-5 h-5 mr-3 opacity-80" />
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="lg:hidden p-2 rounded-xl text-text-sub hover:text-brand bg-bg-main focus:outline-none transition-colors"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>

            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-bg-card border-t border-outline shadow-2xl absolute w-full left-0 z-40 transition-colors">
            <div className="px-6 py-6 space-y-2">
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
                <Link to="/admin" className="block px-4 py-3 mt-4 bg-linear-to-r from-brand to-purple-600 rounded-xl font-bold text-white shadow-md text-center">Admin Workspace</Link>
              )}
              {role === 'guest' && (
                <div className="pt-6 mt-4 border-t border-outline grid grid-cols-2 gap-4">
                  <Link to="/login" className="flex items-center justify-center px-4 py-3 text-sm font-bold bg-bg-main text-text-main rounded-xl">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="flex items-center justify-center px-4 py-3 text-sm font-bold bg-text-main text-bg-main rounded-xl">สมัครสมาชิก</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="grow w-full flex flex-col"><Outlet /></main>
      
      <footer className="bg-bg-card border-t border-outline text-text-sub text-center py-8 mt-auto transition-colors">
        <div className="flex justify-center items-center gap-2 mb-2">
          <img src={logoImg} alt="Logo" className="w-5 h-5 opacity-50 grayscale" />
          <span className="font-bold tracking-wider">ConcertTick</span>
        </div>
        <p className="text-sm font-medium">&copy; 2026 ConcertTick Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}