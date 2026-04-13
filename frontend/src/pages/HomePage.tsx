import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

import heroImg from '../assets/hero.png';
import calendarImg from '../assets/calendar.png';
import placeImg from '../assets/place.png';
import ticketImg from '../assets/ticket.png';
import ideaImg from '../assets/idea.png'; 

interface Concert {
  id: number;
  access_code: string; 
  name: string;
  show_date: string;
  venue: string;
  layout_image_url?: string;
  is_active: boolean;
}

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

export default function HomePage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [concertRes, carouselRes, docRes] = await Promise.all([
          api.get('/api/concerts/list'),
          // แก้ไข URL ให้ตรงกับ Backend
          api.get('/api/carousel').catch(() => ({ data: [] })), 
          api.get('/api/documents/list').catch(() => ({ data: [] }))
        ]);
        setConcerts(concertRes.data || []);
        setCarousels(carouselRes.data || []);
        setDocuments(docRes.data || []);
      } catch (err: any) { 
        console.error("Failed to load initial data");
      }
    };
    fetchData();
  }, []);

  // ระบบเลื่อน Carousel อัตโนมัติ
  useEffect(() => {
    if (carousels.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carousels.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carousels.length]);

  return (
    <div className="w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-300">
      {/* Premium Hero Banner */}
      <div className="relative bg-linear-to-br from-indigo-900 via-purple-900 to-black text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-blue-600 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[120%] bg-pink-600 rounded-full blur-[150px] mix-blend-screen"></div>
        </div>

        <div className="w-full px-6 lg:px-12 2xl:px-20 py-16 lg:py-24 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left flex-1">
            <span className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-sm font-bold tracking-widest uppercase mb-6 border border-white/20 text-purple-200">
              The Ultimate Experience
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-lg">
              Unlock Your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">Live Music</span> Journey
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto md:mx-0">
              ระบบจองตั๋วคอนเสิร์ตที่ล้ำสมัยที่สุด เลือกระบุที่นั่งแบบ Interactive และสัมผัสประสบการณ์ที่เหนือกว่า
            </p>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative w-64 md:w-80 lg:w-96">
              <div className="absolute inset-0 bg-linear-to-t from-blue-600 to-purple-500 rounded-full blur-3xl opacity-40 animate-pulse"></div>
              <img src={heroImg} alt="Hero" className="w-full h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Editable Carousel Section */}
      {carousels.length > 0 && (
        <div className="w-full px-6 lg:px-12 2xl:px-20 mt-10">
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

      {/* Concerts Grid Section */}
      <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl">
            <img src={ticketImg} className="w-6 h-6 object-contain dark:invert" alt="Concerts" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            คอนเสิร์ตเร็วๆ นี้
          </h2>
        </div>
        
        {concerts.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
            <img src={calendarImg} className="w-16 h-16 mx-auto opacity-30 dark:invert mb-4" alt="Empty" />
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">ยังไม่มีคอนเสิร์ตในระบบขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {concerts.map(c => (
              <div key={c.id} className={`group bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-300 ${!c.is_active ? 'opacity-70 grayscale' : 'hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 hover:border-blue-500/30'}`}>
                
                <div className="h-56 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                  {c.layout_image_url ? 
                    <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : 
                    <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400 font-bold">No Image</span></div>
                  }
                  <div className="absolute top-4 right-4 z-10">
                    {c.is_active ? (
                      <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur text-blue-600 dark:text-blue-400 text-xs font-black px-4 py-1.5 rounded-full shadow-lg">เปิดจองแล้ว</span>
                    ) : (
                      <span className="bg-black/80 backdrop-blur text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">Coming Soon</span>
                    )}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white leading-snug line-clamp-2">{c.name}</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mr-3 shrink-0">
                        <img src={calendarImg} alt="Date" className="w-4 h-4 object-contain opacity-70 dark:invert" />
                      </div>
                      <span>{new Date(c.show_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mr-3 shrink-0">
                        <img src={placeImg} alt="Venue" className="w-4 h-4 object-contain opacity-70 dark:invert" />
                      </div>
                      <span className="truncate">{c.venue}</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    {c.is_active ? (
                      <Link to={`/concerts/${c.access_code}`} className="flex justify-center items-center w-full bg-gray-50 dark:bg-gray-900 group-hover:bg-blue-600 text-gray-900 dark:text-white group-hover:text-white font-bold py-3.5 rounded-xl transition-all duration-300">
                        ดูรายละเอียด & จองตั๋ว
                      </Link>
                    ) : (
                      <button disabled className="w-full bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 font-bold py-3.5 rounded-xl cursor-not-allowed border border-gray-200 dark:border-gray-700 border-dashed">
                        รอเปิดจำหน่าย
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents/Gallery Section */}
      <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-2xl">
            <img src={ideaImg} className="w-6 h-6 object-contain dark:invert" alt="Documents" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            ข่าวสาร & ข้อมูลแกลเลอรี
          </h2>
        </div>
        
        {documents.length > 0 && (
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
        )}
      </div>

    </div>
  );
}