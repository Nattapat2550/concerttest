import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import DOMPurify from 'dompurify';

import calendarImg from '../assets/calendar.png';
import placeImg from '../assets/place.png';
import ticketImg from '../assets/ticket.png';

interface ConcertDetail {
  id: number;
  access_code: string;
  name: string;
  description: string;
  layout_image_url: string; // แก้ชื่อให้ตรงกับ Backend
  show_date: string;
  venue_name: string;
  ticket_price: number;
  is_active: boolean;
}

export default function ConcertDetailsPage() {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcert = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${accessCode}`);
        // [จุดที่แก้] ต้องดึง data.concert เพราะ API ห่อข้อมูลมาในชื่อนี้
        setConcert(data.concert); 
      } catch (err) {
        console.error("Failed to fetch concert details");
        alert("ไม่พบข้อมูลคอนเสิร์ตนี้");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchConcert();
  }, [accessCode, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] bg-bg-main">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand mb-4"></div>
        <p className="text-text-sub font-bold animate-pulse">กำลังโหลดข้อมูลคอนเสิร์ต...</p>
      </div>
    );
  }
  
  if (!concert) return null;

  const safeHTML = DOMPurify.sanitize(concert.description || '<p className="text-center text-gray-500 my-10">เตรียมพบกับรายละเอียดความสนุกเร็วๆ นี้</p>', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'img', 'iframe', 'br', 'ul', 'ol', 'li', 'span', 'div', 'u', 's', 'blockquote'],
    ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'target', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'rel', 'title']
  });

  return (
    <div className="bg-bg-main min-h-screen pb-32 relative selection:bg-brand selection:text-white">
      
      <div className="relative w-full h-[40vh] md:h-[50vh] bg-black overflow-hidden group">
        {concert.layout_image_url ? (
          <>
            <img 
              src={concert.layout_image_url} 
              alt={concert.name} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700 ease-in-out blur-sm scale-110" 
            />
            <div className="absolute inset-0 bg-linear-to-t from-bg-main via-transparent to-black/30"></div>
            <div className="absolute inset-0 flex justify-center items-center p-4">
              <img 
                 src={concert.layout_image_url} 
                 alt={concert.name} 
                 className="max-h-full max-w-full rounded-lg shadow-2xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-linear-to-r from-brand to-purple-900 opacity-80"></div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 md:-mt-32 relative z-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-10 border border-gray-100 dark:border-gray-700 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
          
          <h1 className="text-3xl md:text-5xl font-black mb-6 text-center text-gray-900 dark:text-white leading-tight bg-clip-text bg-linear-to-r from-brand to-purple-600">
            {concert.name}
          </h1>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-10 pb-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-300 font-medium bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-full">
              <img src={calendarImg} alt="Date" className="w-5 h-5 mr-3 object-contain opacity-70" />
              <span>{new Date(concert.show_date).toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' })} น.</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-300 font-medium bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-full">
              <img src={placeImg} alt="Venue" className="w-5 h-5 mr-3 object-contain opacity-70" />
              <span>{concert.venue_name || 'รอประกาศสถานที่'}</span>
            </div>
          </div>

          <div 
            className="prose prose-lg md:prose-xl max-w-none dark:prose-invert 
                       prose-headings:font-bold prose-headings:text-brand
                       prose-a:text-blue-600 hover:prose-a:text-blue-500
                       prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto prose-img:my-8
                       prose-iframe:w-full prose-iframe:aspect-video prose-iframe:rounded-xl prose-iframe:shadow-lg"
            dangerouslySetInnerHTML={{ __html: safeHTML }} 
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-50 animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="hidden sm:block text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">{concert.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">เริ่มต้น ฿{concert.ticket_price?.toLocaleString() || '0'}</p>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            {concert.is_active ? (
              <Link 
                to={`/concerts/${concert.access_code}/book`} 
                className="flex items-center justify-center w-full sm:w-auto bg-linear-to-r from-brand to-purple-600 hover:from-brand-hover hover:to-purple-700 text-white font-black text-lg py-3 px-10 rounded-full shadow-lg hover:shadow-brand/50 transform transition hover:-translate-y-1 active:scale-95"
              >
                <img src={ticketImg} alt="Ticket" className="w-6 h-6 mr-3 brightness-0 invert object-contain" />
                ซื้อบัตรเลย
              </Link>
            ) : (
              <button 
                disabled 
                className="flex items-center justify-center w-full sm:w-auto bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-black text-lg py-3 px-10 rounded-full cursor-not-allowed border border-gray-400 border-dashed"
              >
                ยังไม่เปิดจำหน่าย
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}