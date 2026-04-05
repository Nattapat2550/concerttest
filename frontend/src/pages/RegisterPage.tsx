import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/auth/register', { email: email.trim() });
      sessionStorage.setItem('pendingEmail', email.trim());
      navigate('/check');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Register failed');
    }
  };

  const handleGoogle = () => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  };

  return (
    <div className="max-w-md w-full mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">สร้างบัญชีใหม่</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมล</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
          ส่งรหัสยืนยัน
        </button>
      </form>

      <div className="flex items-center my-6 text-gray-400">
        <div className="grow border-t border-gray-300 dark:border-gray-600"></div>
        <span className="px-3 text-sm">หรือ</span>
        <div className="grow border-t border-gray-300 dark:border-gray-600"></div>
      </div>

      <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2.5 rounded-lg transition-colors">
        ดำเนินการต่อด้วย Google
      </button>

      {msg && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 text-center">
          {msg}
        </div>
      )}
    </div>
  );
};

export default RegisterPage;