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

  const ZOOM_THRESHOLD = 1.2; 

  const applyTransform = (animate = false) => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (svgEl) {
      if (animate) {
        svgEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => { if(svgEl) svgEl.style.transition = 'none'; }, 300);
      } else {
        svgEl.style.transition = 'none';
      }
      
      svgEl.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
      
      if (transform.current.scale < ZOOM_THRESHOLD) {
        svgEl.setAttribute('data-zoom', 'low');
      } else {
        svgEl.setAttribute('data-zoom', 'high');
      }
    }
  };

  // 1. โหลดแผนผังและสร้าง "Vector Blob" ตามรูปทรงที่นั่ง
  useEffect(() => {
    const container = transformWrapperRef.current;
    if (!container || !svgContent) return;

    container.innerHTML = svgContent;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.transformOrigin = '0 0';
    svgEl.setAttribute('draggable', 'false');

    seatElementsCache.current.clear();
    const zoneGroups = new Set();

    const allShapes = svgEl.querySelectorAll('circle, ellipse, rect, path');
    allShapes.forEach((el, idx) => {
      try {
        const box = el.getBBox();
        if (box.width > 0 && box.width <= 60 && box.height > 0 && box.height <= 60) {
          let id = el.getAttribute('id') || `seat-auto-${idx}`;
          el.setAttribute('id', id);
          el.classList.add('smart-seat');
          seatElementsCache.current.set(id, el);

          const parentG = el.closest('g[id]');
          if (parentG && parentG.id !== 'layer1' && parentG.id !== 'svg-root') {
            zoneGroups.add(parentG);
          }
        }
      } catch (e) { /* ข้าม */ }
    });

    // สร้างรูปทรงโซนที่รัดรูปตามเก้าอี้ (แก้บัคสี่เหลี่ยมคลุมเต็ม)
    zoneGroups.forEach(g => {
      try {
        if (g.querySelector('.zone-overlay')) return; 
        
        const seatsInGroup = g.querySelectorAll('.smart-seat');
        if (seatsInGroup.length === 0) return;

        const overlayG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        overlayG.setAttribute('class', 'zone-overlay');
        overlayG.style.cursor = 'pointer';

        // สร้าง Group สำหรับตัว Blob 
        const blobG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        blobG.setAttribute('class', 'zone-blob');

        // Copy เก้าอี้ทั้งหมดมาขยายเส้นขอบเพื่อให้เนื้อเชื่อมติดกันเป็นรูปร่าง
        seatsInGroup.forEach(seat => {
            const clone = seat.cloneNode(true);
            clone.removeAttribute('id');
            clone.setAttribute('class', 'zone-blob-element');
            blobG.appendChild(clone);
        });

        overlayG.appendChild(blobG);

        // ใส่ชื่อโซนตรงกลาง
        const box = g.getBBox();
        if (box.width > 0 && box.height > 0) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.textContent = (g.id || '').replace(/[_-]/g, ' ').toUpperCase();
          text.setAttribute('x', box.x + box.width / 2);
          text.setAttribute('y', box.y + box.height / 2);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('class', 'zone-blob-text');
          overlayG.appendChild(text);
        }

        g.appendChild(overlayG);
      } catch(e) {}
    });

    const oldStyle = svgEl.querySelector('#seat-map-styles');
    if (oldStyle) oldStyle.remove();

    const styleEl = document.createElement('style');
    styleEl.id = 'seat-map-styles';
    styleEl.innerHTML = `
      .smart-seat { transition: opacity 0.2s ease, filter 0.1s ease; transform-box: fill-box; transform-origin: center; cursor: pointer; }
      .smart-seat { fill: var(--seat-color) !important; stroke: none !important; }
      .smart-seat:hover { filter: brightness(1.5) saturate(2); stroke: white !important; stroke-width: 2px !important; }
      .smart-seat.booked { fill: #475569 !important; opacity: 0.4 !important; pointer-events: none !important; cursor: not-allowed !important; }
      .smart-seat.unconfigured { display: ${mode === 'booking' ? 'none' : 'block'} !important; fill: #cbd5e1 !important; opacity: 0.5 !important; }
      
      .zone-overlay { transition: opacity 0.3s ease; }
      
      /* เทคนิคขยายจุดให้เชื่อมติดกัน (Blob) */
      .zone-blob-element {
        fill: var(--zone-color) !important;
        stroke: var(--zone-color) !important;
        stroke-width: 45px !important; /* ค่านี้ทำให้จุดเก้าอี้เชื่อมติดกันพอดี */
        stroke-linejoin: round !important;
        stroke-linecap: round !important;
        pointer-events: auto; /* ให้คลิกโดน Blob ได้ */
        transition: filter 0.2s ease;
      }
      .zone-overlay:hover .zone-blob-element { filter: brightness(1.15); stroke-width: 50px !important; }
      
      .zone-blob-text {
        fill: #ffffff;
        font-family: system-ui, sans-serif;
        font-size: 36px;
        font-weight: 800;
        pointer-events: none;
        text-shadow: 0px 4px 6px rgba(0,0,0,0.6), 0px 0px 10px rgba(0,0,0,0.3);
      }
      
      /* ระบบซูม */
      svg[data-zoom="low"] .smart-seat { opacity: 0 !important; pointer-events: none !important; }
      svg[data-zoom="low"] .zone-overlay { opacity: 1 !important; pointer-events: auto !important; }
      
      svg[data-zoom="high"] .smart-seat { opacity: 1 !important; pointer-events: auto !important; }
      svg[data-zoom="high"] .zone-overlay { opacity: 0 !important; pointer-events: none !important; }
    `;
    svgEl.appendChild(styleEl);

    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }, [svgContent, mode]);

  // 2. ระบายสีเก้าอี้ & ดึงสีเก้าอี้มาตั้งเป็นสีโซน (แก้บัคสีโซนไม่ตรง)
  useEffect(() => {
    if (seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    // ระบายสีเก้าอี้
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

    // อัปเดตสีของโซน (ดึงสีจากเก้าอี้ในโซนนั้นๆ มาแสดง)
    const container = transformWrapperRef.current;
    if (container) {
      const overlays = container.querySelectorAll('.zone-overlay');
      overlays.forEach(overlay => {
        const group = overlay.closest('g');
        if (!group) return;
        const seats = group.querySelectorAll('.smart-seat');
        let zoneColor = '#64748b'; // สีเริ่มต้น (เทา)
        for (let i = 0; i < seats.length; i++) {
          const sId = seats[i].getAttribute('id');
          if (configuredMap.has(sId)) {
            zoneColor = configuredMap.get(sId).color || '#3b82f6';
            break; // เจอสีแล้วหยุดหา
          }
        }
        overlay.style.setProperty('--zone-color', zoneColor);
      });
    }
  }, [configuredSeats, bookedSeats, mode]);

  // ================= 3. ระบบคลิกและซูม =================
  const handleMapClick = (target, clientX, clientY) => {
    if (!target) return;

    // 3.1 กรณีซูมเข้าแล้ว และกดโดนเก้าอี้
    const seat = target.closest('.smart-seat');
    if (seat && transform.current.scale >= ZOOM_THRESHOLD) {
      const seatId = seat.getAttribute('id');
      if (mode === 'booking' && bookedSeats.includes(seatId)) return;
      
      const config = configuredSeats.find(c => c.seat_code === seatId);
      if (mode === 'booking' && !config) return;

      if (onSeatSelect) onSeatSelect(config || { seat_code: seatId, status: 'available' });
      return;
    }

    // 3.2 กรณีซูมออกอยู่ และกดโดนโซน Blob
    const overlay = target.closest('.zone-overlay');
    if (overlay || transform.current.scale < ZOOM_THRESHOLD) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const newScale = 2.5; 
      const scaleRatio = newScale / transform.current.scale;
      
      transform.current.x = clickX - (clickX - transform.current.x) * scaleRatio;
      transform.current.y = clickY - (clickY - transform.current.y) * scaleRatio;
      transform.current.scale = newScale;

      applyTransform(true);
      
      if (mode === 'admin' && overlay) {
          const group = overlay.closest('g');
          if (group) {
              const seatsInZone = group.querySelectorAll('.smart-seat');
              const selectedGroup = Array.from(seatsInZone).map(s => {
                  const sId = s.getAttribute('id');
                  const conf = configuredSeats.find(c => c.seat_code === sId);
                  return conf || { seat_code: sId, status: 'available' };
              });
              if (onSeatSelect && selectedGroup.length > 0) onSeatSelect(selectedGroup);
          }
      }
    }
  };

  // ================= 4. ระบบควบคุมเมาส์ ลาก และซูม =================
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
    e.target.setPointerCapture(e.pointerId);

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
        x: Math.min(currentX, startX), y: Math.min(currentY, startY),
        w: Math.abs(currentX - startX), h: Math.abs(currentY - startY)
      });
      return;
    }

    if (e.buttons !== 1) return;
    
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
    e.target.releasePointerCapture(e.pointerId);

    if (lassoRef.current.active) {
      if (lasso && lasso.w > 5 && lasso.h > 5) {
        const lRect = {
          left: Math.min(lassoRef.current.clientStartX, e.clientX), top: Math.min(lassoRef.current.clientStartY, e.clientY),
          right: Math.max(lassoRef.current.clientStartX, e.clientX), bottom: Math.max(lassoRef.current.clientStartY, e.clientY),
        };
        const selectedGroup = [];
        seatElementsCache.current.forEach((seatNode, seatId) => {
          if (seatNode.style.display === 'none' || transform.current.scale < ZOOM_THRESHOLD) return; 
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

    if (!dragState.current.isDragging) {
      const actualTarget = document.elementFromPoint(e.clientX, e.clientY);
      handleMapClick(actualTarget, e.clientX, e.clientY);
    }
    
    dragState.current.isDragging = false;
  };

  const handleZoom = (factor) => { transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); applyTransform(true); };
  const handleReset = () => { transform.current = { x: 0, y: 0, scale: 1 }; applyTransform(true); };

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
          <div ref={transformWrapperRef} className="w-full h-full flex items-center justify-center" />
        ) : (
          <div className="flex justify-center items-center w-full h-full absolute">
             <p className="text-gray-400 font-bold text-xl pointer-events-none">ไม่มีแผนผัง Interactive</p>
          </div>
        )}
      </div>
    </div>
  );
}