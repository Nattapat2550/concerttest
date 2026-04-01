import React, { useEffect, useRef, useState, useMemo } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  selectedSeat = null, // รองรับทั้ง Object 1 ตัว หรือ Array ของ Object (สำหรับแอดมิน)
  onSeatSelect,
  onZoneSelect, // ฟังก์ชันใหม่สำหรับเมื่อมีการคลิกโซน
  mode = 'booking', // 'booking' (ผู้ใช้ทั่วไป) หรือ 'admin' (โหมดจัดที่นั่ง)
}) {
  const containerRef = useRef(null);
  const transformWrapperRef = useRef(null);
  const svgContainerRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);

  // States & Refs
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapStartX: 0, mapStartY: 0 });
  const propsRef = useRef({ configuredSeats, bookedSeats, selectedSeat, mode, onSeatSelect, onZoneSelect });
  
  // สำหรับระบบลากกล่องคลุมเลือกที่นั่ง (Lasso Tool)
  const [lasso, setLasso] = useState(null); 
  const lassoRef = useRef(null);

  // อัปเดต ref ทุกครั้งที่ props เปลี่ยน เพื่อใช้ใน Event Delegation แบบไม่ต้อง Re-bind
  useEffect(() => {
    propsRef.current = { configuredSeats, bookedSeats, selectedSeat, mode, onSeatSelect, onZoneSelect };
  }, [configuredSeats, bookedSeats, selectedSeat, mode, onSeatSelect, onZoneSelect]);

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  const generatedStyles = useMemo(() => {
    // แปลง selectedSeat ให้เป็น Array เสมอ เพื่อให้รองรับ Multi-selection
    const selectedArray = Array.isArray(selectedSeat) ? selectedSeat : (selectedSeat ? [selectedSeat] : []);
    const selectedCodes = new Set(selectedArray.map(s => s.seat_code));
    const bookedSeatCodes = new Set(bookedSeats);

    let css = `
      .svg-container { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .svg-container svg { width: 100% !important; height: 100% !important; object-fit: contain; max-height: 650px; pointer-events: auto; }
      .seat { transition: filter 0.1s ease, stroke 0.1s ease; cursor: pointer; transform-box: fill-box; pointer-events: auto; }
      .seat:hover { filter: brightness(1.4) saturate(1.5); stroke: #ffffff; stroke-width: 2px; }
      .zone { cursor: pointer; transition: opacity 0.2s ease; }
      .zone:hover { opacity: 0.8; stroke: #3b82f6; stroke-width: 2px; }
    `;

    // ซ่อนที่นั่งที่ยังไม่ได้คอนฟิกเฉพาะในโหมด Booking
    if (mode === 'booking') {
      css += `\n.seat { display: none !important; }`;
      configuredSeats.forEach(seat => {
        const safeId = seat.seat_code.replace(/(["\\])/g, '\\$1');
        css += `\n[id="${safeId}"] { display: block !important; }`;
      });
    }

    configuredSeats.forEach(seat => {
      const safeId = seat.seat_code.replace(/(["\\])/g, '\\$1');
      const isBooked = bookedSeatCodes.has(seat.seat_code);
      const isSelected = selectedCodes.has(seat.seat_code);

      if (isBooked && mode === 'booking') {
        css += `\n[id="${safeId}"] { fill: #475569 !important; opacity: 0.5 !important; pointer-events: none !important; cursor: not-allowed !important; stroke: none !important; }`;
      } else {
        if (seat.color) css += `\n[id="${safeId}"] { fill: ${seat.color} !important; }`;
        if (isSelected) {
          css += `\n[id="${safeId}"] { stroke: #ef4444 !important; stroke-width: 4px !important; filter: brightness(1.2) drop-shadow(0px 0px 4px rgba(239,68,68,0.8)); }`;
        }
      }
    });

    // แสดงขอบแดงให้ที่นั่งที่เพิ่งถูกคลุม (ยังไม่มีใน Config)
    if (mode === 'admin') {
      selectedArray.forEach(seat => {
        if (!configuredSeats.some(s => s.seat_code === seat.seat_code)) {
          const safeId = seat.seat_code.replace(/(["\\])/g, '\\$1');
          css += `\n[id="${safeId}"] { stroke: #ef4444 !important; stroke-width: 4px !important; filter: brightness(1.2); }`;
        }
      });
    }

    return css;
  }, [configuredSeats, bookedSeats, selectedSeat, mode]);

  // Event Delegation (ผูก Event ครั้งเดียวที่ตัวแม่ ลดการกระตุก ป้องกัน Event Bubbling)
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || !svgContent) return;

    // ป้องกันการ Drag ลากรูปภาพโดยไม่ตั้งใจ (แก้บัคคลุมภาพทั้งก้อน)
    const svgEl = container.querySelector('svg');
    if (svgEl) svgEl.setAttribute('draggable', 'false');

    const handleClick = (e) => {
      if (dragState.current.isDragging || lassoRef.current) return;
      const { configuredSeats, bookedSeats, mode, onSeatSelect, onZoneSelect } = propsRef.current;

      const seat = e.target.closest('.seat');
      const zone = e.target.closest('.zone');

      // 1. ถ้าคลิกโดนที่นั่งเดี่ยวๆ
      if (seat) {
        e.stopPropagation(); // หยุดไม่ให้คลิกทะลุไปโดนโซน
        const seatId = seat.getAttribute('id');
        if (!seatId) return;
        if (mode === 'booking' && bookedSeats.includes(seatId)) return;

        const config = configuredSeats.find(s => s.seat_code === seatId);
        if (onSeatSelect) {
          onSeatSelect(config || { seat_code: seatId, status: 'available' });
        }
        return;
      }

      // 2. ถ้าคลิกโดนโซน (แก้บัคจัดโซนไม่ได้)
      if (zone) {
        e.stopPropagation();
        const zoneId = zone.getAttribute('id');
        
        if (mode === 'admin' && onSeatSelect) {
          // ถ้าเป็น Admin ดึงที่นั่งทั้งหมดในโซนนี้มา Select พร้อมกันเลย!
          const seatsInZone = zone.querySelectorAll('.seat');
          const selectedGroup = [];
          seatsInZone.forEach(s => {
            const sId = s.getAttribute('id');
            if (sId) {
              const conf = configuredSeats.find(c => c.seat_code === sId);
              selectedGroup.push(conf || { seat_code: sId, status: 'available' });
            }
          });
          if (selectedGroup.length > 0) onSeatSelect(selectedGroup);
        }

        if (onZoneSelect && zoneId) onZoneSelect(zoneId);
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('touchend', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchend', handleClick);
    };
  }, [svgContent]); // ทำงานแค่ตอนโหลด SVG

  // ระบบ Zoom
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

  // ระบบ Pointer (Lasso Tool & Panning)
  const handlePointerDown = (e) => {
    // โหมดลากกล่องคลุม (ต้องอยู่โหมด Admin และกด Shift ค้าง)
    if (propsRef.current.mode === 'admin' && e.shiftKey) {
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setLasso({ x: startX, y: startY, w: 0, h: 0 });
      lassoRef.current = { startX, startY, clientStartX: e.clientX, clientStartY: e.clientY };
      return;
    }

    // โหมดขยับแผนที่
    if (transform.current.scale <= 1) return;
    dragState.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      mapStartX: transform.current.x,
      mapStartY: transform.current.y
    };
  };

  const handlePointerMove = (e) => {
    // วาดกล่องคลุม Lasso
    if (lassoRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const { startX, startY } = lassoRef.current;
      
      setLasso({
        x: Math.min(currentX, startX),
        y: Math.min(currentY, startY),
        w: Math.abs(currentX - startX),
        h: Math.abs(currentY - startY)
      });
      return;
    }

    // ขยับแผนที่
    if (transform.current.scale <= 1 || e.buttons !== 1) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      transform.current.x = dragState.current.mapStartX + dx;
      transform.current.y = dragState.current.mapStartY + dy;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    // คำนวณจุดตัดกล่อง Lasso (แก้บัคคลุมที่นั่ง)
    if (lassoRef.current) {
      const { configuredSeats, onSeatSelect } = propsRef.current;
      const lRect = {
        left: Math.min(lassoRef.current.clientStartX, e.clientX),
        top: Math.min(lassoRef.current.clientStartY, e.clientY),
        right: Math.max(lassoRef.current.clientStartX, e.clientX),
        bottom: Math.max(lassoRef.current.clientStartY, e.clientY),
      };

      const seats = svgContainerRef.current.querySelectorAll('.seat');
      const selectedGroup = [];

      seats.forEach(seat => {
        const sRect = seat.getBoundingClientRect();
        // เช็คว่ากรอบชนกันหรือไม่ (Intersection Math)
        if (!(lRect.right < sRect.left || lRect.left > sRect.right || lRect.bottom < sRect.top || lRect.top > sRect.bottom)) {
          const seatId = seat.getAttribute('id');
          if (seatId) {
            const conf = configuredSeats.find(s => s.seat_code === seatId);
            selectedGroup.push(conf || { seat_code: seatId, status: 'available' });
          }
        }
      });

      if (selectedGroup.length > 0 && onSeatSelect) onSeatSelect(selectedGroup);
      
      setLasso(null);
      setTimeout(() => { lassoRef.current = null; }, 50);
      return;
    }

    setTimeout(() => { dragState.current.isDragging = false; }, 50);
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

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
        <div className="flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
          <button onClick={handleZoomOut} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
          <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
          <button onClick={handleZoomIn} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
        </div>
        {mode === 'admin' && (
          <div className="bg-blue-500/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
            🛠 โหมดแอดมิน: กด <kbd className="bg-blue-700 px-1 rounded">Shift</kbd> ค้างไว้แล้วลากเพื่อคลุมที่นั่ง
          </div>
        )}
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      <div 
        ref={containerRef}
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-162.5 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* กล่องสีฟ้าสำหรับลากคลุม (Lasso) */}
        {lasso && (
          <div 
            className="absolute border-2 border-blue-400 bg-blue-400/20 z-50 pointer-events-none"
            style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }}
          />
        )}

        {configuredSeats.length === 0 && mode !== 'admin' ? (
          <div className="flex flex-col items-center justify-center absolute z-10 pointer-events-none">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง<br/>สำหรับคอนเสิร์ตนี้</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={transformWrapperRef}
            className="w-full h-full origin-center flex items-center justify-center"
          >
            <div 
              ref={svgContainerRef}
              className="svg-container w-full h-full flex items-center justify-center"
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