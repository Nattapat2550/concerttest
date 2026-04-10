import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// นำเข้ารูปภาพประกอบจาก assets
import heroImg from '../assets/hero.png';
import calendarImg from '../assets/calendar.png';
import placeImg from '../assets/place.png';

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
    <div className="pb-10 w-full overflow-x-hidden bg-bg-main">
      {/* ปรับสี Banner โดยใช้ bg-brand จากธีม และนำรูป heroImg มาใช้ตกแต่ง */}
      <div className="bg-brand text-white shadow-inner relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left z-10 mb-6 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 wrap-break-word">ยินดีต้อนรับสู่ ConcertTick</h1>
            <p className="text-base md:text-lg">เลือกระบุที่นั่งและจองตั๋วคอนเสิร์ตที่คุณชื่นชอบ</p>
          </div>
          <div className="z-10 w-48 md:w-64">
            <img src={heroImg} alt="ConcertTick Hero" className="w-full h-auto drop-shadow-xl" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto mt-8 md:mt-10 px-4 sm:px-6">
        <h2 className="text-xl md:text-2xl font-bold text-text-main border-b border-outline pb-2 mb-6">
          คอนเสิร์ตเร็วๆ นี้
        </h2>
        
        {concerts.length === 0 ? (
          <div className="text-center p-8 md:p-10 bg-bg-card rounded-lg shadow border border-outline mx-2">
            <p className="text-text-sub">ยังไม่มีคอนเสิร์ตในระบบ (Admin กำลังเพิ่มข้อมูล)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {concerts.map(c => (
              <div key={c.id} className={`bg-bg-card rounded-lg shadow-md overflow-hidden border border-outline transition flex flex-col h-full ${!c.is_active ? 'opacity-60 grayscale' : 'hover:shadow-lg hover:border-brand'}`}>
                <div className="h-48 bg-bg-main flex items-center justify-center shrink-0 relative border-b border-outline">
                  {c.layout_image_url ? 
                    <img src={c.layout_image_url} alt="Cover" className="w-full h-full object-cover"/> : 
                    <span className="text-text-sub text-sm">ไม่มีรูปภาพประกอบ</span>
                  }
                  {!c.is_active && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                       <span className="text-white font-bold text-xl tracking-widest uppercase bg-black bg-opacity-70 px-4 py-2 rounded">Coming Soon</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg md:text-xl font-bold mb-3 text-text-main wrap-break-word line-clamp-2">{c.name}</h3>
                  
                  {/* เปลี่ยนเป็นรูปภาพแทน Emoji */}
                  <div className="flex items-center text-text-sub text-sm mb-2">
                    <img src={calendarImg} alt="Date" className="w-4 h-4 mr-2 object-contain" />
                    <span>{new Date(c.show_date).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center text-text-sub text-sm mb-4">
                    <img src={placeImg} alt="Venue" className="w-4 h-4 mr-2 object-contain" />
                    <span className="truncate">{c.venue}</span>
                  </div>
                  
                  <div className="mt-auto pt-2">
                    {c.is_active ? (
                      <Link to={`/concerts/${c.access_code}/book`} className="block text-center w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-hover transition active:scale-95 shadow-md">
                        เลือกระบุที่นั่ง
                      </Link>
                    ) : (
                      <button disabled className="w-full bg-bg-main text-text-sub font-bold py-3 rounded-lg cursor-not-allowed border border-outline">
                        ยังไม่เปิดให้จอง
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