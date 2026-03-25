import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// การ Import หน้าต่างๆ (เหมือนเดิม)
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  // 📌 1. useEffect เดิมสำหรับดักจับ Token Google OAuth
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
        window.location.href = '/'; 
      }
    }
  }, []);

  // 📌 2. [เพิ่มใหม่] useEffect สำหรับ "ปลุก Backend" ไม่ให้หลับ
  useEffect(() => {
    const wakeUpBackends = () => {
      // 1. ปลุก Go Backend (เปลี่ยน URL ให้ตรงกับของจริงถ้ามีการเปลี่ยนแปลง)
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

    // ตั้งเวลาให้ยิงไปปลุกซ้ำทุกๆ 14 นาที (14 นาที * 60 วินาที * 1000 มิลลิวินาที = 840,000 ms)
    const intervalId = setInterval(wakeUpBackends, 840000);

    // ทำความสะอาดเมื่อปิดหน้าเว็บ
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Suspense fallback={<div className="p-10 text-center text-xl font-bold">กำลังโหลด...</div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          
          <Route element={<ProtectedRoute />}>
             <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<div className="p-10 text-center text-2xl font-bold">404 ไม่พบหน้านี้</div>} />
      </Routes>
    </Suspense>
  );
}

export default App;