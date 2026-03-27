// src/App.jsx
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ทำ Landing เป็น static import เพื่อตัด critical request chain
import LandingPage from './pages/LandingPage';

// ✅ lazy-load หน้าที่ไม่ใช่หน้าแรก เพื่อลด JS ตอนเริ่มโหลด
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CheckCodePage = lazy(() => import('./pages/CheckCodePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage')); // หน้า Concert หลัก
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));

const App = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const role = params.get('role');

      if (token) {
        localStorage.setItem('token', token);
        if (role) localStorage.setItem('role', role);

        window.history.replaceState(null, '', window.location.pathname);
        window.location.href = '/home';
      }
    }
  }, []);

  return (
    <Suspense fallback={<div className="page-loading" aria-busy="true">กำลังโหลด...</div>}>
      <Routes>
        {/* ✅ ใช้ Layout เป็น Route แบบ Nested เพื่อให้ <Outlet /> ทำงาน */}
        <Route element={<Layout />}>
          
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check" element={<CheckCodePage />} />
          <Route path="/form" element={<CompleteProfilePage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Protected routes – ต้องล็อกอินก่อน */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/download"
            element={
              <ProtectedRoute>
                <DownloadPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ เพิ่ม Route สำหรับ Concerts เพื่อให้ตรงกับ Navbar */}
          <Route
            path="/concerts"
            element={
              <ProtectedRoute>
                <HomePage /> {/* ใช้ HomePage เป็นหน้าแสดง Concert */}
              </ProtectedRoute>
            }
          />

          {/* เฉพาะ role admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* route ไม่เจอ → กลับหน้าแรก */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;