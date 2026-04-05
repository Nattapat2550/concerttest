import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useDispatch } from 'react-redux';
import { checkAuthStatus } from '../store/slices/authSlice';

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const [search] = useSearchParams();
  
  const emailFromQuery = search.get('email') || '';
  const nameFromQuery = search.get('name') || '';
  const oauthIdFromQuery = search.get('oauthId') || '';
  const pictureUrlFromQuery = search.get('pictureUrl') || '';

  const nameParts = nameFromQuery.trim().split(' ');
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const [email, setEmail] = useState(emailFromQuery);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [tel, setTel] = useState('');
  
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!emailFromQuery) {
      const pending = sessionStorage.getItem('pendingEmail');
      if (pending) setEmail(pending);
    }
  }, [emailFromQuery]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    try {
      const { data } = await api.post('/api/auth/complete-profile', {
        email: email.trim(), 
        username: username.trim(), 
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        tel: tel.trim(),
        oauthId: oauthIdFromQuery,
        pictureUrl: pictureUrlFromQuery
      });
      
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      await dispatch(checkAuthStatus());
      window.location.href = '/home';
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to complete profile');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">สมบูรณ์แบบโปรไฟล์</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมล</label>
          <input type="email" required readOnly value={email} className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อผู้ใช้ (Username)</label>
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อจริง</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">นามสกุล</label>
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เบอร์โทรศัพท์</label>
          <input type="tel" required value={tel} onChange={(e) => setTel(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)</label>
          {/* เปลี่ยน minLength="8" เป็น minLength={8} */}
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
        </div>
        
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-4">บันทึกข้อมูลและเข้าสู่ระบบ</button>
      </form>
      {msg && <p className="mt-4 text-sm text-center text-red-600 dark:text-red-400">{msg}</p>}
    </div>
  );
};

export default CompleteProfilePage;