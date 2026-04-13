import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';

import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import 'react-quill-new/dist/quill.snow.css';
import ConcertDetailsPage from './pages/ConcertDetailsPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CheckCodePage = lazy(() => import('./pages/CheckCodePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ConcertBookPage = lazy(() => import('./pages/ConcertBookPage')); 
const MyBookingPage = lazy(() => import('./pages/MyBookingPage')); 
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));
const AppealsPage = lazy(() => import('./pages/AppealPage'));

// เพิ่มบรรทัดนี้สำหรับโหลดหน้า DocumentDetailsPage
const DocumentDetailsPage = lazy(() => import('./pages/DocumentDetailsPage'));

const App = () => {
  const [serverReady, setServerReady] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const wakeUpServers = async () => {
      try {
        await api.get('/api/homepage');
        if (isMounted) setServerReady(true);
      } catch (err: any) { 
        if (isMounted) {
          setWakingUp(true);
          setTimeout(wakeUpServers, 3000);
        }
      }
    };
    
    wakeUpServers();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const role = params.get('role');

      if (token) {
        localStorage.setItem('token', token);
        if (role) localStorage.setItem('role', role);
        
        // ดึงข้อมูล User จาก backend ทันที
        api.get('/api/auth/status')
          .then((res) => {
            if (res.data && res.data.user) {
              localStorage.setItem('user', JSON.stringify(res.data.user));
              window.dispatchEvent(new Event('user-updated')); // ส่งสัญญาณบอกระบบให้ขยับ Layout ทันที
            }
            const targetUrl = role === 'admin' ? '/admin' : '/home';
            window.history.replaceState(null, '', targetUrl); // ลบ Hash ทิ้ง
            window.location.reload(); // บังคับ Reload หน้าเว็บแบบสมบูรณ์ เพื่อป้องกัน State ค้าง
          })
          .catch(() => {
            window.history.replaceState(null, '', '/home');
            window.location.reload();
          });
      }
    }
  }, []);

  if (!serverReady) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-6 text-center transition-colors duration-300">
        <div className="relative flex justify-center items-center mb-8">
          <div className="absolute animate-ping inline-flex h-20 w-20 rounded-full bg-blue-400 opacity-20"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        </div>
        <h1 className="text-2xl md:text-3xl font-black mb-3">กำลังเชื่อมต่อกับเซิร์ฟเวอร์...</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm md:text-base font-medium">
          {wakingUp 
            ? "กำลังปลุกระบบฐานข้อมูลและเซิร์ฟเวอร์ (อาจใช้เวลา 30-50 วินาทีในครั้งแรกเนื่องจากระบบประหยัดพลังงาน) กรุณารอสักครู่ ⏳" 
            : "ระบบกำลังเตรียมความพร้อม..."}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-xl dark:text-white bg-gray-50 dark:bg-gray-900">กำลังโหลดข้อมูล...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check" element={<CheckCodePage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          <Route path="/concerts/:accessCode" element={<ConcertDetailsPage />} />
          
          {/* เพิ่ม Route สำหรับดูหน้ารายละเอียดข้อมูลและแกลเลอรีแบบ Public */}
          <Route path="/documents/:id" element={<DocumentDetailsPage />} />
          
          {/* เอา ProtectedRoute ออกเพื่อให้คนที่โดนแบนเข้าได้ */}
          <Route path="/appeals" element={<AppealsPage />} />

          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/concerts" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/concerts/:id/book" element={<ProtectedRoute><ConcertBookPage /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookingPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/download" element={<ProtectedRoute><DownloadPage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;