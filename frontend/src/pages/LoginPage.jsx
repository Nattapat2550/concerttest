import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearAuthError, checkAuthStatus } from '../store/slices/authSlice';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, status, error } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [localError, setLocalError] = useState(null);

  // 1. ตรวจสอบ Error หรือ Token จาก Google OAuth URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'oauth_failed') {
      setLocalError('การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
    
    // ตรวจสอบ Token ที่ Backend Redirect กลับมาในรูป Hash
    if (window.location.hash.includes('token=')) {
      dispatch(checkAuthStatus());
    }
  }, [location, dispatch]);

  // 2. ถ้าล็อกอินสำเร็จให้เปลี่ยนหน้า
  useEffect(() => {
    if (isAuthenticated) {
      const dest = role === 'admin' ? '/admin' : '/home';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // 3. ระบบล็อกอินด้วยรหัสผ่าน
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(clearAuthError());
    
    try {
      const response = await dispatch(login({ email, password, remember })).unwrap();
      const token = response?.data?.token || response?.token;
      if (token) {
        localStorage.setItem('token', token);
      }
    } catch (errMsg) {
      // Redux เก็บ Error ไว้ใน state.error แล้ว
    }
  };

  // 4. ระบบล็อกอินด้วย Google (วิธียิงตรงไป Backend แบบ ProjectGo)
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">เข้าสู่ระบบ</h2>
        
        {(localError || error) && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded">
            <p className="text-sm">{localError || error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="remember"
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)}
              className="mr-2 cursor-pointer" 
            />
            <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">จำฉันไว้ในระบบ</label>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className={`w-full py-3 rounded-lg text-white font-semibold transition ${
              status === 'loading' ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {status === 'loading' ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <span className="absolute bg-white px-2 text-sm text-gray-500">หรือ</span>
            <div className="w-full h-px bg-gray-300"></div>
          </div>
          
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition text-gray-700 font-medium"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          ยังไม่มีบัญชีใช่หรือไม่? <Link to="/register" className="text-blue-600 hover:underline font-medium">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;