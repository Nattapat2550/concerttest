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
    <div className="pb-10 w-full overflow-x-hidden">
      <div className="bg-blue-900 text-white p-8 md:p-12 text-center shadow-inner">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 px-2 wrap-break-word">ยินดีต้อนรับสู่ ConcertTick</h1>
        <p className="text-base md:text-lg px-4">เลือกระบุที่นั่งและจองตั๋วคอนเสิร์ตที่คุณชื่นชอบ</p>
      </div>

      <div className="w-full max-w-6xl mx-auto mt-8 md:mt-10 px-4 sm:px-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2 mb-6">
          คอนเสิร์ตเร็วๆ นี้
        </h2>
        
        {concerts.length === 0 ? (
          <div className="text-center p-8 md:p-10 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 mx-2">
            <p className="text-gray-500 dark:text-gray-400">ยังไม่มีคอนเสิร์ตในระบบ (Admin กำลังเพิ่มข้อมูล)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700 hover:shadow-lg transition flex flex-col h-full">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  {c.layout_image_url ? 
                    <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover"/> : 
                    <span className="text-gray-400 dark:text-gray-500 text-sm">ไม่มีรูปภาพประกอบ</span>
                  }
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-gray-900 dark:text-white wrap-break-word line-clamp-2">{c.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">📅 {new Date(c.show_date).toLocaleString()}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 truncate">📍 {c.venue}</p>
                  
                  <div className="mt-auto pt-2">
                    <Link to={`/concerts/${c.id}/book`} className="block text-center w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition active:scale-95 shadow-md">
                      เลือกระบุที่นั่ง
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}