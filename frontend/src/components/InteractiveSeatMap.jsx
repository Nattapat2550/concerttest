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

  // ใช้ Ref จัดการ Drag ช่วยแยกแยะการคลิก กับ การลาก ได้แม่นยำ ไม่ดีเลย์
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const scaleRef = useRef(1);
  const wrapperRef = useRef(null);
  const svgContainerRef = useRef(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ระบบ Zoom ที่ไม่กวน Scroll ของหน้าเว็บ
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

  // วาดและลงสีที่นั่ง (เพิ่ม selectedSeat ใน useEffect เพื่อให้สีเปลี่ยนแน่นอน 100%)
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;

    const seats = svgContainerRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];

      seat.style.transition = 'transform 0.15s ease, filter 0.15s ease';
      seat.style.transformOrigin = 'center';

      if (!config) {
        seat.style.opacity = '0';
        seat.style.pointerEvents = 'none';
        seat.setAttribute('data-status', 'hidden');
        return;
      }

      const isBooked = bookedSeats.includes(seatId);
      const isSelected = selectedSeat?.seat_code === seatId;
      
      seat.style.pointerEvents = 'auto'; // มั่นใจว่าเปิดรับการคลิก

      if (isBooked) {
        seat.style.fill = '#475569'; // สีเทา
        seat.style.opacity = '0.3';
        seat.style.cursor = 'not-allowed';
        seat.style.stroke = 'none';
        seat.style.transform = 'scale(1)';
        seat.setAttribute('data-status', 'booked');
      } else {
        // ลงสีสถานะ "กำลังเลือก" โดยตรง ทับ Inline style ทั้งหมด
        seat.style.fill = isSelected ? '#ffffff' : (config.color || '#cccccc');
        seat.style.stroke = isSelected ? '#ef4444' : 'none';
        seat.style.strokeWidth = isSelected ? '3px' : '0';
        seat.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
        seat.style.opacity = '1';
        seat.style.cursor = 'pointer';
        seat.setAttribute('data-status', 'available');
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  // --- จัดการ Mouse Events บนแผนที่ ---
  const handleMouseDown = (e) => {
    dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    setMapStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.startX) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // เพิ่มระยะ Threshold เป็น 5px (ถ้ามือสั่นตอนคลิกนิดหน่อย จะยังถือว่าเป็นการคลิก)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isDragging = true;
      setPosition({ x: mapStart.x + dx, y: mapStart.y + dy });
    }
  };

  const handleMouseUp = (e) => {
    if (!dragRef.current.startX) return;

    // ถ้าไม่ได้ขยับเมาส์เลย (หรือขยับน้อยมาก) = ผู้ใช้ตั้งใจ "คลิก" ที่นั่ง
    if (!dragRef.current.isDragging) {
      handleSeatClick(e);
    }

    dragRef.current = { isDragging: false, startX: 0, startY: 0 };
  };

  const handleSeatClick = (e) => {
    // e.target.closest ช่วยดักจับกรณีผู้ใช้คลิกโดนเส้นหรือรูปทรงข้างในแท็ก <g class="seat">
    const seatEl = e.target.closest('.seat');
    if (!seatEl) return;

    const status = seatEl.getAttribute('data-status');
    if (status === 'available') {
      const seatId = seatEl.getAttribute('id');
      const config = configuredSeats.find(s => s.seat_code === seatId);
      if (config) {
        onSeatSelect(config);
      }
    }
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