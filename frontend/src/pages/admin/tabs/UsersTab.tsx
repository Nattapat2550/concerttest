import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { User } from '../types';

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const userRes = await api.get('/api/admin/users');
      setUsers(userRes.data || []);
    } catch (e) { console.error("Error fetching users"); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status });
      alert("อัปเดตสถานะผู้ใช้สำเร็จ");
    } catch (e) { alert("Error updating user"); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
        <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Email</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Role</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b dark:border-gray-700">
              <td className="px-6 py-4 dark:text-gray-300">{u.email}</td>
              <td className="px-6 py-4 dark:text-gray-300">{u.role}</td>
              <td className="px-6 py-4">
                <select defaultValue={u.status || 'active'} onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} className="border rounded p-1 dark:bg-gray-800 dark:text-white outline-none">
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
  );
}