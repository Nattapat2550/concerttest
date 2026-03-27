import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleUpdateStatus = async (userId, newRole, newStatus) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole, status: newStatus });
      alert('อัปเดตสถานะผู้ใช้สำเร็จ');
      fetchUsers(); // รีเฟรชข้อมูล
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">ระบบจัดการผู้ใช้ (Admin Only)</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID / Email</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ชื่อ - นามสกุล / โทรศัพท์</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">สถานะ</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">สิทธิ์ (Role)</th>
              <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <p className="text-gray-900 whitespace-no-wrap font-bold">{user.email}</p>
                  <p className="text-gray-500 whitespace-no-wrap text-xs">{user.user_id}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{user.first_name} {user.last_name}</p>
                  <p className="text-gray-500 whitespace-no-wrap">{user.tel || '-'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <select 
                    defaultValue={user.status}
                    onChange={(e) => handleUpdateStatus(user.user_id, user.role, e.target.value)}
                    className={`border rounded p-1 outline-none ${user.status === 'banned' ? 'text-red-600' : 'text-green-600'}`}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <select 
                    defaultValue={user.role}
                    onChange={(e) => handleUpdateStatus(user.user_id, e.target.value, user.status)}
                    className="border rounded p-1 outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                   <span className="text-gray-500 italic">Auto Saved on Change</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}