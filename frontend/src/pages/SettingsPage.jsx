import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await api.get('/api/users/me');
        setUsername(res.data.username || '');
        if (res.data.profile_picture_url) setAvatarUrl(res.data.profile_picture_url);
      } catch {
        navigate('/', { replace: true });
      }
    };
    loadMe();
  }, [navigate]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.put('/api/users/me', { username: username.trim() });
      setMsg({ text: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Update failed', type: 'error' });
    }
  };

  const handleAvatarChange = async (e) => {
    setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/api/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.profile_picture_url) setAvatarUrl(res.data.profile_picture_url);
      setMsg({ text: 'อัปโหลดรูปประจำตัวสำเร็จ', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Upload failed', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('คุณต้องการลบบัญชีใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      await api.delete('/api/users/me');
      navigate('/', { replace: true });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Delete failed', type: 'error' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">ตั้งค่าบัญชี</h2>

      <div className="flex flex-col sm:flex-row gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700 bg-gray-200 dark:bg-gray-600 shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition">
            เปลี่ยนรูป
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>

        <div className="flex-1 space-y-6">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อผู้ใช้</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value.trimStart())} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white" />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
              บันทึกการเปลี่ยนแปลง
            </button>
          </form>

          {msg && (
            <div className={`p-3 text-sm rounded-lg border ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
              {msg.text}
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">เขตอันตราย</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">การลบบัญชีจะเป็นการลบข้อมูลทั้งหมดของคุณออกจากระบบและไม่สามารถกู้คืนได้</p>
            <button type="button" onClick={handleDelete} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 border border-red-200 dark:border-red-800 font-semibold py-2 px-6 rounded-lg transition-all">
              ลบบัญชีผู้ใช้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;