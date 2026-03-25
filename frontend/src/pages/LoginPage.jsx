import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { loginStart, loginSuccess, loginFailure, checkAuthStatus } from '../store/slices/authSlice';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const loading = useSelector((state) => state.auth.status === 'loading');

  // 📌 1. ดักจับ Error หรือ Token จาก URL (กรณี Backend Redirect กลับมา)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const errorParam = params.get('error');

    if (errorParam === 'oauth_failed') {
      setErrorMsg('การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } else if (token) {
      // ถ้ามี Token แนบมากับ URL ให้บันทึกและตรวจสอบสถานะ
      localStorage.setItem('token', token);
      dispatch(checkAuthStatus());
      navigate('/');
    }
  }, [location, dispatch, navigate]);

  // 📌 2. ระบบล็อกอินด้วยรหัสผ่านปกติ
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    dispatch(loginStart());

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data || response.data;
      
      localStorage.setItem('token', token);
      dispatch(loginSuccess(user));
      navigate('/'); 
    } catch (error) {
      dispatch(loginFailure());
      const serverError = error.response?.data?.error?.message || error.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      setErrorMsg(serverError);
    }
  };

  // 📌 3. ระบบล็อกอินด้วย Google (แบบ ProjectGo)
  const handleGoogleLogin = () => {
    dispatch(loginStart());
    // เช็กว่า baseURL ของคุณลงท้ายด้วย /api อยู่แล้วหรือไม่
    // ถ้าใช่ ให้ต่อด้วย /auth/google ได้เลย
    const baseURL = api.defaults.baseURL || 'https://gtyconcerttestbe.onrender.com/api';
    window.location.href = `${baseURL}/auth/google`;
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">เข้าสู่ระบบ</h2>
        
        {errorMsg && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded">
            <p className="text-sm">{errorMsg}</p>
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
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <span className="absolute bg-white px-2 text-sm text-gray-500">หรือ</span>
            <div className="w-full h-px bg-gray-300"></div>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
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