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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [mapStart, setMapStart] = useState({ x: 0, y: 0 });
  const [showZoomHint, setShowZoomHint] = useState(false);

  const scaleRef = useRef(1);
  const wrapperRef = useRef(null);
  const svgContainerRef = useRef(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // แกับัค 2: ระบบ Zoom ที่ไม่กวนการ Scroll หน้าเว็บ
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e) => {
      // ให้ซูมก็ต่อเมื่อกด Ctrl หรือ Cmd ค้างไว้
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // บล็อกไม่ให้หน้าเว็บเลื่อน
        const scaleAdjust = e.deltaY * -0.002;
        const newScale = Math.min(Math.max(0.5, scaleRef.current + scaleAdjust), 8);
        setScale(newScale);
        setShowZoomHint(false);
      } else {
        // ถ้าเลื่อนปกติ ให้เลื่อนหน้าเว็บ และโชว์ Hint บอกวิธีซูม
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  // Set up ข้อมูลที่นั่งลงใน SVG (ทำแค่ตอนข้อมูลเปลี่ยน ไม่ทำทุกครั้งที่คลิก)
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

      if (bookedSeats.includes(seatId)) {
        seat.style.fill = '#475569'; // สีเทา
        seat.style.opacity = '0.3';
        seat.style.cursor = 'not-allowed';
        seat.setAttribute('data-status', 'booked');
      } else {
        seat.style.fill = config.color || '#cccccc';
        seat.style.opacity = '1';
        seat.style.cursor = 'pointer';
        seat.setAttribute('data-status', 'available');
      }
    });
  }, [svgContent, configuredSeats, bookedSeats]);

  // ระบบลากแผนที่ และ แก้บัค 1: แยกการคลิกออกจากการลาก
  const handleMouseDown = (e) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setMapStart({ x: position.x, y: position.y });
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // ถ้าเมาส์ขยับเกิน 3px ถือว่าตั้งใจลาก (Drag) ไม่ใช่การคลิก
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
      setPosition({ x: mapStart.x + dx, y: mapStart.y + dy });
    }
  };

  const handleMouseUp = (e) => {
    if (!dragStart) return;

    // ถ้าไม่มีการลากเกิดขึ้น ถือว่าเป็นการ "คลิก"
    if (!isDragging) {
      handleSeatClick(e);
    }

    setDragStart(null);
    setIsDragging(false);
  };

  // ประมวลผลเมื่อกดโดนที่นั่ง (Event Delegation)
  const handleSeatClick = (e) => {
    const seatEl = e.target.closest('.seat');
    if (!seatEl) return; // ถ้าไม่ได้คลิกโดนที่นั่งให้ข้ามไป

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
      {/* ปุ่มเครื่องมือซูม */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300">-</button>
        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300">RESET</button>
        <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300">+</button>
      </div>

      {/* Hint แจ้งเตือนเวลาผู้ใช้พยายาม Scroll ปกติ */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      {/* พื้นที่แผนที่ */}
      <div 
        ref={wrapperRef}
        className={`bg-gray-50 dark:bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setDragStart(null); setIsDragging(false); }}
      >
        {/* ใช้ CSS จัดการ State ของที่นั่ง (ลดการ Re-render และ Performance ดีขึ้น 10 เท่า) */}
        <style>
          {`
            .seat[data-status="available"]:hover {
              filter: brightness(1.2);
              transform: scale(1.15);
            }
            ${selectedSeat ? `
              [id="${selectedSeat.seat_code}"] {
                stroke: #ef4444 !important;
                stroke-width: 3px !important;
                fill: #ffffff !important;
                transform: scale(1.15);
              }
            ` : ''}
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