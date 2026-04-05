import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPasswordPage = () => {
  const [search] = useSearchParams();
  const token = search.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const requestReset = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setMsg('If that email exists, a reset link was sent.');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Request failed');
    }
  };

  const doReset = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword });
      setMsg('Password set. You can login now.');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Reset failed');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        {!token ? 'ลืมรหัสผ่าน' : 'ตั้งรหัสผ่านใหม่'}
      </h2>

      {!token ? (
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมล</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">ส่งลิงก์รีเซ็ตรหัสผ่าน</button>
        </form>
      ) : (
        <form onSubmit={doReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่านใหม่</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">ยืนยันรหัสผ่านใหม่</button>
        </form>
      )}

      {msg && <p className="mt-4 text-sm text-center text-blue-600 dark:text-blue-400 font-medium">{msg}</p>}
    </div>
  );
};

export default ResetPasswordPage;