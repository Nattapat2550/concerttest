import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function HomePage() {
  const [concerts, setConcerts] = useState([]);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const { data } = await api.get('/api/concerts/list');
        setConcerts(data || []);
      } catch (err) {
        console.error("Failed to load concerts");
      }
    };
    fetchConcerts();
  }, []);

  return (
    // ✅ ลบ bg-white ทิ้ง ให้ใช้สีตาม Layout หลัก
    <div className="pb-10">
      <div className="bg-blue-900 text-white p-12 text-center shadow-inner">
        <h1 className="text-4xl font-bold mb-4">ยินดีต้อนรับสู่ ConcertTick</h1>
        <p className="text-lg">เลือกระบุที่นั่งและจองตั๋วคอนเสิร์ตที่คุณชื่นชอบ</p>
      </div>

      <div className="max-w-6xl mx-auto mt-10 px-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2 mb-6">
          คอนเสิร์ตเร็วๆ นี้
        </h2>
        
        {concerts.length === 0 ? (
          <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">ยังไม่มีคอนเสิร์ตในระบบ (Admin กำลังเพิ่มข้อมูล)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700 hover:shadow-lg transition">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {c.layout_image_url ? 
                    <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover"/> : 
                    <span className="text-gray-400 dark:text-gray-500">ไม่มีรูปภาพประกอบ</span>
                  }
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{c.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">📅 {new Date(c.show_date).toLocaleString()}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">📍 {c.venue}</p>
                  <Link to={`/concerts/${c.id}/book`} className="block text-center w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">
                    เลือกระบุที่นั่ง
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}