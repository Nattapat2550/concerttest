import React, { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import api from '../services/api';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const location = useLocation(); // นำออกหากไม่ได้ใช้งาน เพื่อป้องกัน ESLint Warning

  const { isAuthenticated, role } = useSelector((s) => s.auth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [me, setMe] = useState(null);
  
  const dropdownRef = useRef(null);

  // โหลดข้อมูล user สำหรับแสดงชื่อ + avatar (เฉพาะตอน login)
  useEffect(() => {
    let cancelled = false;
    const loadMe = async () => {
      if (!isAuthenticated) {
        setMe(null);
        return;
      }
      try {
        const res = await api.get('/api/users/me');
        if (!cancelled) setMe(res.data);
      } catch {
        if (!cancelled) setMe(null);
      }
    };
    loadMe();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // theme toggle
  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('bg-gray-900', dark); // ปรับพื้นหลัง body หลัก
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeToggle = () => {
    setDark((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } finally {
      setDropdownOpen(false);
      navigate('/');
    }
  };

  const showDownloadLink = true;

  const userDisplayName = me?.username || me?.email || 'User';

  // สไตล์สำหรับ NavLink เพื่อแสดงสถานะ Active
  const navLinkClass = ({ isActive }) =>
    `transition-colors duration-200 ${
      isActive
        ? 'text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Top Nav */}
      <nav className="bg-white dark:bg-gray-800 shadow sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand */}
            <div className="shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold tracking-wide text-blue-600 dark:text-blue-400">
                MySite
              </Link>
            </div>

            {/* Links & Actions */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <NavLink to="/about" className={navLinkClass}>About</NavLink>
              <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
              {showDownloadLink && (
                <NavLink to="/download" className={navLinkClass}>Download</NavLink>
              )}

              {/* ปุ่มสลับธีม */}
              <button
                type="button"
                onClick={handleThemeToggle}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                aria-label="Toggle Theme"
              >
                {dark ? '🌞' : '🌓'}
              </button>

              {/* User Menu */}
              {isAuthenticated && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <img
                      src={me?.profile_picture_url || '/images/user.png'}
                      alt="avatar"
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 object-cover"
                    />
                    <span className="hidden sm:block font-medium text-sm">
                      {userDisplayName}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Settings
                      </Link>
                      {role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Admin
                        </Link>
                      )}
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;