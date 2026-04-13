// frontend/src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';

// ดึงไอคอนจากโฟลเดอร์ assets
import ideaImg from '../assets/idea.png'; 

interface Carousel {
  id: number;
  image_url: string;
  link_url: string;
  is_active: boolean;
}

interface DocumentItem {
  id: number;
  title: string;
  cover_image: string;
  is_active: boolean;
}

const LandingPage = () => {
  const { isAuthenticated, role } = useSelector((s: any) => s.auth);
  
  // State สำหรับเก็บข้อมูล Carousel และ Document
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ดึงข้อมูล Public จาก Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carouselRes, docRes] = await Promise.all([
          api.get('/api/carousel').catch(() => ({ data: [] })), 
          api.get('/api/documents/list').catch(() => ({ data: [] }))
        ]);
        setCarousels(carouselRes.data || []);
        setDocuments(docRes.data || []);
      } catch (err) {
        console.error("Failed to load public data");
      }
    };
    fetchData();
  }, []);

  // ระบบเลื่อน Carousel อัตโนมัติ (ทุก 5 วินาที)
  useEffect(() => {
    if (carousels.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carousels.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carousels.length]);

  // ถ้าล็อกอินแล้ว ให้เด้งไปหน้า Home หรือ Admin อัตโนมัติ
  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin' : '/home'} replace />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-300 overflow-x-hidden">
      
      {/* 1. Hero Section (ปุ่มเข้าสู่ระบบ / สมัครสมาชิก) */}
      <div className="relative pt-20 pb-16 md:pt-24 md:pb-20 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6 drop-shadow-sm">
          Welcome to ConcertTick
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 font-medium">
          เริ่มต้นประสบการณ์ทางดนตรีที่เหนือกว่า กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อจองตั๋วคอนเสิร์ตและใช้งานระบบเต็มรูปแบบ
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <Link 
            to="/register" 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all text-center"
          >
            สมัครสมาชิกใหม่
          </Link>
          <Link 
            to="/login" 
            className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all text-center flex items-center justify-center"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      {/* 2. Carousel Section (แบนเนอร์เลื่อนอัตโนมัติ) */}
      {carousels.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-4">
          <div className="relative w-full h-62.5 md:h-100 lg:h-112.5 rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {carousels.map((c, idx) => (
              <div
                key={c.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                {c.link_url ? (
                  <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
                    <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <img src={c.image_url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
            
            {carousels.length > 1 && (
              <>
                <button onClick={() => setCurrentSlide(prev => (prev - 1 + carousels.length) % carousels.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-blue-600 backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  &lt;
                </button>
                <button onClick={() => setCurrentSlide(prev => (prev + 1) % carousels.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-blue-600 backdrop-blur text-white w-10 h-10 rounded-full transition-all flex items-center justify-center font-bold shadow-lg">
                  &gt;
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {carousels.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all shadow-md ${idx === currentSlide ? 'bg-white scale-125 w-6' : 'bg-white/50 hover:bg-white'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Documents Section (ข่าวสารและแกลเลอรี) */}
      {documents.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-2xl">
              <img src={ideaImg} className="w-6 h-6 object-contain dark:invert" alt="Documents" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              ข่าวสาร & ข้อมูลแกลเลอรี
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {documents.map(d => (
              <div key={d.id} className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-2 hover:border-green-500/30">
                <div className="h-48 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                  {d.cover_image ? 
                    <img src={d.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : 
                    <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400 font-bold">No Image</span></div>
                  }
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white leading-snug line-clamp-2">{d.title}</h3>
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Link to={`/documents/${d.id}`} className="flex justify-center items-center w-full bg-gray-50 dark:bg-gray-900 group-hover:bg-green-600 text-gray-900 dark:text-white group-hover:text-white font-bold py-3.5 rounded-xl transition-all duration-300">
                      อ่านรายละเอียด & แกลเลอรี
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;