import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Booking, User } from '../types';

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

  const handleCancelBooking = async (bookingId: number) => {
    if (window.confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) {
      try {
        await api.put(`/api/admin/bookings/${bookingId}/cancel`);
        fetchBookings();
      } catch (e) { alert("Error cancelling booking"); }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
        <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">คอนเสิร์ต</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">รหัสที่นั่ง</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">ราคา</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">ผู้จอง (Email)</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">สถานะ</th>
            <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => {
            const user = users.find(u => String(u.id) === String(b.user_id));
            return (
              <tr key={b.id} className="border-b dark:border-gray-700">
                <td className="px-6 py-4 font-bold dark:text-gray-300">{b.concert_name}</td>
                <td className="px-6 py-4 text-blue-600 font-bold">{b.seat_code || 'ระบบเก่า'}</td>
                <td className="px-6 py-4 dark:text-gray-300">฿{b.price}</td>
                <td className="px-6 py-4 dark:text-gray-300">{user ? user.email : `User ID: ${b.user_id}`}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                <td className="px-6 py-4">{b.status === 'confirmed' && <button onClick={() => handleCancelBooking(b.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">ยกเลิก</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}