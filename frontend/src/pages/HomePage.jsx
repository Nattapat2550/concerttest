import React, { useEffect, useState } from 'react';
import api from '../services/api';

const HomePage = () => {
  const [me, setMe] = useState(null);
  const [content, setContent] = useState({});
  const [carousel, setCarousel] = useState([]);
  const [index, setIndex] = useState(0);
  const [msg, setMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // เพิ่ม Loading state

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [meRes, contentRes, carouselRes] = await Promise.all([
          api.get('/api/users/me'),
          api.get('/api/homepage'),
          api.get('/api/carousel')
        ]);

        if (cancelled) return;

        setMe(meRes.data || null);

        const map = {};
        (contentRes.data || []).forEach((c) => {
          map[c.section_name] = c.content;
        });
        setContent(map);

        setCarousel(carouselRes.data || []);
      } catch (err) {
        if (!cancelled) {
          setMsg(
            err.response?.data?.error ||
              'Failed to load home data'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCarousel = carousel && carousel.length > 0;
  
  // ป้องกัน index หลุดขอบเขต
  const safeIndex = hasCarousel
    ? ((index % carousel.length) + carousel.length) % carousel.length
    : 0;
    
  const currentItem = hasCarousel ? carousel[safeIndex] : null;

  const go = (delta) => {
    if (!hasCarousel) return;
    setIndex((prev) => {
      const newIndex = prev + delta;
      return ((newIndex % carousel.length) + carousel.length) % carousel.length;
    });
  };

  const goto = (i) => {
    if (!hasCarousel) return;
    setIndex(i);
  };

  const welcomeHeader =
    content.welcome_header ||
    (me
      ? `Welcome, ${me.username || me.email}`
      : 'Welcome');
      
  const mainParagraph =
    content.main_paragraph ||
    'This is your dashboard.';

  // แสดงหน้าโหลดข้อมูลถ้า API ยังดึงไม่เสร็จ
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      {/* --- Section: Carousel --- */}
      <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-gray-100 dark:bg-gray-800 aspect-video md:aspect-21/9 group">
        {/* Carousel Track */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${safeIndex * 100}%)`
          }}
        >
          {hasCarousel ? (
            carousel.map((item) => (
              <div
                className="w-full h-full shrink-0 relative flex items-center justify-center bg-gray-200 dark:bg-gray-900"
                key={item.id}
              >
                {item.image_dataurl ? (
                  <img
                    src={item.image_dataurl}
                    alt={item.title || 'Slide'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 font-medium">
                    ไม่มีรูปภาพ
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500">
                ไม่มีข้อมูลสไลด์
              </span>
            </div>
          )}
        </div>

        {/* Navigation Arrows (แสดงเมื่อมีสไลด์มากกว่า 1 และโฮเวอร์) */}
        {hasCarousel && carousel.length > 1 && (
          <>
            <button
              aria-label="รูปก่อนหน้า"
              title="< รูปก่อนหน้า"
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              aria-label="รูปถัดไป"
              title="> รูปถัดไป"
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Indicators (จุดไข่ปลา/รูปเล็ก) */}
        {hasCarousel && carousel.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/30 backdrop-blur-md rounded-full shadow-lg">
            {carousel.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`transition-all duration-300 rounded-md overflow-hidden border-2 ${
                  i === safeIndex
                    ? 'border-white scale-110 shadow-md w-10 h-6 md:w-16 md:h-10 opacity-100'
                    : 'border-transparent w-6 h-4 md:w-10 md:h-6 opacity-50 hover:opacity-100'
                }`}
                onClick={() => goto(i)}
              >
                {item.image_dataurl ? (
                  <img
                    src={item.image_dataurl}
                    alt={`Indicator ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-400"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Section: Caption Box --- */}
      {hasCarousel && currentItem && (
        <div className="mt-6 p-6 md:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {currentItem.title || 'Untitled'}
          </h3>
          {currentItem.subtitle && (
            <h5 className="text-sm md:text-base font-semibold text-blue-600 dark:text-blue-400 mb-4">
              {currentItem.subtitle}
            </h5>
          )}
          {currentItem.description && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {currentItem.description}
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="my-10 h-px bg-linear-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent w-full"></div>

      {/* --- Section: Content --- */}
      <div className="space-y-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {welcomeHeader}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
          {mainParagraph}
        </p>
      </div>

      {/* Error Message */}
      {msg && (
        <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r-lg">
          <p className="font-bold mb-1">พบข้อผิดพลาด:</p>
          <p>{msg}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;