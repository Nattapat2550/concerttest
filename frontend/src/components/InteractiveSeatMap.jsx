import React, { useEffect, useRef, useState } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  mode = 'booking', // 'booking' หรือ 'admin'
  onSeatSelect,
  onZoneSelect,
}) {
  const containerRef = useRef(null);
  const transformWrapperRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [lasso, setLasso] = useState(null); 
  
  // Refs สำหรับการคำนวณพิกัดเพื่อป้องกัน Re-render
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapX: 0, mapY: 0 });
  const lassoRef = useRef({ active: false, startX: 0, startY: 0, clientStartX: 0, clientStartY: 0 });
  const seatElementsCache = useRef(new Map());

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  // 1. โหลด SVG และทำการ Smart Scan ตรวจจับที่นั่งแบบอัตโนมัติ
  useEffect(() => {
    const container = transformWrapperRef.current;
    if (!container || !svgContent) return;

    container.innerHTML = svgContent;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.maxHeight = '650px';
    svgEl.setAttribute('draggable', 'false');

    seatElementsCache.current.clear();

    // ดึงโหนดที่คาดว่าเป็น "ที่นั่ง" ทั้งหมด (ค้นหาคลาส .seat หรือ ดึงวงกลมทั้งหมด)
    let seats = Array.from(svgEl.querySelectorAll('.seat, .Seat'));
    if (seats.length === 0) {
       // Fallback กรณีไม่มีคลาส: เลือกวงกลมที่ขนาดไม่ใหญ่เกินไป (กันไปติดพื้นหลัง)
       seats = Array.from(svgEl.querySelectorAll('circle, rect')).filter(el => {
           const size = el.getAttribute('width') || el.getAttribute('r') * 2;
           if (size && parseFloat(size) > 200) return false;
           return true;
       });
    }

    seats.forEach((seat, idx) => {
      let id = seat.getAttribute('id');
      if (!id) {
        id = `seat-auto-${idx}`; // สร้าง ID ให้อัตโนมัติถ้าไม่มี
        seat.setAttribute('id', id);
      }
      seat.classList.add('smart-seat');
      seat.style.cursor = 'pointer';
      seat.style.transition = 'filter 0.1s ease, stroke 0.1s ease';
      seat.style.transformBox = 'fill-box';
      seat.style.transformOrigin = 'center';
      
      seatElementsCache.current.set(id, seat); // เก็บเข้า Cache เพื่อความเร็ว
    });

    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .smart-seat:hover { filter: brightness(1.4) saturate(1.5) !important; stroke: #ffffff !important; stroke-width: 2px !important; z-index: 10; }
      g[id] { cursor: pointer; }
      g[id]:hover > .smart-seat { stroke: #3b82f6 !important; stroke-width: 1.5px !important; }
    `;
    svgEl.appendChild(styleEl);

    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }, [svgContent]);

  // 2. การเทสีความเร็วสูง (Direct DOM Mutation) ป้องกันบราวเซอร์ค้าง
  useEffect(() => {
    if (seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    seatElementsCache.current.forEach((seatNode, seatId) => {
      const isConfigured = configuredMap.has(seatId);
      const isBooked = bookedSet.has(seatId);

      if (isConfigured) {
        seatNode.style.display = 'block';
        const config = configuredMap.get(seatId);
        
        if (mode === 'booking' && isBooked) {
          seatNode.style.fill = '#475569';
          seatNode.style.opacity = '0.5';
          seatNode.style.pointerEvents = 'none';
          seatNode.style.cursor = 'not-allowed';
          seatNode.style.stroke = 'none';
        } else {
          seatNode.style.fill = config.color || '#3b82f6';
          seatNode.style.opacity = '1';
          seatNode.style.pointerEvents = 'auto';
          seatNode.style.cursor = 'pointer';
          seatNode.style.stroke = 'none';
        }
      } else {
        if (mode === 'admin') {
          // โชว์ที่นั่งเปล่าๆ ให้แอดมินเห็น
          seatNode.style.display = 'block';
          seatNode.style.fill = '#e2e8f0';
          seatNode.style.opacity = '0.8';
          seatNode.style.pointerEvents = 'auto';
          seatNode.style.cursor = 'pointer';
          seatNode.style.stroke = 'none';
        } else {
          seatNode.style.display = 'none';
          seatNode.style.pointerEvents = 'none';
        }
      }
    });
  }, [configuredSeats, bookedSeats, mode]);

  // 3. Event Handling ตัดปัญหา Bubbling (คลิกทะลุกัน)
  useEffect(() => {
    const container = transformWrapperRef.current;
    if (!container) return;

    const handleClick = (e) => {
      if (dragState.current.isDragging || lassoRef.current.active) return;
      const target = e.target;
      
      const seat = target.closest('.smart-seat');
      if (seat) {
        e.stopPropagation();
        const seatId = seat.getAttribute('id');
        if (mode === 'booking' && bookedSeats.includes(seatId)) return;

        const config = configuredSeats.find(c => c.seat_code === seatId);
        if (onSeatSelect) onSeatSelect(config || { seat_code: seatId, status: 'available' });
        return;
      }

      // ตรวจสอบการคลิกเลือกโซน (Group)
      let node = target;
      while (node && node !== container && node.tagName !== 'svg') {
         if (node.tagName === 'g' || node.classList.contains('zone')) {
            e.stopPropagation();
            if (onZoneSelect && node.getAttribute('id')) onZoneSelect(node.getAttribute('id'));
            
            if (mode === 'admin' && onSeatSelect) {
               const seatsInZone = node.querySelectorAll('.smart-seat');
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
            break;
         }
         node = node.parentNode;
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('touchend', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchend', handleClick);
    };
  }, [configuredSeats, bookedSeats, mode, onSeatSelect, onZoneSelect]);

  // 4. ควบคุม Zoom, Pan, และ Lasso ลากคลุม
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = Math.max(0.5, Math.min(transform.current.scale + delta, 15));

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / transform.current.scale;
        transform.current.x = mouseX - (mouseX - transform.current.x) * scaleRatio;
        transform.current.y = mouseY - (mouseY - transform.current.y) * scaleRatio;
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

  const handlePointerDown = (e) => {
    if (mode === 'admin' && e.shiftKey) {
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      lassoRef.current = { active: true, startX, startY, clientStartX: e.clientX, clientStartY: e.clientY };
      setLasso({ x: startX, y: startY, w: 0, h: 0 });
      return;
    }

    dragState.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      mapX: transform.current.x,
      mapY: transform.current.y
    };
  };

  const handlePointerMove = (e) => {
    if (lassoRef.current.active) {
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

    if (e.buttons !== 1) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      transform.current.x = dragState.current.mapX + dx;
      transform.current.y = dragState.current.mapY + dy;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    if (lassoRef.current.active) {
      if (lasso && lasso.w > 5 && lasso.h > 5) {
        // คำนวณขอบเขตหน้าจอจริง
        const lRect = {
          left: Math.min(lassoRef.current.clientStartX, e.clientX),
          top: Math.min(lassoRef.current.clientStartY, e.clientY),
          right: Math.max(lassoRef.current.clientStartX, e.clientX),
          bottom: Math.max(lassoRef.current.clientStartY, e.clientY),
        };

        const selectedGroup = [];
        seatElementsCache.current.forEach((seatNode, seatId) => {
          if (seatNode.style.display === 'none') return; 
          const sRect = seatNode.getBoundingClientRect();
          // หา Intersection ของกล่อง (แก้บัคคลุมโดนพื้นหลัง)
          if (!(lRect.right < sRect.left || lRect.left > sRect.right || lRect.bottom < sRect.top || lRect.top > sRect.bottom)) {
            const conf = configuredSeats.find(c => c.seat_code === seatId);
            selectedGroup.push(conf || { seat_code: seatId, status: 'available' });
          }
        });

        if (selectedGroup.length > 0 && onSeatSelect) onSeatSelect(selectedGroup);
      }
      
      setLasso(null);
      setTimeout(() => { lassoRef.current.active = false; }, 50);
      return;
    }

    setTimeout(() => { dragState.current.isDragging = false; }, 50);
  };

  const handleZoom = (factor) => { 
    transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); 
    applyTransform(); 
  };
  const handleReset = () => { transform.current = { x: 0, y: 0, scale: 1 }; applyTransform(); };

  return (
    <div className="relative select-none w-full h-full min-h-125">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end pointer-events-none">
        <div className="flex gap-2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto border dark:border-gray-600">
          <button onClick={() => handleZoom(-0.5)} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
          <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
          <button onClick={() => handleZoom(0.5)} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
        </div>
        {mode === 'admin' && (
          <div className="bg-blue-600/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            🛠 กด <kbd className="bg-blue-800 px-1 py-0.5 rounded shadow-inner font-mono">Shift</kbd> ค้าง + ลากเพื่อคลุมพื้นที่
          </div>
        )}
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้าง + เลื่อนลูกกลิ้งเพื่อซูม
      </div>

      <div 
        ref={containerRef}
        className="bg-[#0f172a] rounded-xl border dark:border-gray-600 shadow-inner overflow-hidden relative w-full h-full min-h-150 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {lasso && (
          <div 
            className="absolute border-2 border-blue-400 bg-blue-400/30 z-50 pointer-events-none shadow-[0_0_10px_rgba(96,165,250,0.5)]"
            style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }}
          />
        )}

        {(!svgContent && mode !== 'admin') ? (
          <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none absolute">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={transformWrapperRef}
            className="w-full h-full origin-top-left flex items-center justify-center will-change-transform"
          />
        ) : (
          <div className="flex justify-center items-center w-full h-full absolute">
             <p className="text-gray-400 font-bold text-xl pointer-events-none">ไม่มีแผนผัง Interactive</p>
          </div>
        )}
      </div>
    </div>
  );
}