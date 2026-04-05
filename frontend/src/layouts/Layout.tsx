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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname.includes(path) ? "text-blue-400 font-bold" : "text-gray-300 hover:text-white transition";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <NewsPopup />
      <nav className="bg-gray-900 text-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-xl font-bold tracking-wider mr-4">ConcertTick</Link>
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

            <div className="flex items-center space-x-4">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-gray-800 transition">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <div className="border-l border-gray-700 h-6 mx-2"></div>

              {role === 'guest' ? (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition">สมัครสมาชิก</Link>
                </>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 text-gray-300 hover:text-white transition focus:outline-none">
                    <span>{user?.first_name || user?.username || 'User'}</span>
                    <svg className={`w-4 h-4 transform transition ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border dark:border-gray-700 transition-all">
                      <Link to="/settings" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">⚙️ ตั้งค่าโปรไฟล์</Link>
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">🚪 ออกจากระบบ</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="grow w-full"><Outlet /></main>
      <footer className="bg-gray-800 dark:bg-gray-950 text-gray-400 text-center py-4 mt-auto">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}