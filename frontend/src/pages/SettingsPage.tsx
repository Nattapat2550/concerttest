// frontend/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // เพิ่ม Import Link ตรงนี้
import api from '../services/api';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ username: '', first_name: '', last_name: '', tel: '', profile_picture_url: '' });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => setProfile({
      username: data.username || '',
      first_name: data.first_name || '', 
      last_name: data.last_name || '', 
      tel: data.tel || '', 
      profile_picture_url: data.profile_picture_url || ''
    })).catch(console.error);
  }, []);

  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/users/me', profile); 
      
      // อัปเดต LocalStorage เพื่อให้ Navbar เปลี่ยนทันที
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.username = profile.username;
        u.first_name = profile.first_name;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('storage'));
      }

      setSuccessMsg('บันทึกข้อมูลสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { 
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึก หรือ Username นี้ถูกใช้ไปแล้ว'); 
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.post('/api/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, profile_picture_url: data.profile_picture_url });
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.profile_picture_url = data.profile_picture_url;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('storage'));
      }

      alert('เปลี่ยนรูปโปรไฟล์สำเร็จ');
    } catch (err: any) { alert('ไฟล์รูปภาพใหญ่เกินไป หรือเกิดข้อผิดพลาด'); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? (คุณสามารถกู้คืนได้เมื่อกลับมาล็อกอินใหม่)")) {
      try {
        await api.put('/api/users/me', { status: 'deleted' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } catch (err: any) { alert('เกิดข้อผิดพลาดในการลบ'); }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
      <h2 className="text-2xl font-bold border-b dark:border-gray-700 pb-4 mb-6 dark:text-white">ตั้งค่าโปรไฟล์ส่วนตัว</h2>
      
      {successMsg && <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded">{successMsg}</div>}

      <div className="flex flex-col md:flex-row gap-8">
        
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 rounded-full border-4 border-blue-100 dark:border-gray-600 overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 dark:text-gray-500">ไม่มีรูป</span>
            )}
          </div>
          <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 text-gray-700 dark:text-gray-200 py-1 px-4 rounded shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm">
            เลือกรูปจากเครื่อง
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <form onSubmit={handleUpdateProfile} className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input type="text" value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} className="mt-1 block w-full border dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อจริง</label>
              <input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="mt-1 block w-full border dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">นามสกุล</label>
              <input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="mt-1 block w-full border dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เบอร์โทรศัพท์</label>
            <input type="tel" value={profile.tel} onChange={(e) => setProfile({...profile, tel: e.target.value})} className="mt-1 block w-full border dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition">
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
          </button>
        </form>
      </div>

      {/* --- ส่วนที่เพิ่มเข้ามา: ปุ่มยื่นคำร้อง --- */}
      <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">การช่วยเหลือและการร้องเรียน</h3>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-orange-800 dark:text-orange-400">ยื่นคำร้องปลดแบน / รายงานปัญหา</h4>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              หากคุณถูกระงับการใช้งานหรือต้องการส่งเรื่องให้ทีมงานตรวจสอบ
            </p>
          </div>
          <Link 
            to="/appeals" 
            className="px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-sm whitespace-nowrap"
          >
            ยื่นคำร้อง
          </Link>
        </div>
      </div>
      {/* ---------------------------------- */}

      <div className="mt-8 pt-6 border-t border-red-200 dark:border-red-900 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-500">Danger Zone</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">ปิดการใช้งานบัญชี หากล็อกอินกลับมาภายใน 30 วันบัญชีจะถูกกู้คืน</p>
        </div>
        <button onClick={handleDeleteAccount} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition font-bold">
          ปิดการใช้งานบัญชี
        </button>
      </div>
    </div>
  );
}