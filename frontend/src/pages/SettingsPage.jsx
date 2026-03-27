import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ first_name: '', last_name: '', tel: '' });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => setProfile({
      first_name: data.first_name || '', last_name: data.last_name || '', tel: data.tel || ''
    })).catch(console.error);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/api/users/me', profile);
      setSuccessMsg('อัปเดตข้อมูลสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล'); }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await api.patch('/api/users/me', { status: 'deleted' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) { alert('เกิดข้อผิดพลาดในการลบบัญชี'); }
  };

  return (
    // ✅ เพิ่ม dark:bg-gray-800 และ dark:border-gray-700
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
      <h2 className="text-2xl font-bold border-b dark:border-gray-700 pb-4 mb-6 dark:text-white">ตั้งค่าโปรไฟล์</h2>
      {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMsg}</div>}

      <form onSubmit={handleUpdateProfile} className="space-y-4">
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
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="mt-12 pt-6 border-t border-red-200 dark:border-red-900">
        <h3 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">เมื่อลบบัญชี ข้อมูลของคุณจะถูกซ่อน หากคุณไม่เข้าสู่ระบบภายใน 30 วัน ข้อมูลจะถูกลบถาวร</p>
        <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition">ลบบัญชีผู้ใช้งาน</button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full border dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white">ยืนยันการลบบัญชี?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-300">ยกเลิก</button>
              <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}