import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function MyBookingPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await api.get('/api/concerts/my-bookings');
        setBookings(data || []);
      } catch (err) {
        console.error("No bookings found");
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-300 dark:border-gray-700 pb-4">
        ตั๋วคอนเสิร์ตของฉัน
      </h2>
      
      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-10 text-center rounded-lg shadow border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">คุณยังไม่มีประวัติการจองตั๋ว</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b, i) => (
            <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-600 dark:border-gray-700">
              <div className="mb-4 sm:mb-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{b.concert_name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  รหัสที่นั่ง: <span className="font-bold text-blue-600 dark:text-blue-400">{b.seat_code}</span> 
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-100 px-6 py-2 rounded-full font-bold shadow-sm">
                ✅ {b.status === 'confirmed' ? 'ยืนยันแล้ว' : b.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}