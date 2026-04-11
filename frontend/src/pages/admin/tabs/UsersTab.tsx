import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { User } from '../types';

import userImg from '../../../assets/user.png';
import settingsImg from '../../../assets/settings.png';

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
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-6 lg:p-8 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
          <img src={userImg} alt="Users" className="w-6 h-6 object-contain" />
        </div>
        <h3 className="text-2xl font-black dark:text-white">จัดการบัญชีผู้ใช้</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">อีเมล / บัญชี</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ระดับสิทธิ์ (Role)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right flex justify-end items-center gap-2"><img src={settingsImg} className="w-4 h-4 opacity-50 dark:invert" alt="Status" /> จัดการสถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-5 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  {u.email}
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <select 
                    defaultValue={u.status || 'active'} 
                    onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} 
                    className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all dark:text-gray-200"
                  >
                    <option value="active">🟢 Active</option>
                    <option value="suspended">🟡 Suspended</option>
                    <option value="banned">🔴 Banned</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}