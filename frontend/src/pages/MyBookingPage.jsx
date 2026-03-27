import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function MyBookingPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/api/concerts/my-bookings');
      setBookings(data || []);
    } catch (err) { console.error("No bookings found"); }
  };

  const handleCancel = async (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกตั๋วใบนี้? ระบบจะปล่อยที่นั่งคืนทันที")) {
      try {
        await api.put(`/api/concerts/bookings/${id}/cancel`);
        alert("ยกเลิกตั๋วสำเร็จ");
        fetchBookings();
      } catch (err) { alert("เกิดข้อผิดพลาดในการยกเลิก"); }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 min-h-[60vh]">
      <h2 className="text-3xl font-black mb-8 border-b dark:border-gray-700 pb-4 dark:text-white">🎟️ ตั๋วคอนเสิร์ตของฉัน</h2>
      
      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-10 text-center rounded-xl shadow border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">คุณยังไม่มีประวัติการจองตั๋ว</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className={`flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-8 ${b.status === 'confirmed' ? 'border-green-500' : 'border-gray-400 dark:border-gray-600'}`}>
              <div className="text-center sm:text-left w-full">
                <h3 className={`text-2xl font-bold ${b.status === 'cancelled' ? 'text-gray-400 line-through' : 'dark:text-white'}`}>{b.concert_name}</h3>
                <div className="mt-2 text-lg dark:text-gray-300">
                  ที่นั่ง: <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700 px-3 py-1 rounded ml-2">{b.seat_code || 'ระบุไม่ได้'}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">ยอดชำระ: ฿{b.price}</p>
              </div>
              
              <div className="mt-4 sm:mt-0 text-center w-full sm:w-auto flex flex-col items-center sm:items-end gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${b.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800'}`}>
                  {b.status === 'confirmed' ? '✅ ยืนยันแล้ว' : '❌ ยกเลิกแล้ว'}
                </span>
                {b.status === 'confirmed' && (
                  <button onClick={() => handleCancel(b.id)} className="text-sm font-bold text-red-500 hover:text-red-700 underline">ยกเลิกตั๋วใบนี้</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}