import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const response = await api.post('/api/auth/login', { 
        email, 
        password, 
        remember 
      });
      
      if (response.data.user.status === 'banned') {
        setError('บัญชีของคุณถูกระงับการใช้งานถาวร');
        return;
      }

      if (response.data.reactivated) {
        alert('กู้คืนบัญชีสำเร็จ! ยินดีต้อนรับกลับมา');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // บังคับรีโหลดหน้าเว็บเพื่อให้อัปเดต Navbar และ State ทันที (แก้ปัญหาค้างหน้า Login)
      window.location.href = '/';
      
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.message === 'ACCOUNT_BANNED') {
        setError('บัญชีของคุณถูกระงับการใช้งานถาวร');
      } else {
        setError(err.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    }
  };

  const handleGoogleLogin = () => {
    // ชี้ไปยัง Endpoint ของ Backend เพื่อเริ่ม OAuth Flow
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">เข้าสู่ระบบ</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{message}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2">รหัสผ่าน</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
            {/* ปุ่ม Show/Hide Password */}
            <button 
              type="button" 
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>

          {/* Checkbox Remember Me */}
          <div className="mb-6 flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input 
                type="checkbox" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                className="mr-2 rounded"
              />
              จดจำการเข้าสู่ระบบ
            </label>
            <Link to="/reset" className="text-sm text-blue-500 hover:underline">ลืมรหัสผ่าน?</Link>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 mb-4 transition duration-200">
            เข้าสู่ระบบ
          </button>
        </form>

        <div className="relative flex items-center justify-center w-full mt-4 mb-4 border-t">
            <span className="absolute bg-white px-2 text-sm text-gray-500">หรือ</span>
        </div>

        {/* ปุ่ม Google Login */}
        <button 
          onClick={handleGoogleLogin} 
          className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-200"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
          เข้าสู่ระบบด้วย Google
        </button>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-blue-500 hover:underline text-sm">ยังไม่มีบัญชีใช่ไหม? สมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
}