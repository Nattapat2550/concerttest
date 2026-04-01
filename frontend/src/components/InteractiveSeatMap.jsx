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

  // ฟังก์ชันควบคุมการซูมและแพน
  const applyTransform = (animate = false) => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (svgEl) {
      if (animate) {
        svgEl.style.transition = 'transform 0.3s ease-in-out';
        setTimeout(() => { if(svgEl) svgEl.style.transition = 'none'; }, 300);
      }
      
      svgEl.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
      
      // ระบบ Level of Detail (LOD)
      if (transform.current.scale < 1.5) {
        svgEl.setAttribute('data-zoom', 'low');
      } else {
        svgEl.setAttribute('data-zoom', 'high');
      }
    }
  };

  // 1. โหลดและสแกนเก้าอี้
  useEffect(() => {
    const container = transformWrapperRef.current;
    if (!container || !svgContent) return;

    container.innerHTML = svgContent;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.maxHeight = '650px';
    svgEl.style.transformOrigin = '0 0';
    svgEl.style.willChange = 'transform'; 
    svgEl.setAttribute('draggable', 'false');

    seatElementsCache.current.clear();
    const zoneGroups = new Set();

    // กวาดหาสิ่งที่ "น่าจะ" เป็นเก้าอี้ (วงกลม, วงรี, สี่เหลี่ยม)
    const allShapes = svgEl.querySelectorAll('circle, ellipse, rect, path');
    
    allShapes.forEach((el, idx) => {
      try {
        const box = el.getBBox();
        // ปรับเงื่อนไขขนาดเล็กน้อย เผื่อบางที่นั่งถูกขยาย stroke (จาก 40 เป็น 60 px)
        if (box.width > 0 && box.width <= 60 && box.height > 0 && box.height <= 60) {
          
          let id = el.getAttribute('id');
          if (!id) {
            id = `seat-auto-${idx}`;
            el.setAttribute('id', id);
          }
          
          el.classList.add('smart-seat');
          el.style.cursor = 'pointer';
          seatElementsCache.current.set(id, el);

          // หา Group ของโซนเพื่อเอาไปทำ Label (แก้บัค 2)
          const parentG = el.closest('g[id]');
          if (parentG && parentG.id !== 'layer1' && parentG.id !== 'svg-root') {
            zoneGroups.add(parentG);
          }
        }
      } catch (e) { /* ข้ามตัวที่คำนวณขนาดไม่ได้ */ }
    });

    // วาด Label ชื่อโซนตรงกลางแต่ละกรุ๊ป
    zoneGroups.forEach(g => {
      try {
        if (g.querySelector('.zone-label')) return; // กันการสร้างซ้ำ
        
        const box = g.getBBox();
        if (box.width > 0) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.textContent = g.id.replace(/[_-]/g, ' '); // เปลี่ยน _ เป็นช่องว่างให้อ่านง่าย
          text.setAttribute('x', box.x + box.width / 2);
          text.setAttribute('y', box.y + box.height / 2);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('class', 'zone-label');
          g.appendChild(text);
        }
      } catch(e) {}
    });

    // ล้าง CSS เก่าแล้วใส่ใหม่
    const oldStyle = svgEl.querySelector('#seat-map-styles');
    if (oldStyle) oldStyle.remove();

    const styleEl = document.createElement('style');
    styleEl.id = 'seat-map-styles';
    styleEl.innerHTML = `
      .smart-seat { transition: opacity 0.2s ease, filter 0.1s ease; transform-box: fill-box; transform-origin: center; }
      
      /* บังคับสีเก้าอี้ */
      .smart-seat { fill: var(--seat-color) !important; stroke: none !important; }
      .smart-seat:hover { filter: brightness(1.5) saturate(2); stroke: white !important; stroke-width: 2px !important; z-index: 100; }
      
      /* ระบบ LOD: แก้บัค 1 และ 3 ให้เก้าอี้โชว์สีตลอดเวลา และคลิกได้แม้จะซูมออก */
      svg[data-zoom="low"] .smart-seat { opacity: 1 !important; pointer-events: auto !important; }
      svg[data-zoom="high"] .smart-seat { opacity: 1 !important; pointer-events: auto !important; }
      
      /* แก้บัค 2: สไตล์ของ Zone Label ให้โชว์ตอนซูมออก (low zoom) */
      .zone-label {
        fill: #ffffff;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 40px;
        font-weight: 900;
        pointer-events: none;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -2px -2px 8px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5);
        transition: opacity 0.3s ease;
      }
      svg[data-zoom="low"] .zone-label { opacity: 1; }
      svg[data-zoom="high"] .zone-label { opacity: 0; }
      
      /* สถานะเก้าอี้ */
      .smart-seat.booked { fill: #475569 !important; opacity: 0.4 !important; pointer-events: none !important; cursor: not-allowed !important; }
      .smart-seat.unconfigured { display: ${mode === 'booking' ? 'none' : 'block'} !important; fill: #cbd5e1 !important; opacity: 0.5 !important; }
    `;
    svgEl.appendChild(styleEl);

    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }, [svgContent, mode]);

  // 2. ระบายสีเก้าอี้
  useEffect(() => {
    if (seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    seatElementsCache.current.forEach((seatNode, seatId) => {
      seatNode.classList.remove('unconfigured', 'booked');

      if (configuredMap.has(seatId)) {
        const config = configuredMap.get(seatId);
        seatNode.style.setProperty('--seat-color', config.color || '#3b82f6');
        
        if (mode === 'booking' && bookedSet.has(seatId)) {
          seatNode.classList.add('booked');
        }
      } else {
        seatNode.classList.add('unconfigured');
      }
    });
  }, [configuredSeats, bookedSeats, mode]);

  // ================= 3. ระบบคลิกและซูม =================
  const handleMapClick = (e) => {
    const target = e.target;
    
    // 3.1 กรณีคลิกโดนเก้าอี้ (จอง/ทาสี)
    const seat = target.closest('.smart-seat');
    if (seat) {
      e.stopPropagation();
      const seatId = seat.getAttribute('id');
      
      if (mode === 'booking' && bookedSeats.includes(seatId)) return;
      
      const config = configuredSeats.find(c => c.seat_code === seatId);
      // ถ้าเป็น User และเก้าอี้นั้นไม่ได้เปิดขาย ให้คลิกไม่ได้
      if (mode === 'booking' && !config) return;

      if (onSeatSelect) onSeatSelect(config || { seat_code: seatId, status: 'available' });
      return;
    }

    // 3.2 กรณีคลิกโดนโซน หรือ พื้นที่ว่าง (ให้ซูมเข้า)
    if (transform.current.scale < 2) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const newScale = 2.5; // ระดับการซูมเมื่อกดโซน
      const scaleRatio = newScale / transform.current.scale;
      
      transform.current.x = clickX - (clickX - transform.current.x) * scaleRatio;
      transform.current.y = clickY - (clickY - transform.current.y) * scaleRatio;
      transform.current.scale = newScale;

      applyTransform(true); // true = มีแอนิเมชันสมูทๆ
    }

    // [แอดมินเท่านั้น] ถ้าคลิกโดนโซน ให้คลุมดำเก้าอี้ทั้งโซนให้ด้วย
    if (mode === 'admin') {
      let node = target.closest('g');
      if (node) {
        const seatsInZone = node.querySelectorAll('.smart-seat');
        if (seatsInZone.length > 0) {
          const selectedGroup = [];
          seatsInZone.forEach(s => {
            const sId = s.getAttribute('id');
            const conf = configuredSeats.find(c => c.seat_code === sId);
            selectedGroup.push(conf || { seat_code: sId, status: 'available' });
          });
          if (onSeatSelect) onSeatSelect(selectedGroup);
        }
      }
    }
  };

  // ================= 4. ระบบควบคุม (Wheel, Pan, Lasso) =================
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
    e.currentTarget.setPointerCapture(e.pointerId); // ล็อคเมาส์

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
    
    // ตรวจจับการลาก (ถ้าขยับเกิน 5px ถึงจะถือว่าเป็นการแพน ไม่ใช่การคลิกจองที่นั่ง)
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      transform.current.x = dragState.current.mapX + dx;
      transform.current.y = dragState.current.mapY + dy;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    // ประมวลผล Lasso (ลากคลุม)
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
      setLasso(null);
      lassoRef.current.active = false;
      return;
    }

    // ถ้าไม่ได้ขยับเมาส์ลากแผนที่ ให้ถือว่าเป็นการ "คลิก"
    if (!dragState.current.isDragging) {
      handleMapClick(e);
    }
    
    dragState.current.isDragging = false;
  };

  const handleZoom = (factor) => { 
    transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); 
    applyTransform(true); 
  };
  
  const handleReset = () => { 
    transform.current = { x: 0, y: 0, scale: 1 }; 
    applyTransform(true); 
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
            className="w-full h-full flex items-center justify-center"
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