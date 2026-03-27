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

  // ลงสีและจัดการ Event แบบฝังตรงเข้าที่นั่ง (แก้บัคคลิกไม่ติด 100%)
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
      
      // ล้าง Event เก่าทิ้งก่อน กันทำงานซ้อนกัน
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
      
      seat.style.pointerEvents = 'auto';

      if (isBooked) {
        // สถานะ: จองแล้ว (สีเทา)
        seat.style.fill = '#475569'; 
        seat.style.opacity = '0.3';
        seat.style.cursor = 'not-allowed';
        seat.style.stroke = 'none';
        seat.style.transform = 'scale(1)';
      } else {
        // สถานะ: ว่าง / กำลังเลือก
        // ให้สียังคงเดิม ไม่เปลี่ยนเป็นสีเทาหรือขาวตามที่ขอ
        seat.style.fill = config.color || '#cccccc';
        seat.style.opacity = '1';
        seat.style.cursor = 'pointer';
        
        if (isSelected) {
          // ถ้าเลือกอยู่ ให้ใช้สีเดิม แต่เพิ่มขอบแดงหนาๆ ตามแท็บล่าง
          seat.style.stroke = '#ef4444'; 
          seat.style.strokeWidth = '4px';
          seat.style.transform = 'scale(1.2)';
          seat.style.filter = 'none'; 
        } else {
          // ถ้ายังไม่ได้เลือก (ว่าง)
          seat.style.stroke = 'none';
          seat.style.strokeWidth = '0';
          seat.style.transform = 'scale(1)';
        }

        // JS Hover Effect (หลีกเลี่ยงการใช้ CSS เพื่อไม่ให้สไตล์ตีกัน)
        seat.onmouseenter = () => {
          if (!isSelected) {
            seat.style.filter = 'brightness(1.2)';
            seat.style.transform = 'scale(1.15)';
          }
        };
        seat.onmouseleave = () => {
          if (!isSelected) {
            seat.style.filter = 'none';
            seat.style.transform = 'scale(1)';
          }
        };

        // จับการคลิกตรงนี้ ชัวร์สุด
        seat.onclick = (e) => {
          e.stopPropagation();
          // ถ้าผู้ใช้กำลังลากแผนที่อยู่ จะไม่นับว่าเป็นการคลิกที่นั่ง
          if (dragRef.current.isDragging) return;
          onSeatSelect(config);
        };
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat, onSeatSelect]);

  // ระบบลากแผนที่
  const handleMouseDown = (e) => {
    dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    setMapStart({ x: position.x, y: position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.startX) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isDragging = true;
      setPosition({ x: mapStart.x + dx, y: mapStart.y + dy });
    }
  };

  const handleMouseUp = () => {
    // ดีเลย์เคลียร์สถานะ Drag นิดนึง เพื่อให้ Event onclick ข้างบนมีเวลาเช็คก่อน
    setTimeout(() => {
      dragRef.current = { isDragging: false, startX: 0, startY: 0 };
    }, 50);
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