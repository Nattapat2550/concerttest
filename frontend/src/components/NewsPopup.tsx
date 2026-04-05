import React, { useState, useEffect } from 'react';
import api from '../services/api';

// 1. สร้าง Interface ให้ News
interface News {
  id: number;
  title: string;
  content: string;
  image_url?: string;
}

export default function NewsPopup() {
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsList, setNewsList] = useState<News[]>([]); // 2. บอกว่า Array นี้เก็บข้อมูลหน้าตาแบบ News
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    fetchActiveNews();
    localStorage.removeItem('hasSeenNews');
    sessionStorage.removeItem('hasSeenNews');
  }, []);

  const fetchActiveNews = async () => {
    try {
      const { data } = await api.get('/api/concerts/news/latest'); 
      
      if (data && data.length > 0) {
        const latestNewsIdFromDB = Math.max(...data.map((n: News) => n.id));
        
        // 3. เติม || '0' เข้าไปเพื่อรับมือกับกรณีที่ getItem คืนค่ามาเป็น null
        const seenLocalId = parseInt(localStorage.getItem('latestSeenNewsId') || '0', 10);
        const seenSessionId = parseInt(sessionStorage.getItem('latestSeenNewsId') || '0', 10);

        if (latestNewsIdFromDB > seenLocalId && latestNewsIdFromDB > seenSessionId) {
          setNewsList(data);
          setShowNewsModal(true);
        }
      }
    } catch (error: any) {
      console.log("No active news");
    }
  };

  const closeNewsModal = () => {
    setShowNewsModal(false);
    
    const latestId = Math.max(...newsList.map(n => n.id));
    
    if (dontShowAgain) {
      localStorage.setItem('latestSeenNewsId', latestId.toString()); // เติม toString()
    } else {
      sessionStorage.setItem('latestSeenNewsId', latestId.toString());
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
        
        <div className="overflow-y-auto pr-2 mb-4 space-y-8 flex-1">
          {newsList.map((news) => (
            <div key={news.id} className="pb-4">
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
            <span className="text-gray-700 text-sm font-medium">รับทราบและไม่แสดงหน้านี้อีกจนกว่าจะมีข่าวใหม่</span>
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