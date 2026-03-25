import React, { useEffect, useState } from 'react';
// ✅ 1. เพิ่ม Outlet เข้ามาใน import
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../slices/authSlice';
import api from '../api';

// ✅ 2. เอา { children } ออก
const Layout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, role } = useSelector((s) => s.auth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadMe = async () => {
      if (!isAuthenticated) {
        setMe(null);
        return;
      }
      try {
        // แก้ไข Path ให้ตรงกับ BaseURL (ถ้า api.js เซ็ต /api ไว้แล้ว ไม่ต้องใส่ซ้ำ)
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

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

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

  return (
    <div>
      {/* Top Nav */}
      <nav className="nav">
        <div className="brand">
          <Link to="/" className="brand-text">
            MySite
          </Link>
        </div>

        <div className="links">
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {showDownloadLink && (
            <NavLink to="/download">Download</NavLink>
          )}

          <button
            id="themeToggle"
            type="button"
            onClick={handleThemeToggle}
          >
            🌓
          </button>

          {isAuthenticated && (
            <div
              className={
                'user-menu' + (dropdownOpen ? ' open' : '')
              }
            >
              <img
                src={me?.profile_picture_url || '/images/user.png'}
                alt="avatar"
                onClick={() => setDropdownOpen((o) => !o)}
              />
              <span onClick={() => setDropdownOpen((o) => !o)} style={{ cursor: 'pointer' }}>
                {userDisplayName}
              </span>
              <div className="dropdown">
                <Link to="/settings">Settings</Link>
                {role === 'admin' && (
                  <Link to="/admin">Admin</Link>
                )}
                <button
                  type="button"
                  className="linklike"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="container">
        {/* ✅ 3. เปลี่ยนจาก {children} เป็น <Outlet /> */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;