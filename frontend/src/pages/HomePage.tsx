import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

import heroImg from '../assets/hero.png';
import calendarImg from '../assets/calendar.png';
import placeImg from '../assets/place.png';
import ticketImg from '../assets/ticket.png';

interface Concert {
  id: number;
  access_code: string; 
  name: string;
  show_date: string;
  venue: string;
  layout_image_url?: string;
  is_active: boolean;
}

export default function HomePage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const { data } = await api.get('/api/concerts/list');
        setConcerts(data || []);
      } catch (err: any) { 
        console.error("Failed to load concerts");
      }
    };
    fetchConcerts();
  }, []);

  return (
    <div className="w-full overflow-x-hidden bg-bg-main pb-20">
      {/* Premium Hero Banner - Full Width */}
      <div className="relative bg-linear-to-br from-indigo-900 via-purple-900 to-black text-white overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-brand rounded-full blur-[120px] mix-blend-screen"></div>
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
            <div className="relative w-64 md:w-80 lg:w-100">
              <div className="absolute inset-0 bg-linear-to-t from-brand to-purple-500 rounded-full blur-3xl opacity-40 animate-pulse"></div>
              <img src={heroImg} alt="Hero" className="w-full h-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Concerts Grid Section - Full Width Container */}
      <div className="w-full px-6 lg:px-12 2xl:px-20 mt-16 md:mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-brand/10 rounded-2xl">
            <img src={ticketImg} className="w-6 h-6 object-contain dark:invert" alt="Concerts" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-text-main tracking-tight">
            คอนเสิร์ตเร็วๆ นี้
          </h2>
        </div>
        
        {concerts.length === 0 ? (
          <div className="text-center py-20 bg-bg-card rounded-3xl shadow-sm border border-outline">
            <img src={calendarImg} className="w-16 h-16 mx-auto opacity-30 dark:invert mb-4" alt="Empty" />
            <p className="text-text-sub font-bold text-lg">ยังไม่มีคอนเสิร์ตในระบบขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {concerts.map(c => (
              <div key={c.id} className={`group bg-bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden border border-outline flex flex-col h-full transition-all duration-300 ${!c.is_active ? 'opacity-70 grayscale' : 'hover:shadow-2xl hover:shadow-brand/10 hover:-translate-y-2 hover:border-brand/30'}`}>
                
                {/* Image Cover */}
                <div className="h-56 bg-bg-main relative overflow-hidden">
                  {c.layout_image_url ? 
                    <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : 
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"><span className="text-text-sub font-bold">No Image</span></div>
                  }
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    {c.is_active ? (
                      <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur text-brand text-xs font-black px-4 py-1.5 rounded-full shadow-lg">เปิดจองแล้ว</span>
                    ) : (
                      <span className="bg-black/80 backdrop-blur text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">Coming Soon</span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-4 text-text-main leading-snug line-clamp-2">{c.name}</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-text-sub text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mr-3 shrink-0">
                        <img src={calendarImg} alt="Date" className="w-4 h-4 object-contain opacity-70 dark:invert" />
                      </div>
                      <span>{new Date(c.show_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.</span>
                    </div>
                    
                    <div className="flex items-center text-text-sub text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mr-3 shrink-0">
                        <img src={placeImg} alt="Venue" className="w-4 h-4 object-contain opacity-70 dark:invert" />
                      </div>
                      <span className="truncate">{c.venue}</span>
                    </div>
                  </div>
                  
                  {/* Button */}
                  <div className="mt-auto pt-4 border-t border-outline">
                    {c.is_active ? (
                      <Link to={`/concerts/${c.access_code}`} className="flex justify-center items-center w-full bg-bg-main group-hover:bg-brand text-text-main group-hover:text-white font-bold py-3.5 rounded-xl transition-all duration-300">
                        ดูรายละเอียด & จองตั๋ว
                      </Link>
                    ) : (
                      <button disabled className="w-full bg-bg-main text-text-sub font-bold py-3.5 rounded-xl cursor-not-allowed border border-outline border-dashed">
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
    </div>
  );
}