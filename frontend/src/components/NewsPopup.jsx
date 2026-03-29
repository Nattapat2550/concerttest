import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function NewsPopup() {
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // เช็คทั้ง localStorage (ถ้าเคยกดไม่แสดงอีก) และ sessionStorage (ถ้าเคยดูไปแล้วใน session นี้)
    const hasSeenLocal = localStorage.getItem('hasSeenNews');
    const hasSeenSession = sessionStorage.getItem('hasSeenNews');
    
    if (!hasSeenLocal && !hasSeenSession) {
      fetchActiveNews();
    }
  }, []);

  const fetchActiveNews = async () => {
    try {
      // ✅ เปลี่ยนกลับมาใช้ /latest เพื่อให้ตรงกับ Backend เดิมที่มีอยู่
      const { data } = await api.get('/api/concerts/news/latest'); 
      if (data) {
        // ✅ นำข่าวเดียวที่ได้มา ใส่เข้าไปใน Array เพื่อให้โค้ดเก่าใช้ .map() ได้โดยไม่พัง
        setNewsList([data]);
        setShowNewsModal(true);
      }
    } catch (error) {
      console.log("No active news");
    }
  };

  const closeNewsModal = () => {
    setShowNewsModal(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenNews', 'true'); // จำถาวรจนกว่าจะล้างแคช
    } else {
      sessionStorage.setItem('hasSeenNews', 'true'); // จำแค่รอบเปิด Browser นี้
    }
  };

  if (!showNewsModal || newsList.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full relative max-h-[90vh] flex flex-col">
        <button 
          onClick={closeNewsModal} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none"
        >
          &times;
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-blue-800 border-b pb-2">ประกาศข่าวสาร</h2>
        
        {/* คอนเทนต์ข่าว เลื่อนดูได้ถ้ามีหลายข่าว */}
        <div className="overflow-y-auto pr-2 mb-4 space-y-8 flex-1">
          {newsList.map((news, index) => (
            <div key={index} className="pb-4">
              <h3 className="text-xl font-bold mb-2 text-gray-900">{news.title}</h3>
              <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-line">{news.content}</p>
              {news.image_url && (
                  <img src={news.image_url} alt="News" className="w-full h-auto rounded-lg shadow-sm" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700 text-sm font-medium">รับทราบและไม่แสดงหน้านี้อีก</span>
          </label>
          
          <button 
            onClick={closeNewsModal} 
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            เข้าสู่เว็บไซต์
          </button>
        </div>
      </div>
    </div>
  );
}