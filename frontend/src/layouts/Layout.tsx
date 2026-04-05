import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import NewsPopup from '../components/NewsPopup';

export default function Layout() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = token ? (user?.role || 'user') : 'guest';

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // ✅ เพิ่ม State สำหรับเมนูมือถือ
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

  const isActive = (path: string) => location.pathname.includes(path) ? "text-blue-400 font-bold" : "text-gray-300 hover:text-white transition";
  
  // สไตล์สำหรับปุ่มเมนูในมือถือ
  const isMobileActive = (path: string) => location.pathname.includes(path) ? "text-blue-400 font-bold block px-3 py-2 rounded-md bg-gray-800" : "text-gray-300 hover:text-white transition block px-3 py-2 rounded-md hover:bg-gray-700";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <NewsPopup />
      
      <nav className="bg-gray-900 text-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* ซ้าย: โลโก้ และ เมนูสำหรับจอคอม (md:flex) */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold tracking-wider mr-6 shrink-0">ConcertTick</Link>
              
              {/* เมนูจอคอม (จะถูกซ่อนไว้ถ้าเป็นจอมือถือ) */}
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
                  <Link to="/admin" className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 font-bold text-white ml-2 transition">Admin Panel</Link>
                )}
              </div>
            </div>

            {/* ขวา: โหมดกลางคืน + Profile/Login + ปุ่ม Hamburger */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-gray-800 transition">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              
              <div className="hidden md:block border-l border-gray-700 h-6 mx-2"></div>

              {role === 'guest' ? (
                <div className="hidden md:flex items-center space-x-4 text-sm lg:text-base">
                  <Link to="/login" className="text-gray-300 hover:text-white transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition">สมัครสมาชิก</Link>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white transition focus:outline-none">
                    {/* ย่อชื่อให้สั้นลงในจอมือถือ */}
                    <span className="hidden sm:block max-w-30 truncate text-sm">{user?.first_name || user?.username || 'User'}</span>
                    <span className="sm:hidden block max-w-15 truncate text-sm">{user?.first_name || 'User'}</span>
                    <svg className={`w-4 h-4 transform transition ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border dark:border-gray-700 transition-all z-50">
                      <Link to="/settings" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">⚙️ ตั้งค่าโปรไฟล์</Link>
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">🚪 ออกจากระบบ</button>
                    </div>
                  )}
                </div>
              )}

              {/* ปุ่ม Hamburger Menu (โผล่มาเฉพาะจอมือถือ) */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="md:hidden ml-2 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
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

        {/* ✅ เมนูแบบ Dropdown สำหรับหน้าจอมือถือ */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 shadow-xl absolute w-full left-0 z-40">
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
                <Link to="/admin" className="block px-3 py-2 mt-2 bg-blue-600 rounded font-bold text-white hover:bg-blue-700 transition">Admin Panel</Link>
              )}

              {/* ปุ่ม Login/Register ในมือถือ */}
              {role === 'guest' && (
                <div className="pt-4 mt-2 border-t border-gray-700 space-y-2">
                  <Link to="/login" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="block px-3 py-2 text-base font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center">สมัครสมาชิก</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="grow w-full"><Outlet /></main>
      
      <footer className="bg-gray-800 dark:bg-gray-950 text-gray-400 text-center py-4 mt-auto">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}