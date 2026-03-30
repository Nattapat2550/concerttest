// src/App.jsx
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CheckCodePage = lazy(() => import('./pages/CheckCodePage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ConcertBookPage = lazy(() => import('./pages/ConcertBookPage')); 
const MyBookingPage = lazy(() => import('./pages/MyBookingPage')); 
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
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-xl dark:text-white">กำลังโหลด...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check" element={<CheckCodePage />} />
          
          {/* ✅ แก้ไขตรงนี้ให้ตรงกับที่ Backend ส่งมา */}
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Protected Routes */}
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/concerts" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/concerts/:id/book" element={<ProtectedRoute><ConcertBookPage /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookingPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/download" element={<ProtectedRoute><DownloadPage /></ProtectedRoute>} />

          {/* Admin Route */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;