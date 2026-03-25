import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ใช้ Path ให้ตรงกับที่มีอยู่ใน concerttest (layouts)
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ทำ Landing เป็น lazy-load (หรือจะตั้งแบบปกติก็ได้หากตั้งใจลด load)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CheckCodePage = lazy(() => import('./pages/CheckCodePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));

function App() {
  // 📌 1. useEffect สำหรับดักจับ Token เวลา Login ผ่าน Google
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const role = params.get('role');

      if (token) {
        // เซฟ Token ลง LocalStorage
        localStorage.setItem('token', token);
        if (role) localStorage.setItem('role', role);

        // เคลียร์ URL เพื่อซ่อน Token ไม่ให้รกหน้าจอ
        window.history.replaceState(null, '', window.location.pathname);

        // ✅ โหลดหน้าใหม่ไปที่ /home เหมือน projectgo
        window.location.href = '/home'; 
      }
    }
  }, []);

  // 📌 2. useEffect สำหรับ "ปลุก Backend" ไม่ให้หลับ (คงไว้ตามเดิมของ concerttest)
  useEffect(() => {
    const wakeUpBackends = () => {
      // 1. ปลุก Go Backend
      fetch('https://gtyconcerttestbe.onrender.com/')
        .then(() => console.log('🟢 Go Backend is awake!'))
        .catch(() => console.log('🔴 Go Backend is sleeping/error'));

      // 2. ปลุก Rust Backend (Pure API)
      fetch('https://pure-api-pry6.onrender.com/')
        .then(() => console.log('🟢 Rust Backend is awake!'))
        .catch(() => console.log('🔴 Rust Backend is sleeping/error'));
    };

    // สั่งปลุกทันที 1 ครั้งเมื่อมีคนเปิดหน้าเว็บ
    wakeUpBackends();

    // ตั้งเวลาให้ยิงไปปลุกซ้ำทุกๆ 14 นาที
    const intervalId = setInterval(wakeUpBackends, 840000);

    // ทำความสะอาดเมื่อปิดหน้าเว็บ
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Layout>
      <Suspense fallback={<div className="p-10 text-center text-xl font-bold" aria-busy="true">กำลังโหลด...</div>}>
        <Routes>
          {/* ✅ Public routes (อัปเดตและเพิ่มหน้าที่ขาดให้ตรงตาม projectgo) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check" element={<CheckCodePage />} />
          <Route path="/form" element={<CompleteProfilePage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* ✅ Protected routes – ต้องล็อกอินก่อน */}
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

          {/* ✅ เฉพาะ role admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ route ไม่เจอ → กลับหน้าแรกอัตโนมัติ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;