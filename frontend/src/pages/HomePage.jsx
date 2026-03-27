import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function HomePage() {
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [news, setNews] = useState(null);
  const [concerts, setConcerts] = useState([]);

  useEffect(() => {
    // 1. ตรวจสอบการเข้าเว็บครั้งแรกสำหรับแสดง News Popup
    const hasSeenNews = sessionStorage.getItem('hasSeenNews');
    if (!hasSeenNews) {
      fetchLatestNews();
    }

    // 2. โหลดรายการคอนเสิร์ต
    fetchConcerts();
  }, []);

  const fetchLatestNews = async () => {
    try {
      const { data } = await api.get('/api/concerts/news/latest'); // สร้าง Endpoint นี้ที่ฝั่ง Backend
      if (data) {
        setNews(data);
        setShowNewsModal(true);
      }
    } catch (error) {
      console.error("No active news");
    }
  };

  const closeNewsModal = () => {
    setShowNewsModal(false);
    sessionStorage.setItem('hasSeenNews', 'true');
  };

  const fetchConcerts = async () => {
    // จำลองข้อมูลระหว่างที่ Backend Concert DB กำลังพัฒนา
    const mockConcerts = [
      { id: 1, name: "Rock The Night 2026", date: "1 Dec 2026", venue: "Impact Arena", img: "https://via.placeholder.com/400x200" }
    ];
    setConcerts(mockConcerts);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* ส่วนหัว */}
      <div className="bg-blue-900 text-white p-10 text-center">
        <h1 className="text-4xl font-bold mb-4">ยินดีต้อนรับสู่ ConcertTick</h1>
        <p className="text-lg">จองตั๋วคอนเสิร์ตที่คุณชื่นชอบได้ง่ายๆ ที่นี่</p>
      </div>

      {/* แท็บคอนเสิร์ต */}
      <div className="max-w-6xl mx-auto mt-10 px-4">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h2 className="text-2xl font-bold text-gray-800">คอนเสิร์ตเร็วๆ นี้</h2>
          <Link to="/my-bookings" className="text-blue-600 hover:underline font-medium">ดูที่นั่งที่จองแล้ว</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {concerts.map(c => (
            <div key={c.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <img src={c.img} alt={c.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-bold mb-2">{c.name}</h3>
                <p className="text-gray-600 text-sm mb-1">📅 {c.date}</p>
                <p className="text-gray-600 text-sm mb-4">📍 {c.venue}</p>
                <Link to={`/concerts/${c.id}/book`} className="block text-center w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  เลือกระบุที่นั่ง
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* News Modal */}
      {showNewsModal && news && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-lg w-full relative animate-fade-in-up">
            <button onClick={closeNewsModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-blue-800">{news.title}</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">{news.content}</p>
            <button onClick={closeNewsModal} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">เข้าสู่เว็บไซต์หลัก</button>
          </div>
        </div>
      )}
    </div>
  );
}