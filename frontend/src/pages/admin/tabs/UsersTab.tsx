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

 const handleUpdateUserStatus = async (userId: string, status: string) => {
 try {
 await api.put(`/api/admin/users/${userId}`, { status });
 alert("อัปเดตสถานะผู้ใช้สำเร็จ");
 } catch (e) { alert("Error updating user"); }
 };

 return (
 <div className="w-full bg-canvas rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline overflow-hidden">
 <div className="p-6 lg:p-8 border-b border-outline flex items-center gap-3">
 <div className="p-2 bg-indigo-50 /30 rounded-lg">
 <img src={userImg} alt="Users" className="w-6 h-6 object-contain" />
 </div>
 <h3 className="text-2xl font-black ">จัดการบัญชีผู้ใช้</h3>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full text-left border-collapse">
 <thead className="bg-canvas /50">
 <tr>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">อีเมล / บัญชี</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">ระดับสิทธิ์ (Role)</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-right flex justify-end items-center gap-2"><img src={settingsImg} className="w-4 h-4 opacity-50 dark:invert" alt="Status" /> จัดการสถานะ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline ">
 {users.map(u => (
 <tr key={u.id} className="hover:bg-canvas dark:hover:bg-gray-800/50 transition-colors">
 <td className="px-6 py-5 font-medium text-ink flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-lifted flex items-center justify-center text-xs font-bold overflow-hidden">
 {u.email.charAt(0).toUpperCase()}
 </div>
 {u.email}
 </td>
 <td className="px-6 py-5">
 <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200 /30 /50' : 'bg-lifted text-purple-900 border-outline '}`}>
 {u.role.toUpperCase()}
 </span>
 </td>
 <td className="px-6 py-5 text-right">
 <select 
 defaultValue={u.status || 'active'} 
 onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} 
 className="p-2.5 bg-canvas border border-outline text-sm font-medium rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all "
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