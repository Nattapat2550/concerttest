import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import DOMPurify from 'dompurify';

import calendarImg from '../assets/calendar.png';
import placeImg from '../assets/place.png';
import ticketImg from '../assets/ticket.png';
import waitImg from '../assets/wait.png';

interface ConcertDetail {
  id: number;
  access_code: string;
  name: string;
  description: string;
  layout_image_url: string; 
  show_date: string;
  venue_name: string;
  ticket_price: number;
  is_active: boolean;
}

const decodeHTMLEntities = (text: string) => {
  if (!text) return '';
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

export default function ConcertDetailsPage() {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcert = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${accessCode}`);
        setConcert(data.concert); 
      } catch (err) {
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
      <div className="flex flex-col justify-center items-center min-h-[80vh] bg-bg-main">
        <img src={waitImg} alt="Loading" className="w-16 h-16 animate-spin opacity-50 dark:invert mb-6" />
        <p className="text-text-sub font-bold text-lg tracking-widest animate-pulse">LOADING EXPERIENCE...</p>
      </div>
    );
  }
  
  if (!concert) return null;

  const rawHTML = concert.description ? decodeHTMLEntities(concert.description) : '<div class="text-center py-20 text-gray-500 font-bold text-lg border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">เตรียมพบกับรายละเอียดความสนุกเร็วๆ นี้</div>';
  const safeHTML = DOMPurify.sanitize(rawHTML, {
    ADD_TAGS: ['iframe', 'style'], 
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'class', 'target', 'style', 'width', 'height']
  });

  return (
    <div className="bg-bg-main min-h-screen pb-36 relative selection:bg-brand selection:text-white w-full">
      
      {/* Immersive Hero Cover */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-black overflow-hidden group">
        {concert.layout_image_url ? (
          <>
            <img 
              src={concert.layout_image_url} 
              alt="Background" 
              className="w-full h-full object-cover opacity-50 group-hover:opacity-40 group-hover:scale-105 transition-all duration-[2s] ease-out blur-xl scale-110" 
            />
            <div className="absolute inset-0 bg-linear-to-t from-bg-main via-bg-main/50 to-black/40"></div>
            <div className="absolute inset-0 flex justify-center items-center p-6 md:p-12 z-10 pt-20">
              <img 
                 src={concert.layout_image_url} 
                 alt={concert.name} 
                 className="max-h-full max-w-full rounded-2xl shadow-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10" 
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-linear-to-br from-indigo-900 via-brand to-purple-900 opacity-90"></div>
        )}
      </div>

      {/* Main Content Area - Wider & Premium */}
      <div className="w-full max-w-300 mx-auto px-4 sm:px-6 lg:px-8 -mt-16 md:-mt-24 relative z-20">
        <div className="bg-bg-card rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-none p-8 md:p-14 lg:p-16 border border-outline backdrop-blur-xl">
          
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand/10 text-brand font-black text-sm uppercase tracking-widest mb-6 border border-brand/20">
              Concert Detail
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-main leading-tight mb-8">
              {concert.name}
            </h1>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
              <div className="flex items-center text-text-main font-bold bg-bg-main border border-outline px-6 py-3.5 rounded-2xl shadow-sm">
                <img src={calendarImg} alt="Date" className="w-5 h-5 mr-3 object-contain opacity-70 dark:invert" />
                <span>{new Date(concert.show_date).toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' })} น.</span>
              </div>
              <div className="flex items-center text-text-main font-bold bg-bg-main border border-outline px-6 py-3.5 rounded-2xl shadow-sm">
                <img src={placeImg} alt="Venue" className="w-5 h-5 mr-3 object-contain opacity-70 dark:invert" />
                <span>{concert.venue_name || 'รอประกาศสถานที่'}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-outline mb-12"></div>

          {/* HTML Content */}
          <div 
            className="prose prose-lg md:prose-xl max-w-none dark:prose-invert 
                       prose-headings:font-black prose-headings:text-text-main prose-headings:tracking-tight
                       prose-a:text-brand hover:prose-a:text-brand-hover
                       prose-img:rounded-3xl prose-img:shadow-2xl prose-img:mx-auto prose-img:my-12 prose-img:border prose-img:border-outline
                       prose-iframe:w-full prose-iframe:aspect-video prose-iframe:rounded-3xl prose-iframe:shadow-2xl prose-iframe:my-10"
            dangerouslySetInnerHTML={{ __html: safeHTML }} 
          />
        </div>
      </div>

      {/* Sticky Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-bg-card/90 backdrop-blur-xl border-t border-outline shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 animate-fade-in-up">
        <div className="w-full max-w-360 mx-auto px-6 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="hidden sm:flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-bg-main border border-outline overflow-hidden shrink-0">
               {concert.layout_image_url && <img src={concert.layout_image_url} className="w-full h-full object-cover" alt="Thumb"/>}
            </div>
            <div>
              <h3 className="text-xl font-black text-text-main line-clamp-1 max-w-lg">{concert.name}</h3>
              <p className="text-text-sub font-bold mt-1">เริ่มต้น <span className="text-brand text-xl">฿{concert.ticket_price?.toLocaleString() || '0'}</span></p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto shrink-0 flex items-center gap-4">
            <div className="sm:hidden text-left flex-1">
               <p className="text-xs text-text-sub uppercase font-bold">ราคาเริ่มต้น</p>
               <p className="text-xl font-black text-brand">฿{concert.ticket_price?.toLocaleString() || '0'}</p>
            </div>
            {concert.is_active ? (
              <Link 
                to={`/concerts/${concert.access_code}/book`} 
                className="flex items-center justify-center bg-linear-to-r from-brand to-purple-600 hover:from-purple-600 hover:to-brand text-white font-black text-lg py-4 px-12 rounded-2xl shadow-xl shadow-brand/30 hover:shadow-brand/50 transform transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto"
              >
                <img src={ticketImg} alt="Ticket" className="w-6 h-6 mr-3 brightness-0 invert object-contain" />
                จองที่นั่งทันที
              </Link>
            ) : (
              <button disabled className="flex items-center justify-center bg-bg-main text-text-sub font-black text-lg py-4 px-12 rounded-2xl cursor-not-allowed border-2 border-outline border-dashed w-full sm:w-auto">
                <img src={waitImg} alt="Wait" className="w-6 h-6 mr-3 opacity-50 dark:invert object-contain" />
                ยังไม่เปิดจำหน่าย
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}