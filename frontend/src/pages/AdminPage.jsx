// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // users | concerts | news
  const [users, setUsers] = useState([]);
  
  // โหลดผู้ใช้
  useEffect(() => {
    if (activeTab === 'users') {
      api.get('/api/admin/users').then(res => setUsers(res.data)).catch(console.error);
    }
  }, [activeTab]);

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { status });
      alert("อัปเดตสถานะสำเร็จ");
    } catch (e) { alert("Error"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b pb-4">Admin Dashboard (ระบบจัดการฐานข้อมูล)</h2>
      
      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการผู้ใช้ (Users)</button>
        <button onClick={() => setActiveTab('concerts')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการคอนเสิร์ต</button>
        <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการข่าวสาร</button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Email</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Role</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b dark:border-gray-700">
                  <td className="px-6 py-4 dark:text-gray-300">{u.email}</td>
                  <td className="px-6 py-4 dark:text-gray-300">{u.role}</td>
                  <td className="px-6 py-4">
                    <select 
                      defaultValue={u.status || 'active'} 
                      onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)}
                      className="border rounded p-1 dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Concerts (UI สำหรับ CRUD) */}
      {activeTab === 'concerts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold dark:text-white">รายการคอนเสิร์ตในระบบ</h3>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">+ เพิ่มคอนเสิร์ตใหม่</button>
          </div>
          <div className="p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-center dark:text-gray-400">
            ระบบเชื่อมต่อ API เพิ่ม/ลบ คอนเสิร์ต (เตรียมพร้อมสำหรับเชื่อม Backend)
          </div>
        </div>
      )}

      {/* Tab: News */}
      {activeTab === 'news' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold dark:text-white">รายการข่าวสาร (Popup)</h3>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">+ สร้างข่าวสารใหม่</button>
          </div>
          <div className="p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-center dark:text-gray-400">
            ระบบเชื่อมต่อ API เพิ่ม/ลบ ข่าวสาร (เตรียมพร้อมสำหรับเชื่อม Backend)
          </div>
        </div>
      )}
    </div>
  );
}