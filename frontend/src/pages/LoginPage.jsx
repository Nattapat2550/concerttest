import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // สมมติว่ามี axios instance

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      // ดักจับสถานะจาก API
      if (response.data.user.status === 'banned') {
        setError('บัญชีของคุณถูกระงับการใช้งานถาวร กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }

      // ตรวจสอบ Reactivation (กู้คืนบัญชี)
      if (response.data.reactivated) {
        alert('กู้คืนบัญชีสำเร็จ! ยินดีต้อนรับกลับมา');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
      
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.message === 'ACCOUNT_BANNED') {
        setError('บัญชีของคุณถูกระงับการใช้งานถาวร');
      } else {
        setError(err.response?.data?.message || 'เข้าสู่ระบบล้มเหลว กรุณาลองใหม่');
      }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
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
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
            เข้าสู่ระบบ
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/register" className="text-blue-500 hover:underline text-sm">ยังไม่มีบัญชีใช่ไหม? สมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
}