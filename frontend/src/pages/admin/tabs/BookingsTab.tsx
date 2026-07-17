import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Booking, User } from '../types';

import ticketImg from '../../../assets/ticket.png';
import userImg from '../../../assets/user.png';
import eraserImg from '../../../assets/eraser.png';

export default function BookingsTab() {
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [users, setUsers] = useState<User[]>([]);

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

 return (
 <div className="w-full bg-canvas rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline overflow-hidden">
 <div className="p-6 lg:p-8 border-b border-outline flex items-center gap-3">
 <div className="p-2 bg-orange-50 /30 rounded-lg">
 <img src={ticketImg} alt="Bookings" className="w-6 h-6 object-contain" />
 </div>
 <h3 className="text-2xl font-black ">รายการจองตั๋วทั้งหมด</h3>
 </div>
 
 <div className="overflow-x-auto">
 <table className="min-w-full text-left border-collapse">
 <thead className="bg-canvas /50">
 <tr>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">คอนเสิร์ต</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">รหัสที่นั่ง</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">ราคา</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2"><img src={userImg} className="w-4 h-4 opacity-50 dark:invert" alt="User" /> ผู้จอง</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">สถานะ</th>
 <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-right">จัดการ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline ">
 {bookings.map(b => {
 const user = users.find(u => String(u.id) === String(b.user_id));
 return (
 <tr key={b.id} className="hover:bg-canvas dark:hover:bg-gray-800/50 transition-colors">
 <td className="px-6 py-4 font-bold text-ink ">{b.concert_name}</td>
 <td className="px-6 py-4">
 <span className="font-mono text-sm font-bold bg-blue-50 text-blue-700 /30 px-3 py-1 rounded-lg border border-blue-100 /50">
 {b.seat_code || 'N/A'}
 </span>
 </td>
 <td className="px-6 py-4 font-medium ">฿{b.price?.toLocaleString() || 0}</td>
 <td className="px-6 py-4 text-sm text-muted ">{user ? user.email : `ID: ${b.user_id}`}</td>
 <td className="px-6 py-4">
 <span className={`px-3 py-1 rounded-full text-xs font-bold border ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200 /30 /50' : 'bg-red-50 text-red-700 border-red-200 /30 /50'}`}>
 {b.status.toUpperCase()}
 </span>
 </td>
 <td className="px-6 py-4 text-right">
 {b.status === 'confirmed' && (
 <button onClick={() => handleCancelBooking(b.id)} title="ยกเลิก" className="inline-flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 /20 dark:hover:bg-red-900/40 text-red-600 rounded-lg transition-colors">
 <img src={eraserImg} alt="Cancel" className="w-5 h-5 object-contain" />
 </button>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 );
}