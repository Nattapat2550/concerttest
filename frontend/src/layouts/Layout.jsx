import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import NewsPopup from '../components/NewsPopup'; // นำเข้า Popup ข่าว

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // เช็คข้อมูล User และ Role จาก LocalStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user ? user.role : 'guest'; // guest, user, admin

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login'; // บังคับรีเฟรชกลับไปหน้า Login
  };

  // เช็คว่าลิงก์ไหนกำลัง Active อยู่
  const isActive = (path) => location.pathname === path ? "text-blue-400 font-bold" : "text-gray-300 hover:text-white transition";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ฝัง NewsPopup ไว้ที่ Layout จะทำให้มันทำงานเช็คตัวเองทันทีที่เว็บโหลด */}
      <NewsPopup />

      {/* Navbar แบบแยก Role */}
      <nav className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* ฝั่งซ้าย: Logo และ เมนูหลัก */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-xl font-bold text-white tracking-wider mr-4">ConcertTick</Link>
              
              {/* เมนูที่ทุกคนเห็น (Guest, User, Admin) */}
              <Link to="/about" className={isActive('/about')}>About</Link>
              <Link to="/contact" className={isActive('/contact')}>Contact</Link>
              <Link to="/download" className={isActive('/download')}>Download</Link>

              {/* เมนูที่เห็นเฉพาะ User และ Admin */}
              {(role === 'user' || role === 'admin') && (
                <>
                  <Link to="/concerts" className={isActive('/concerts')}>Concert</Link>
                  <Link to="/my-bookings" className={isActive('/my-bookings')}>My Booking</Link>
                </>
              )}

              {/* เมนูที่เห็นเฉพาะ Admin เท่านั้น */}
              {role === 'admin' && (
                <Link to="/admin" className="bg-blue-600 px-3 py-1 rounded text-white font-bold hover:bg-blue-700 transition">
                  Admin Panel
                </Link>
              )}
            </div>

            {/* ฝั่งขวา: โปรไฟล์ หรือ ปุ่ม Login */}
            <div className="flex items-center space-x-4">
              {role === 'guest' ? (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white transition">เข้าสู่ระบบ</Link>
                  <Link to="/register" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition">สมัครสมาชิก</Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm">
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

      {/* เนื้อหาหลักของหน้าต่างๆ จะถูก Render ตรงนี้ */}
      <main className="grow">
        <Outlet />
      </main>

      {/* Footer (ถ้ามี) */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-auto">
        <p className="text-sm">&copy; 2026 ConcertTick. All rights reserved.</p>
      </footer>
    </div>
  );
}