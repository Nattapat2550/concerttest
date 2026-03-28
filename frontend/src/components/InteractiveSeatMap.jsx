import React, { useState, useEffect, useRef } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  selectedSeat = null,
  onSeatSelect
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mapStart, setMapStart] = useState({ x: 0, y: 0 });
  const [showZoomHint, setShowZoomHint] = useState(false);

  const dragRef = useRef({ isDragging: false, startX: null, startY: null });
  const scaleRef = useRef(1);
  const wrapperRef = useRef(null);
  const svgContainerRef = useRef(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // 🔴 ฟังก์ชันคำนวณจำกัดขอบเขตไม่ให้ลากหลุดแผนที่ (ล็อกให้อยู่ในกรอบ)
  const constrainPosition = (targetX, targetY, targetScale) => {
    // ถ้าสเกลเป็น 1 จะไม่มีการลาก บังคับให้แผนที่อยู่ตรงกลางเป๊ะๆ ไม่เห็นพื้นหลัง
    if (targetScale <= 1) return { x: 0, y: 0 };

    const wrapper = wrapperRef.current;
    if (!wrapper) return { x: targetX, y: targetY };

    // คำนวณขอบเขตสูงสุดที่อนุญาตให้ลากได้โดยอิงจากสเกลที่ถูกซูม
    const maxX = ((targetScale - 1) * wrapper.clientWidth) / 2;
    const maxY = ((targetScale - 1) * wrapper.clientHeight) / 2;

    return {
      x: Math.max(-maxX, Math.min(targetX, maxX)),
      y: Math.max(-maxY, Math.min(targetY, maxY)),
    };
  };

  // 🔴 ระบบ Zoom แผนที่ (ป้องกันซูมออกเกิน 1)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const scaleAdjust = e.deltaY * -0.002;
        // ปรับสเกลต่ำสุดเป็น 1 (แทนที่จะเป็น 0.5 ในรอบก่อน) เพื่อไม่ให้เห็นพื้นหลัง
        const newScale = Math.min(Math.max(1, scaleRef.current + scaleAdjust), 8);
        setScale(newScale);

        // ดึงแผนที่กลับเข้าขอบเขตทันที ป้องกันกรณีซูมออกแล้วขอบแผนที่ลอยหลุดเฟรม
        setPosition(prev => constrainPosition(prev.x, prev.y, newScale));
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;

    const seats = svgContainerRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];
      
      seat.onclick = null;

      if (!config) {
        seat.setAttribute('data-status', 'unavailable');
        return;
      }

      const isBooked = bookedSeats.includes(seatId);
      const isSelected = selectedSeat?.seat_code === seatId;

      if (config.color) {
        seat.style.fill = config.color;
      }

      if (isBooked) {
        seat.setAttribute('data-status', 'booked');
        seat.removeAttribute('data-selected');
      } else {
        seat.setAttribute('data-status', 'available');
        
        if (isSelected) {
          seat.setAttribute('data-selected', 'true');
          seat.parentNode.appendChild(seat);
        } else {
          seat.removeAttribute('data-selected');
        }
      }

      seat.onclick = (e) => {
        if (dragRef.current.isDragging) return;
        e.stopPropagation();
        
        if (selectedSeat?.seat_code === config.seat_code) {
          onSeatSelect(null);
        } else {
          onSeatSelect(config);
        }
      };
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat, onSeatSelect]);

  const handleMouseDown = (e) => {
    dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    setMapStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e) => {
    if (dragRef.current.startX === null) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isDragging = true;
      // 🔴 เอา constrainPosition มาล็อกตอนลากเมาส์ ไม่ให้ไถลหลุดกรอบ
      setPosition(constrainPosition(mapStart.x + dx, mapStart.y + dy, scaleRef.current));
    }
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      dragRef.current = { isDragging: false, startX: null, startY: null };
    }, 50);
  };

  // ปุ่มกดซูมเข้า-ออก (ปรับจูนขอบเขตให้ด้วย)
  const handleZoomOut = () => {
    const newScale = Math.max(1, scale - 0.5);
    setScale(newScale);
    setPosition(prev => constrainPosition(prev.x, prev.y, newScale));
  };

  const handleZoomIn = () => {
    setScale(s => Math.min(8, s + 0.5));
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={handleZoomOut} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
        <button onClick={handleZoomIn} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      <div 
        ref={wrapperRef}
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <style>
          {`
            .seat {
              transition: transform 0.15s ease, filter 0.15s ease, stroke 0.15s ease;
              transform-origin: center;
              transform-box: fill-box;
            }
            .seat[data-status="unavailable"] { display: none !important; }
            .seat[data-status="available"] { opacity: 1; cursor: pointer; pointer-events: auto; }
            .seat[data-status="available"]:not([data-selected="true"]):hover {
              filter: brightness(1.2);
              transform: scale(1.15) !important;
            }
            .seat[data-selected="true"] {
              stroke: #ef4444 !important;
              stroke-width: 4px !important;
              transform: scale(1.25) !important;
              filter: drop-shadow(0px 0px 4px rgba(239, 68, 68, 0.6));
            }
            .seat[data-status="booked"] {
              fill: #9ca3af !important;
              opacity: 0.4 !important;
              cursor: not-allowed !important;
              pointer-events: none !important;
              stroke: none !important;
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
            className="absolute origin-center w-full max-w-[1200px]"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          >
            <div 
              ref={svgContainerRef}
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
          </div>
        ) : (
          <p className="text-gray-400 font-bold text-xl">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}