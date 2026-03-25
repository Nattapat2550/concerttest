// src/App.jsx
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ใช้ lazy-load แบบ projectgo เพื่อลดขนาด JS Bundle ตอนเริ่มโหลด
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  // ✅ เพิ่ม useEffect สำหรับดักจับ Token เวลา Login ผ่าน Google (เหมือนใน projectgo)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const role = params.get('role');

      if (token) {
        // เซฟ Token ลง LocalStorage เพื่อให้ Redux/Axios ดึงไปใช้ต่อได้
        localStorage.setItem('token', token);
        if (role) localStorage.setItem('role', role);

        // เคลียร์ URL เพื่อซ่อน Token ไม่ให้รกหน้าจอและป้องกันความปลอดภัย
        window.history.replaceState(null, '', window.location.pathname);

        // โหลดหน้าใหม่ 1 ครั้ง เพื่อให้ระบบ State ยืนยันการเข้าสู่ระบบ
        // ใช้ '/' เป็นหน้าเริ่มต้นสำหรับ concerttest
        window.location.href = '/'; 
      }
    }
  }, []);

  return (
    // ✅ เพิ่ม Suspense ครอบ Routes สำหรับรอโหลด Component แบบ lazy
    <Suspense fallback={<div className="p-10 text-center text-xl font-bold">กำลังโหลด...</div>}>
      <Routes>
        {/* Route ที่มี Navbar และ Footer */}
        <Route path="/" element={<Layout />}>
          {/* หน้าทั่วไปที่ใครก็เข้าได้ */}
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          
          {/* หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้ (Protected Routes) */}
          <Route element={<ProtectedRoute />}>
             <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* ถ้ามีหน้าไหนที่ไม่ต้องการ Layout (เช่นหน้า 404 Error) ให้เอาไว้นอก <Route path="/"> */}
        <Route path="*" element={<div className="p-10 text-center text-2xl font-bold">404 ไม่พบหน้านี้</div>} />
      </Routes>
    </Suspense>
  );
}

export default App;