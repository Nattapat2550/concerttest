// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
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
        <Route path="admin" element={<AdminPage />} />
        {/* <Route path="register" element={<RegisterPage />} /> */}
        
        {/* หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้ (Protected Routes) */}
        <Route element={<ProtectedRoute />}>
          {/* <Route path="admin" element={<AdminPage />} /> */}
          {/* <Route path="profile" element={<ProfilePage />} /> */}
        </Route>
      </Route>

      {/* ถ้ามีหน้าไหนที่ไม่ต้องการ Layout (เช่นหน้า 404 Error) ให้เอาไว้นอก <Route path="/"> */}
      <Route path="*" element={<div className="p-10 text-center text-2xl font-bold">404 ไม่พบหน้านี้</div>} />
    </Routes>
  );
}

export default App;