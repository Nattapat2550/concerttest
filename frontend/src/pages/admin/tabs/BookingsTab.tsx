import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Booking, User } from '../types';

import ticketImg from '../../../assets/ticket.png';
import userImg from '../../../assets/user.png';
import eraserImg from '../../../assets/eraser.png';

export default function BookingsTab() {
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [users, setUsers] = useState<User[]>([]);

 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 50;

 const fetchBookings = async () => {
   try {
     const userRes = await api.get('/api/admin/users');
     setUsers(userRes.data || []);
     const bookRes = await api.get('/api/admin/bookings');
     setBookings(bookRes.data || []);
   } catch (e) { console.error("Error fetching bookings"); }
 };

 useEffect(() => { fetchBookings(); }, []);

 const handleCancelBooking = async (bookingId: string) => {
   if (window.confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) {
     try {
       await api.put(`/api/admin/bookings/${bookingId}/cancel`);
       fetchBookings();
     } catch (e) { alert("Error cancelling booking"); }
   }
 };

 const filteredBookings = bookings.filter(b => {
   const user = users.find(u => String(u.id) === String(b.user_id));
   const email = user ? user.email.toLowerCase() : '';
   const searchStr = searchQuery.toLowerCase();
   
   const matchesSearch = 
     (b.concert_name || '').toLowerCase().includes(searchStr) ||
     (b.seat_code || '').toLowerCase().includes(searchStr) ||
     (b.price || '').toString().includes(searchStr) ||
     email.includes(searchStr) ||
     (b.status || '').toLowerCase().includes(searchStr);
     
   const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
   return matchesSearch && matchesStatus;
 });

 const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
 const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 // Reset to page 1 when filters change
 useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

 return (
 <div className="w-full bg-canvas rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline overflow-hidden">
 <div className="p-4 lg:p-6 border-b border-outline flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
   <div className="flex items-center gap-3">
     <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
       <img src={ticketImg} alt="Bookings" className="w-6 h-6 object-contain" />
     </div>
     <h3 className="text-xl md:text-2xl font-black text-ink">รายการจองตั๋วทั้งหมด ({filteredBookings.length})</h3>
   </div>
   <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
     <input 
       type="text" 
       placeholder="🔍 ค้นหา (ชื่อคอน, ที่นั่ง, อีเมล, ...)" 
       value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
       className="p-2 border rounded-lg bg-canvas text-ink w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
     />
     <select 
       value={statusFilter} 
       onChange={e => setStatusFilter(e.target.value)}
       className="p-2 border rounded-lg bg-canvas text-ink w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
     >
       <option value="all">สถานะทั้งหมด</option>
       <option value="confirmed">Confirmed</option>
       <option value="wait">Wait (กำลังจ่าย)</option>
       <option value="cancelled">Cancelled</option>
       <option value="used">Used</option>
     </select>
   </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="min-w-full text-left border-collapse">
 <thead className="bg-canvas dark:bg-gray-800/50">
 <tr>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">คอนเสิร์ต</th>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">รหัสที่นั่ง</th>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">ราคา</th>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2"><img src={userImg} className="w-4 h-4 opacity-50 dark:invert" alt="User" /> ผู้จอง</th>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">สถานะ</th>
 <th className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider text-right">จัดการ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline">
 {paginatedBookings.map(b => {
 const user = users.find(u => String(u.id) === String(b.user_id));
 return (
 <tr key={b.id} className="hover:bg-lifted dark:hover:bg-gray-800/50 transition-colors">
 <td className="px-4 py-3 font-bold text-ink">{b.concert_name}</td>
 <td className="px-4 py-3">
 <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50">
 {b.seat_code || 'N/A'}
 </span>
 </td>
 <td className="px-4 py-3 font-medium">฿{b.price?.toLocaleString() || 0}</td>
 <td className="px-4 py-3 text-xs text-muted">{user ? user.email : `ID: ${b.user_id}`}</td>
 <td className="px-4 py-3">
 <span className={`px-2 py-1 rounded-full text-xs font-bold border ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800/50' : b.status === 'wait' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800/50'}`}>
 {b.status.toUpperCase()}
 </span>
 </td>
 <td className="px-4 py-3 text-right">
 {b.status === 'confirmed' && (
 <button onClick={() => handleCancelBooking(b.id)} title="ยกเลิก" className="inline-flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 rounded-lg transition-colors">
 <img src={eraserImg} alt="Cancel" className="w-4 h-4 object-contain" />
 </button>
 )}
 </td>
 </tr>
 );
 })}
 {paginatedBookings.length === 0 && (
   <tr>
     <td colSpan={6} className="px-6 py-8 text-center text-muted font-bold">
       ไม่พบข้อมูลการจอง
     </td>
   </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
   <div className="p-4 border-t border-outline flex justify-between items-center bg-canvas">
     <span className="text-sm text-muted">
       แสดงหน้า {currentPage} จาก {totalPages}
     </span>
     <div className="flex gap-2">
       <button 
         disabled={currentPage === 1}
         onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
         className="px-3 py-1 border rounded bg-lifted hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
       >
         ก่อนหน้า
       </button>
       <button 
         disabled={currentPage === totalPages}
         onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
         className="px-3 py-1 border rounded bg-lifted hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
       >
         ถัดไป
       </button>
     </div>
   </div>
 )}
 </div>
 );
}