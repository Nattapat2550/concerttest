import React, { useState, useEffect, useRef } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats,
  bookedSeats,
  selectedSeat,
  onSeatSelect
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mapStart, setMapStart] = useState({ x: 0, y: 0 });
  const [showZoomHint, setShowZoomHint] = useState(false);

  // ใช้ ref ตัวเดียวคุมทั้งการลากและการคลิก
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const scaleRef = useRef(1);
  const wrapperRef = useRef(null);
  const svgContainerRef = useRef(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ระบบ Zoom
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const scaleAdjust = e.deltaY * -0.002;
        const newScale = Math.min(Math.max(0.5, scaleRef.current + scaleAdjust), 8);
        setScale(newScale);
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  // วาดสีที่นั่ง (สีคงเดิม เพิ่มแค่ขอบแดงเวลาถูกเลือก)
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;

    const seats = svgContainerRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];

      seat.style.transition = 'transform 0.15s ease, filter 0.15s ease, stroke 0.15s ease';
      seat.style.transformOrigin = 'center';
      
      // ล้าง event เดิมทิ้ง ป้องกันบัคกดไม่ได้
      seat.onclick = null;
      seat.onmouseenter = null;
      seat.onmouseleave = null;

      if (!config) {
        seat.style.opacity = '0';
        seat.style.pointerEvents = 'none';
        return;
      }

      const isBooked = bookedSeats.includes(seatId);
      const isSelected = selectedSeat?.seat_code === seatId;

      if (isBooked) {
        // สถานะ: ถูกจองแล้ว (เทา/ทึบ)
        seat.setAttribute('data-status', 'booked');
        seat.style.fill = '#475569'; 
        seat.style.opacity = '0.3';
        seat.style.cursor = 'not-allowed';
        seat.style.stroke = 'none';
        seat.style.transform = 'scale(1)';
        seat.style.pointerEvents = 'none'; // ป้องกันการคลิกซ้ำ
      } else {
        // สถานะ: ว่าง / กำลังเลือก
        seat.setAttribute('data-status', 'available');
        seat.style.pointerEvents = 'auto';
        
        // **ใช้สีเดิมของโซน** หรือถ้าไม่มีให้ปล่อยว่างเพื่อให้ใช้สีจาก SVG โดยตรง ไม่ใส่สีเทาทับ
        if (config.color) {
          seat.style.fill = config.color;
        } else {
          seat.style.fill = ''; 
        }
        
        seat.style.opacity = '1';
        seat.style.cursor = 'pointer';

        if (isSelected) {
          // ถ้าถูกคลิกเลือก -> สียังคงเดิม แต่ใส่เส้นขอบสีแดงหนาๆ + ขยายใหญ่ขึ้น
          seat.style.stroke = '#ef4444'; 
          seat.style.strokeWidth = '4px';
          seat.style.transform = 'scale(1.2)';
        } else {
          seat.style.stroke = 'none';
          seat.style.strokeWidth = '0';
          seat.style.transform = 'scale(1)';
        }
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  // ระบบเช็ค การลาก vs การคลิก (แม่นยำ 100%)
  const handleMouseDown = (e) => {
    dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    setMapStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.startX) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // ถ้าเมาส์ขยับเกิน 5px ให้นับว่าเป็นการ "ลากแผนที่"
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isDragging = true;
      setPosition({ x: mapStart.x + dx, y: mapStart.y + dy });
    }
  };

  const handleMouseUp = (e) => {
    if (!dragRef.current.startX) return;

    // ถ้านี่ไม่ใช่การลาก = ผู้ใช้ตั้งใจ "คลิก"
    if (!dragRef.current.isDragging) {
      // ค้นหาที่นั่งที่ถูกคลิก
      const seatEl = e.target.closest('.seat');
      if (seatEl) {
        const status = seatEl.getAttribute('data-status');
        if (status === 'available') {
          const seatId = seatEl.getAttribute('id');
          const config = configuredSeats.find(s => s.seat_code === seatId);
          if (config) {
            onSeatSelect(config); // สั่งจองที่นั่งส่งไปอัปเดตข้างนอก
          }
        }
      }
    }

    // เคลียร์ค่าเมาส์
    dragRef.current = { isDragging: false, startX: 0, startY: 0 };
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300">-</button>
        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300">RESET</button>
        <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300">+</button>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      <div 
        ref={wrapperRef}
        className="bg-gray-50 dark:bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <style>
          {`
            /* เพิ่มลูกเล่นเวลาเอาเมาส์ชี้เฉพาะที่นั่งที่ว่าง */
            .seat[data-status="available"]:hover {
              filter: brightness(1.2);
              transform: scale(1.15) !important;
            }
          `}
        </style>

        {configuredSeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง<br/>สำหรับคอนเสิร์ตนี้</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={svgContainerRef}
            className="absolute origin-center w-full max-w-[1200px]"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <p className="text-gray-400 font-bold text-xl">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}