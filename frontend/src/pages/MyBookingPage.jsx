// src/pages/MyBookingPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function MyBookingPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // ฟังก์ชันนี้เรียก API ดึงประวัติ (คุณต้องมี Route นี้ใน Backend ด้วย)
    const fetchBookings = async () => {
      try {
        const { data } = await api.get('/api/concerts/my-bookings'); // อ้างอิง Endpoint ที่ใช้ดึงประวัติ
        setBookings(data || []);
      } catch (err) {
        console.error("No bookings found");
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-300 dark:border-gray-700 pb-4">ตั๋วคอนเสิร์ตของฉัน</h2>
      
      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 text-center rounded-lg shadow border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">คุณยังไม่มีประวัติการจองตั๋ว</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b, i) => (
            <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-600 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-bold dark:text-white">{b.concert_name}</h3>
                <p className="text-gray-600 dark:text-gray-300">รหัสที่นั่ง: <span className="font-bold">{b.seat_code}</span> | สถานะ: {b.status}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-4 py-2 rounded font-bold">
                ชำระแล้ว
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}