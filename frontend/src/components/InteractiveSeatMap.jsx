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
  const [showZoomHint, setShowZoomHint] = useState(false);

  // ใช้ Pointer Events แทน Mouse Events เพื่อให้รองรับทั้งเมาส์และทัชสกรีนได้ดีกว่า
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const wrapperRef = useRef(null);
  const scaleRef = useRef(1);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // --- 1. ระบบ ZOOM (แก้ปัญหาภาพขาด โดยยกเลิกการกั้นขอบที่ผิดพลาด) ---
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        const newScale = Math.min(Math.max(1, scaleRef.current + delta), 8);
        setScale(newScale);

        // ถ้าซูมออกสุด (สเกล 1) ให้เด้งกลับมาจุดศูนย์กลาง (X:0, Y:0) ทันที เพื่อไม่ให้เห็นพื้นหลัง
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  // --- 2. ระบบ DRAG (ลากแผนที่อิสระเมื่อซูมเท่านั้น) ---
  const handlePointerDown = (e) => {
    // ถ้าสเกล 1 ไม่อนุญาตให้ลาก (ล็อกแผนที่ไว้ตรงกลาง)
    if (scale === 1) return;
    dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY, lastX: position.x, lastY: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (scale === 1 || !e.buttons) return; // ทำงานเฉพาะตอนกดคลิกค้างและซูมอยู่
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.isDragging = true;
      setPosition({ x: dragRef.current.lastX + dx, y: dragRef.current.lastY + dy });
    }
  };

  const handlePointerUp = () => {
    setTimeout(() => { dragRef.current.isDragging = false; }, 50);
  };

  // --- 3. ระบบจัดการสถานะสี (ไม่มี OnClick ในนี้แล้ว) ---
  useEffect(() => {
    if (!wrapperRef.current || !svgContent) return;

    const seats = wrapperRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];

      if (!config) {
        seat.setAttribute('data-status', 'unavailable');
        return;
      }

      const isBooked = bookedSeats.includes(seatId);
      const isSelected = selectedSeat?.seat_code === seatId;

      if (config.color) seat.style.fill = config.color;

      if (isBooked) {
        seat.setAttribute('data-status', 'booked');
        seat.removeAttribute('data-selected');
      } else {
        seat.setAttribute('data-status', 'available');
        if (isSelected) {
          seat.setAttribute('data-selected', 'true');
          seat.parentNode.appendChild(seat); // เด้งที่นั่งที่เลือกมาไว้หน้าสุด
        } else {
          seat.removeAttribute('data-selected');
        }
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  // --- 4. ระบบกดจองที่นั่ง (🔥 โค้ดชุดนี้แก้ปัญหาจองไม่ติด 100%) ---
  const handleMapClick = (e) => {
    // 1. ถ้ากำลังลากแผนที่อยู่ จะไม่นับเป็นการคลิก
    if (dragRef.current.isDragging) return;

    // 2. ค้นหาว่าจุดที่คลิก เป็นชิ้นส่วนของ ".seat" หรือไม่
    const seatNode = e.target.closest('.seat');
    if (!seatNode) return; // ถ้าไม่ได้คลิกโดนที่นั่ง ให้ข้ามไป

    const seatId = seatNode.getAttribute('id');
    const status = seatNode.getAttribute('data-status');
    
    // 🔥 ตัวช่วย Debug: กด F12 ดู Console เลยว่ามันอ่าน ID ว่าอะไร
    console.log("👉 คลิกลงบนที่นั่ง ID ใน SVG คือ:", seatId, "| สถานะ:", status);

    if (status === 'unavailable' || status === 'booked') {
      console.log("❌ ที่นั่งนี้จองไม่ได้ หรือไม่มีในระบบ");
      return;
    }

    // 3. จับคู่ ID ที่คลิก กับ ข้อมูลใน Database
    const config = configuredSeats.find(s => s.seat_code === seatId);
    
    if (config) {
      console.log("✅ จองสำเร็จ! ส่งข้อมูลเข้าสู่ระบบ:", config);
      if (selectedSeat?.seat_code === seatId) {
        onSeatSelect(null); // กดย้ำที่เดิม = ยกเลิกการเลือก
      } else {
        onSeatSelect(config); // เลือกที่นั่งใหม่
      }
    } else {
      console.log("⚠️ หาที่นั่งไม่เจอในระบบ (Database ไม่มี seat_code นี้)");
    }
  };

  return (
    <div className="relative select-none">
      {/* ปุ่มควบคุม */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={() => {
          const newScale = Math.max(1, scale - 0.5);
          setScale(newScale);
          if (newScale === 1) setPosition({ x: 0, y: 0 });
        }} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
        <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
      </div>

      {/* ข้อความแนะนำ */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      {/* กรอบแสดงแผนที่ */}
      <div 
        ref={wrapperRef}
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleMapClick} // 🔥 รับ Event คลิกที่นี่ที่เดียว
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
            className="w-full h-full flex items-center justify-center pointer-events-none"
          >
            <div 
              className="origin-center w-full max-w-[1200px] pointer-events-auto"
              style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
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