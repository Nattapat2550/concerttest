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
  
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapX: 0, mapY: 0 });
  const lassoRef = useRef({ active: false, startX: 0, startY: 0, clientStartX: 0, clientStartY: 0 });
  const seatElementsCache = useRef(new Map());

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
      
      const svgEl = transformWrapperRef.current.querySelector('svg');
      if (svgEl) {
        // [ระบบ LOD] ซูม < 1.5 ให้ซ่อนเก้าอี้ เพื่อโชว์ภาพ Master SVG แบบเพียวๆ
        if (transform.current.scale < 1.5) {
          svgEl.classList.add('zoom-low');
          svgEl.classList.remove('zoom-high');
        } else {
          svgEl.classList.add('zoom-high');
          svgEl.classList.remove('zoom-low');
        }
      }
    }
  };

  // 1. สแกน SVG แบบแม่นยำสูง (กรองเอาเฉพาะเก้าอี้จริงๆ ป้องกันโซนเพี้ยนเป็นสีดำ)
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
    svgEl.classList.add(`mode-${mode}`);

    seatElementsCache.current.clear();

    // หากลุ่มเป้าหมายที่ "อาจจะ" เป็นเก้าอี้
    let seats = Array.from(svgEl.querySelectorAll('.seat, .Seat, [id*="seat" i], [class*="seat" i]'));
    
    // ถ้าไม่มี Class ระบุชัดเจน ให้ใช้ Native SVG getBBox() สแกนหา "รูปทรงขนาดเล็ก"
    if (seats.length === 0) {
        const candidates = svgEl.querySelectorAll('circle, ellipse, rect, polygon, path');
        seats = Array.from(candidates).filter(el => {
            try {
                const box = el.getBBox();
                // เงื่อนไขเหล็ก: ความกว้าง/ยาว ต้องไม่เกิน 60 หน่วย (ถ้าเกิน = โซน/ฉากหลัง ข้ามทันที!)
                return box.width > 0 && box.width <= 60 && box.height > 0 && box.height <= 60;
            } catch(e) { return false; }
        });
    }

    seats.forEach((seat, idx) => {
      let id = seat.getAttribute('id');
      if (!id) {
        id = `seat-auto-${idx}`;
        seat.setAttribute('id', id);
      }
      seat.classList.add('smart-seat');
      seat.style.cursor = 'pointer';
      seatElementsCache.current.set(id, seat);
    });

    const oldStyle = svgEl.querySelector('#seat-map-styles');
    if (oldStyle) oldStyle.remove();

    // สร้าง CSS ฉบับทะลวงทะลวงบังคับสี (แก้บัคสีดำ 100%)
    const styleEl = document.createElement('style');
    styleEl.id = 'seat-map-styles';
    styleEl.innerHTML = `
      .smart-seat { transition: opacity 0.3s ease, filter 0.1s ease; transform-box: fill-box; transform-origin: center; }
      
      /* บังคับยัดสีใส่ตัวเก้าอี้ และ "ลูก" ของมันทุกตัว (ทับสีดำเดิมของ SVG) */
      .smart-seat, .smart-seat * {
         fill: var(--seat-color) !important;
         stroke: none !important;
      }
      
      .smart-seat:hover, .smart-seat:hover * {
         filter: brightness(1.4) saturate(1.5) !important;
         stroke: #ffffff !important;
         stroke-width: 2px !important;
      }
      
      g[id] { cursor: pointer; }
      
      /* ควบคุมการแสดงผล LOD */
      svg.zoom-low .smart-seat { opacity: 0 !important; pointer-events: none !important; }
      svg.zoom-high .smart-seat { opacity: 1; pointer-events: auto; }
      
      /* โหมด Admin: ให้เห็นเก้าอี้ที่ยังไม่ได้ตั้งค่าเป็นสีเทา */
      svg.mode-admin .smart-seat.unconfigured, svg.mode-admin .smart-seat.unconfigured * {
         fill: #cbd5e1 !important;
         opacity: 0.6 !important;
      }
      
      /* โหมด User Booking: ซ่อนเก้าอี้ที่แอดมินยังไม่เปิดขาย */
      svg.mode-booking .smart-seat.unconfigured { display: none !important; }
      
      /* เก้าอี้ที่ถูกจองแล้ว */
      .smart-seat.booked, .smart-seat.booked * {
         fill: #475569 !important;
         opacity: 0.4 !important;
         pointer-events: none !important;
         cursor: not-allowed !important;
      }
    `;
    svgEl.appendChild(styleEl);

    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }, [svgContent, mode]);

  // 2. การเทสีด้วย CSS Variables (เบาเครื่อง และแก้บัคสีดำ)
  useEffect(() => {
    if (seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    seatElementsCache.current.forEach((seatNode, seatId) => {
      const isConfigured = configuredMap.has(seatId);
      const isBooked = bookedSet.has(seatId);

      seatNode.classList.remove('unconfigured', 'booked');

      if (isConfigured) {
        const config = configuredMap.get(seatId);
        // ฝังตัวแปรสีไว้ที่ Node เพื่อให้ CSS ดึงไปใช้ (ชนะทุก Inline Style ของ SVG)
        seatNode.style.setProperty('--seat-color', config.color || '#3b82f6');
        
        if (mode === 'booking' && isBooked) {
          seatNode.classList.add('booked');
        }
      } else {
        seatNode.classList.add('unconfigured');
      }
    });
  }, [configuredSeats, bookedSeats, mode]);

  // 3. จัดการการคลิก (Click Handling)
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

  // 4. ควบคุม Zoom
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

  // ================= แก้บัค Lasso ค้างด้วย Pointer Capture =================
  const handlePointerDown = (e) => {
    // ล็อคเมาส์ให้อยู่กับ Component นี้เท่านั้น (ปล่อยเมาส์นอกจอก็ไม่ค้าง!)
    e.currentTarget.setPointerCapture(e.pointerId);

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
    // ปลดล็อคเมาส์เมื่อปล่อยคลิก
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (lassoRef.current.active) {
      if (lasso && lasso.w > 5 && lasso.h > 5) {
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
          if (!(lRect.right < sRect.left || lRect.left > sRect.right || lRect.bottom < sRect.top || lRect.top > sRect.bottom)) {
            const conf = configuredSeats.find(c => c.seat_code === seatId);
            selectedGroup.push(conf || { seat_code: seatId, status: 'available' });
          }
        });

        if (selectedGroup.length > 0 && onSeatSelect) onSeatSelect(selectedGroup);
      }
    }
    
    // เคลียร์กล่องฟ้าทิ้งแบบ 100%
    setLasso(null);
    lassoRef.current.active = false;
    setTimeout(() => { dragState.current.isDragging = false; }, 50);
  };

  const handleZoom = (factor) => { 
    transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); 
    applyTransform(); 
  };
  
  const handleReset = () => { 
    transform.current = { x: 0, y: 0, scale: 1 }; 
    applyTransform(); 
  };

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