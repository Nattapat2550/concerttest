import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isBanned, setIsBanned] = useState(false); // เพิ่ม State เช็คแบน
  
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    setIsBanned(false);
    try {
      const { data } = await api.post('/api/auth/login', { email, password, remember });
      
      if (data.user.status === 'banned') {
        setIsBanned(true); // เซ็ตแบนเป็น true เพื่อโชว์ปุ่มอุทธรณ์
        return setError('บัญชีของคุณถูกระงับการใช้งานถาวร');
      }
      if (data.reactivated) alert('กู้คืนบัญชีสำเร็จ! ยินดีต้อนรับกลับมา');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.response?.data?.error || 'เข้าสู่ระบบล้มเหลว');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'https://gtyconcerttestbe.onrender.com/api/auth/google';
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border dark:border-gray-700">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">เข้าสู่ระบบ</h2>
        
        {/* เพิ่มเงื่อนไขเพื่อแสดงปุ่ม ยื่นคำร้องปลดแบน เมื่อ isBanned = true */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm flex flex-col items-center">
            <span className="text-center">{error}</span>
            {isBanned && (
              <Link to="/appeals" className="mt-2 text-blue-700 hover:text-blue-900 font-bold underline">
                ยื่นคำร้องปลดแบนคลิกที่นี่
              </Link>
            )}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="mb-4 relative">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">รหัสผ่าน</label>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm">
              {showPassword ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
          
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)} 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                จดจำการเข้าสู่ระบบ
              </label>
            </div>
            <Link to="/reset" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">เข้าสู่ระบบ</button>
        </form>

        <div className="relative flex items-center justify-center w-full mt-6 mb-4">
          <div className="border-t border-gray-300 dark:border-gray-600 w-full"></div>
          <span className="absolute bg-white dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400">หรือ</span>
        </div>

        <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-5 h-5 mr-2" />
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  );
}