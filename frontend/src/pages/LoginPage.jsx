import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  // 📌 1. ระบบล็อกอินด้วยรหัสผ่านปกติ
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    dispatch(loginStart());

    try {
      // API จะรวมกับ BaseURL กลายเป็น /api/auth/login
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data.data || response.data;
      
      localStorage.setItem('token', token);
      dispatch(loginSuccess(user));
      navigate('/'); 
    } catch (error) {
      dispatch(loginFailure());
      const serverError = error.response?.data?.error?.message || error.response?.data?.message;
      setErrorMsg(serverError || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  // 📌 2. ระบบล็อกอินด้วย Google
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      dispatch(loginStart());
      setErrorMsg('');

      // ถอดรหัส Token ที่ได้จาก Google
      const decoded = jwtDecode(credentialResponse.credential);
      
      // จัดโครงสร้างส่งให้ Rust
      const payload = {
        email: decoded.email,
        oauthId: decoded.sub,
        username: decoded.name,
        pictureUrl: decoded.picture
      };

      const response = await api.post('/auth/oauth/google', payload);
      const { token, user } = response.data.data || response.data;

      localStorage.setItem('token', token);
      dispatch(loginSuccess(user));
      navigate('/');
    } catch (error) {
      dispatch(loginFailure());
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ Google เข้ากับเซิร์ฟเวอร์');
    }
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
          
          <div className="flex justify-center">
            <GoogleLogin 
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg('การล็อกอินผ่าน Google ถูกยกเลิกหรือไม่สำเร็จ')}
              useOneTap
            />
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          ยังไม่มีบัญชีใช่หรือไม่? <a href="/register" className="text-blue-600 hover:underline font-medium">สมัครสมาชิก</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;