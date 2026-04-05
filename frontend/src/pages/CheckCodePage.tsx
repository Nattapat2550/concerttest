import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CheckCodePage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingEmail');
    if (!pending) {
      navigate('/register', { replace: true });
      return;
    }
    setEmail(pending);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/auth/verify-code', { email, code: code.trim() });
      navigate(`/form?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Invalid code');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ยืนยันรหัส</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">เราได้ส่งรหัสยืนยันไปที่ <br/><span className="font-semibold text-gray-900 dark:text-gray-200">{email}</span></p>
      
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัส 6 หลัก</label>
          <input
            type="text" required value={code} onChange={(e) => setCode(e.target.value.trim())}
            className="w-full px-4 py-2 text-center tracking-widest text-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
          ยืนยัน
        </button>
      </form>
      
      {msg && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{msg}</p>}
    </div>
  );
};

export default CheckCodePage;