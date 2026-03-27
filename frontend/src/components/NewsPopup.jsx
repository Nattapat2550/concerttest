import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function NewsPopup() {
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [news, setNews] = useState(null);

  useEffect(() => {
    // เช็คว่า Session นี้เคยดูข่าวไปหรือยัง (จะเด้งแค่ครั้งแรกที่เปิด Browser)
    const hasSeenNews = sessionStorage.getItem('hasSeenNews');
    if (!hasSeenNews) {
      fetchLatestNews();
    }
  }, []);

  const fetchLatestNews = async () => {
    try {
      // ดึงข้อมูลข่าวสารล่าสุดจาก Backend
      const { data } = await api.get('/api/concerts/news/latest');
      if (data) {
        setNews(data);
        setShowNewsModal(true);
      }
    } catch (error) {
      // กรณีไม่มีข่าวเปิดใช้งานอยู่ (404) จะเงียบไป
      console.log("No active news");
    }
  };

  const closeNewsModal = () => {
    setShowNewsModal(false);
    sessionStorage.setItem('hasSeenNews', 'true');
  };

  if (!showNewsModal || !news) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-lg w-full relative">
        <button 
          onClick={closeNewsModal} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-blue-800">{news.title}</h2>
        <p className="text-gray-700 mb-6 leading-relaxed whitespace-pre-line">{news.content}</p>
        {news.image_url && (
            <img src={news.image_url} alt="News" className="w-full h-auto mb-6 rounded" />
        )}
        <button 
          onClick={closeNewsModal} 
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          รับทราบและเข้าสู่เว็บไซต์
        </button>
      </div>
    </div>
  );
}