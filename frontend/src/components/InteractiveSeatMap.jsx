import React, { useEffect, useRef, useState, useMemo } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  selectedSeat = null,
  onSeatSelect
}) {
  const containerRef = useRef(null);
  const transformWrapperRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);

  // --- ระบบอ้างอิงตำแหน่ง (ไม่ใช้ State เพื่อลดอาการกระตุกและลดบักของ React) ---
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, startTime: 0 });

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  // --- 1. ระบบจัดการสีขั้นสูง (The Silver Bullet - แก้สีหาย 100%) ---
  // ใช้การสร้าง CSS Stylesheet ขึ้นมาคุมแทนการแก้ DOM สีจะไม่หายเวลาซูมหรือขยับ
  const generatedStyles = useMemo(() => {
    let css = `
      /* บังคับสเกล SVG ให้พอดีกล่องเป๊ะ ป้องกันภาพขาด */
      .svg-container svg { width: 100% !important; height: 100% !important; object-fit: contain; max-height: 650px; }
      
      /* ตั้งค่าเริ่มต้นของที่นั่ง */
      .seat { transition: filter 0.1s ease, stroke 0.1s ease; cursor: pointer; pointer-events: auto; transform-box: fill-box; }
      .seat:hover { filter: brightness(1.4); stroke: #ffffff; stroke-width: 2px; }
      
      /* ซ่อนที่นั่งทั้งหมดที่แอดมินยังไม่ได้ตั้งค่าในระบบ */
      .seat { display: none !important; }
    `;

    configuredSeats.forEach(seat => {
      // ป้องกัน Error กรณี ID ที่นั่งมีตัวอักษรพิเศษ (เช่น A-1, B/2)
      const safeId = CSS.escape(seat.seat_code);
      const isBooked = bookedSeats.includes(seat.seat_code);
      const isSelected = selectedSeat?.seat_code === seat.seat_code;

      // เปิดการมองเห็นให้ที่นั่งที่มีใน Database
      css += `\n#${safeId} { display: block !important; }`;

      if (isBooked) {
        // ที่นั่งถูกจองแล้ว (เทา + กดไม่ได้)
        css += `\n#${safeId} { fill: #475569 !important; opacity: 0.5 !important; pointer-events: none !important; cursor: not-allowed !important; stroke: none !important; }`;
      } else {
        // ที่นั่งว่าง ลงสีตามที่ตั้งค่าไว้
        if (seat.color) {
          css += `\n#${safeId} { fill: ${seat.color} !important; }`;
        }
        // ถ้าถูกเลือกอยู่ ให้เรืองแสงและมีขอบแดง
        if (isSelected) {
          css += `\n#${safeId} { stroke: #ef4444 !important; stroke-width: 4px !important; filter: brightness(1.2) drop-shadow(0px 0px 4px rgba(239,68,68,0.8)); }`;
        }
      }
    });

    return css;
  }, [configuredSeats, bookedSeats, selectedSeat]);

  // --- 2. ระบบซูมด้วย Scroll Mouse ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = transform.current.scale + delta;
        newScale = Math.max(1, Math.min(newScale, 10)); // ล็อกสเกล ต่ำสุด 1x, สูงสุด 10x

        // ถ้าซูมออกสุด บังคับภาพกลับมาตรงกลางเป๊ะๆ
        if (newScale === 1) {
          transform.current.x = 0;
          transform.current.y = 0;
        }
        
        transform.current.scale = newScale;
        applyTransform();
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // --- 3. ระบบลากแผนที่ (Pan) ---
  const handlePointerDown = (e) => {
    if (transform.current.scale <= 1) return; // ไม่ซูม ห้ามลาก
    dragState.current = {
      isDragging: false,
      startX: e.clientX - transform.current.x,
      startY: e.clientY - transform.current.y,
      startTime: Date.now() // เก็บเวลาที่เริ่มกด (สำคัญมาก ใช้แยกแยะการคลิก)
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (transform.current.scale <= 1 || !e.buttons) return;
    const newX = e.clientX - dragState.current.startX;
    const newY = e.clientY - dragState.current.startY;

    // ต้องขยับเมาส์เกิน 10px ถึงจะนับว่าลาก (เผื่อมือสั่นตอนกดจอง)
    if (Math.abs(newX - transform.current.x) > 10 || Math.abs(newY - transform.current.y) > 10) {
      dragState.current.isDragging = true;
      transform.current.x = newX;
      transform.current.y = newY;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- 4. ระบบกดคลิกเพื่อจอง (Bulletproof Click) ---
  const handleMapClick = (e) => {
    // กรองการคลิก vs การลาก แบบแม่นยำ
    const isDrag = dragState.current.isDragging;
    const clickDuration = Date.now() - dragState.current.startTime;
    
    // คืนค่า Drag กลับเป็น False
    dragState.current.isDragging = false;

    // ถ้าระบบตรวจพบว่าลากแผนที่อยู่ หรือกดเมาส์ค้างนานกว่า 300ms ให้ถือว่าไม่ได้คลิกจอง
    if (isDrag || clickDuration > 300) return;

    // หาชิ้นส่วนที่นั่งที่ถูกคลิก
    const seatNode = e.target.closest('.seat');
    if (!seatNode) return;

    const seatId = seatNode.getAttribute('id');
    if (!seatId) return;

    // ตรวจสอบข้อมูลเพื่อสั่งจอง
    const isBooked = bookedSeats.includes(seatId);
    if (isBooked) return;

    const config = configuredSeats.find(s => s.seat_code === seatId);
    if (config) {
      if (selectedSeat?.seat_code === seatId) {
        onSeatSelect(null); // กดย้ำที่เดิม = ยกเลิกการเลือก
      } else {
        onSeatSelect(config); // เลือกที่นั่งใหม่
      }
    }
  };

  // --- ควบคุมปุ่ม UI ---
  const handleZoomIn = () => { transform.current.scale = Math.min(transform.current.scale + 0.5, 10); applyTransform(); };
  const handleZoomOut = () => { 
    transform.current.scale = Math.max(transform.current.scale - 0.5, 1); 
    if (transform.current.scale === 1) { transform.current.x = 0; transform.current.y = 0; }
    applyTransform(); 
  };
  const handleReset = () => { transform.current.scale = 1; transform.current.x = 0; transform.current.y = 0; applyTransform(); };

  return (
    <div className="relative select-none w-full">
      {/* แทรก Style ที่ Gen มาเข้าไปตรงๆ React จะจัดการไม่ให้สีหาย */}
      <style>{generatedStyles}</style>

      {/* ปุ่มเครื่องมือขวาบน */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={handleZoomOut} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
        <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
        <button onClick={handleZoomIn} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
      </div>

      {/* คำแนะนำ Tooltip */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      {/* พื้นที่แผนที่หลัก */}
      <div 
        ref={containerRef}
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleMapClick}
      >
        {configuredSeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center absolute z-10 pointer-events-none">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง<br/>สำหรับคอนเสิร์ตนี้</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={transformWrapperRef}
            className="w-full h-full origin-center transition-transform duration-75 ease-out will-change-transform flex items-center justify-center"
          >
            <div 
              className="svg-container w-full h-full"
              dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
          </div>
        ) : (
          <p className="text-gray-400 font-bold text-xl absolute z-10 pointer-events-none">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}