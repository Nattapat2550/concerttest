import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import NewsPopup from '../components/NewsPopup';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // เช็คข้อมูล User และ Role จาก LocalStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user ? user.role : 'guest';

  // ✅ ระบบจัดการ Theme (Dark / Light)
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

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path ? "text-blue-400 font-bold" : "text-gray-300 hover:text-white transition";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      
      <NewsPopup />

      {/* Navbar */}
      <nav className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* ฝั่งซ้าย: Logo และ เมนูหลัก */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-xl font-bold text-white tracking-wider mr-4">ConcertTick</Link>
              
              <Link to="/about" className={isActive('/about')}>About</Link>
              <Link to="/contact" className={isActive('/contact')}>Contact</Link>
              <Link to="/download" className={isActive('/download')}>Download</Link>

              {(role === 'user' || role === 'admin') && (
                <>
                  <Link to="/concerts" className={isActive('/concerts')}>Concert</Link>
                  <Link to="/my-bookings" className={isActive('/my-bookings')}>My Booking</Link>
                </>
              )}

              {role === 'admin' && (
                <Link to="/admin" className="bg-blue-600 px-3 py-1 rounded text-white font-bold hover:bg-blue-700 transition">
                  Admin Panel
                </Link>
              )}
            </div>

            {/* ฝั่งขวา: Theme Toggle + โปรไฟล์ / Login */}
            <div className="flex items-center space-x-4">
              
              {/* ✅ ปุ่ม Toggle Theme */}
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-gray-800 transition focus:outline-none"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> // ไอคอนพระอาทิตย์ (Light Mode)
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> // ไอคอนพระจันทร์ (Dark Mode)
                )}
              </button>

              <div className="border-l border-gray-700 h-6 mx-2"></div> {/* เส้นคั่นบางๆ */}

              {role === 'guest' ? (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition">สมัครสมาชิก</Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm hidden sm:inline-block">
                    สวัสดี, {user?.first_name || user?.username || user?.email}
                  </span>
                  <Link to="/settings" className="text-sm text-blue-400 hover:underline">ตั้งค่า</Link>
                  <button onClick={handleLogout} className="text-sm bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition">
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </nav>

      {/* เนื้อหาหลัก */}
      <main className="grow w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 dark:bg-gray-950 dark:text-gray-500 text-center py-4 mt-auto transition-colors duration-200">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}