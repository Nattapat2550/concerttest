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
    // ดึงข้อมูลผู้ใช้จาก API
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/api/users/me');
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          tel: data.tel || ''
        });
      } catch (err) {
        console.error('Failed to fetch user', err);
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/api/users/me', profile);
      setSuccessMsg('อัปเดตข้อมูลสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    try {
      // ส่ง status: 'deleted' เพื่อ Soft Delete
      await api.patch('/api/users/me', { status: 'deleted' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('บัญชีของคุณถูกปิดใช้งานแล้ว');
      navigate('/login');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบบัญชี');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6">ตั้งค่าโปรไฟล์</h2>
      
      {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMsg}</div>}

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อจริง</label>
            <input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="mt-1 block w-full border rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">นามสกุล</label>
            <input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="mt-1 block w-full border rounded-md shadow-sm p-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
          <input type="tel" value={profile.tel} onChange={(e) => setProfile({...profile, tel: e.target.value})} className="mt-1 block w-full border rounded-md shadow-sm p-2" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="mt-12 pt-6 border-t border-red-200">
        <h3 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">เมื่อลบบัญชี ข้อมูลของคุณจะถูกซ่อนจากระบบ หากคุณไม่กลับมาเข้าสู่ระบบภายใน 30 วัน ข้อมูลจะถูกลบถาวรอัตโนมัติ</p>
        <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
          ลบบัญชีผู้ใช้งาน
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">ยืนยันการลบบัญชี?</h3>
            <p className="text-sm text-gray-600 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีของคุณ? การกระทำนี้สามารถกู้คืนได้ภายใน 30 วันโดยการเข้าสู่ระบบใหม่</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">ยกเลิก</button>
              <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}