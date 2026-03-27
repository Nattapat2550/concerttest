// src/layouts/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import NewsPopup from '../components/NewsPopup';

export default function Layout() {
  const location = useLocation();
  
  // ✅ เช็คจาก Token เป็นหลัก ป้องกันบัคหน้า Navbar
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = token ? (user?.role || 'user') : 'guest';

  // ระบบ Theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname.includes(path) ? "text-blue-400 font-bold" : "text-gray-300 hover:text-white transition";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <NewsPopup />
      <nav className="bg-gray-900 text-white shadow-md">
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
                <Link to="/admin" className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition font-bold text-white ml-2">
                  Admin Panel
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-800 transition">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <div className="border-l border-gray-700 h-6 mx-2"></div>

              {role === 'guest' ? (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition">สมัครสมาชิก</Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm hidden sm:block">สวัสดี, {user?.first_name || user?.username || 'User'}</span>
                  <Link to="/settings" className="text-sm text-blue-400 hover:underline">ตั้งค่า</Link>
                  <button onClick={handleLogout} className="text-sm bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition">ออกจากระบบ</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="grow w-full">
        <Outlet />
      </main>

      <footer className="bg-gray-800 dark:bg-gray-950 text-gray-400 text-center py-4 mt-auto">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}