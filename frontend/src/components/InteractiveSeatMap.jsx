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

  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapStartX: 0, mapStartY: 0, startTime: 0 });

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  // --- 1. ระบบ CSS (คงเดิม เพราะแก้ปัญหาสีหายได้ 100% แล้ว) ---
  const generatedStyles = useMemo(() => {
    let css = `
      .svg-container svg { width: 100% !important; height: 100% !important; object-fit: contain; max-height: 650px; }
      .seat { transition: filter 0.1s ease, stroke 0.1s ease; cursor: pointer; pointer-events: auto; transform-box: fill-box; }
      .seat:hover { filter: brightness(1.4); stroke: #ffffff; stroke-width: 2px; }
      .seat { display: none !important; }
    `;

    configuredSeats.forEach(seat => {
      const safeId = CSS.escape(seat.seat_code);
      const isBooked = bookedSeats.includes(seat.seat_code);
      const isSelected = selectedSeat?.seat_code === seat.seat_code;

      css += `\n#${safeId} { display: block !important; }`;

      if (isBooked) {
        css += `\n#${safeId} { fill: #475569 !important; opacity: 0.5 !important; pointer-events: none !important; cursor: not-allowed !important; stroke: none !important; }`;
      } else {
        if (seat.color) css += `\n#${safeId} { fill: ${seat.color} !important; }`;
        if (isSelected) {
          css += `\n#${safeId} { stroke: #ef4444 !important; stroke-width: 4px !important; filter: brightness(1.2) drop-shadow(0px 0px 4px rgba(239,68,68,0.8)); }`;
        }
      }
    });

    return css;
  }, [configuredSeats, bookedSeats, selectedSeat]);

  // --- 2. ระบบ Zoom ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = Math.max(1, Math.min(transform.current.scale + delta, 10));

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

  // --- 3. ระบบ Pointer (แก้บัคเรื่องเวลาคลิกที่นี่) ---
  const handlePointerDown = (e) => {
    // 🔴 แก้แล้ว: บันทึกค่าเสมอ ไม่ว่าสเกลจะเป็นเท่าไหร่ก็ตาม
    dragState.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      mapStartX: transform.current.x,
      mapStartY: transform.current.y,
      startTime: Date.now() // บันทึกเวลาเริ่มกดเมาส์
    };
    
    // ยึดเมาส์ไว้เฉพาะตอนซูม เพื่อให้ลากได้
    if (transform.current.scale > 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (transform.current.scale <= 1 || !e.buttons) return;
    
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      dragState.current.isDragging = true;
      transform.current.x = dragState.current.mapStartX + dx;
      transform.current.y = dragState.current.mapStartY + dy;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- 4. ระบบกดคลิก (ทำงานได้ 100% แล้ว) ---
  const handleMapClick = (e) => {
    const isDrag = dragState.current.isDragging;
    const clickDuration = Date.now() - dragState.current.startTime;

    console.log(`[Debug] เช็คการคลิก: ลากไหม?=${isDrag}, เวลากด=${clickDuration}ms`);

    // ถ้าลากอยู่ หรือกดแช่เกิน 400ms ให้ข้ามไป
    if (isDrag || clickDuration > 400) return;

    const seatNode = e.target.closest('.seat');
    if (!seatNode) return;

    const seatId = seatNode.getAttribute('id');
    console.log(`[Debug] กดโดนที่นั่ง ID: ${seatId}`);

    if (!seatId || bookedSeats.includes(seatId)) return;

    const config = configuredSeats.find(s => s.seat_code === seatId);
    if (config) {
      console.log(`[Debug] เจอในระบบ! ส่งคำสั่งจอง:`, config.seat_code);
      if (selectedSeat?.seat_code === seatId) {
        onSeatSelect(null);
      } else {
        onSeatSelect(config);
      }
    } else {
      console.warn(`[Debug] ❌ ไม่พบรหัส ${seatId} ใน Database`);
    }
  };

  const handleZoomIn = () => { transform.current.scale = Math.min(transform.current.scale + 0.5, 10); applyTransform(); };
  const handleZoomOut = () => { 
    transform.current.scale = Math.max(transform.current.scale - 0.5, 1); 
    if (transform.current.scale === 1) { transform.current.x = 0; transform.current.y = 0; }
    applyTransform(); 
  };
  const handleReset = () => { transform.current.scale = 1; transform.current.x = 0; transform.current.y = 0; applyTransform(); };

  return (
    <div className="relative select-none w-full">
      <style>{generatedStyles}</style>

      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={handleZoomOut} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
        <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
        <button onClick={handleZoomIn} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

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