import React, { useEffect, useRef, useState, useCallback } from 'react';
import { injectMapStyles, buildVectorZones } from './seatMapUtils'; 

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  mode = 'booking',
  onSeatSelect,
}) {
  const containerRef = useRef(null);
  const transformWrapperRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [lasso, setLasso] = useState(null); 
  
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapX: 0, mapY: 0, target: null, time: 0 });
  const lassoRef = useRef({ active: false, startX: 0, startY: 0, clientStartX: 0, clientStartY: 0 });
  const seatElementsCache = useRef(new Map());
  const requestRef = useRef(); 

  const ZOOM_THRESHOLD = 1.2; 

  // ระบบ Culling: ซ่อนที่นั่งที่อยู่นอกจอเพื่อลดภาระเครื่อง (แก้หน่วง)
  const updateCulling = useCallback(() => {
    if (!containerRef.current || transform.current.scale < ZOOM_THRESHOLD) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    seatElementsCache.current.forEach((data) => {
      const el = data.node;
      if (el.getAttribute('data-unconfigured') === 'true') return;

      const rect = el.getBoundingClientRect();
      const isVisible = (
        rect.top < containerRect.bottom &&
        rect.bottom > containerRect.top &&
        rect.left < containerRect.right &&
        rect.right > containerRect.left
      );

      el.style.visibility = isVisible ? 'visible' : 'hidden';
    });
  }, []);

  const applyTransform = (animate = false) => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (svgEl) {
      if (animate) {
        svgEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => { if(svgEl) svgEl.style.transition = 'none'; }, 300);
      } else {
        svgEl.style.transition = 'none';
      }
      
      // ใช้ translate3d เพื่อใช้ GPU ช่วยเร่งความเร็ว
      svgEl.style.transform = `translate3d(${transform.current.x}px, ${transform.current.y}px, 0) scale(${transform.current.scale})`;
      
      const currentZoom = transform.current.scale < ZOOM_THRESHOLD ? 'low' : 'high';
      if (svgEl.getAttribute('data-zoom') !== currentZoom) {
        svgEl.setAttribute('data-zoom', currentZoom);
      }
      
      updateCulling();
    }
  };

  useEffect(() => {
    const container = transformWrapperRef.current;
    if (!container || !svgContent) return;

    container.innerHTML = svgContent;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.transformOrigin = '0 0';
    svgEl.style.willChange = 'transform'; 
    svgEl.setAttribute('draggable', 'false');

    seatElementsCache.current.clear();

    const allShapes = svgEl.querySelectorAll('circle, ellipse, rect, path');
    allShapes.forEach((el, idx) => {
      try {
        const box = el.getBBox();
        if (box.width > 0 && box.width <= 60 && box.height > 0 && box.height <= 60) {
          let id = el.getAttribute('id') || `seat-auto-${idx}`;
          el.setAttribute('id', id);
          el.classList.add('smart-seat');
          
          seatElementsCache.current.set(id, { 
            node: el, 
            box: { x: box.x, y: box.y, width: box.width, height: box.height } 
          });
        }
      } catch (e) { /* ข้าม */ }
    });

    injectMapStyles(svgEl, mode);
    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }, [svgContent, mode]);

  useEffect(() => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (!svgEl || seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    buildVectorZones(svgEl, seatElementsCache.current, configuredMap, bookedSet, mode);

  }, [configuredSeats, bookedSeats, mode]);

  const handleMapClick = (target, clientX, clientY) => {
    if (!target) return;

    const seat = target.closest('.smart-seat');
    if (seat && transform.current.scale >= ZOOM_THRESHOLD) {
      const seatId = seat.getAttribute('id');
      if (mode === 'booking' && bookedSeats.includes(seatId)) return;
      
      const config = configuredSeats.find(c => c.seat_code === seatId);
      if (mode === 'booking' && !config) return;

      if (onSeatSelect) onSeatSelect(config || { seat_code: seatId, status: 'available' });
      return;
    }

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
              }).filter(s => s);
              if (onSeatSelect && selectedGroup.length > 0) onSeatSelect(selectedGroup);
          }
      }
    }
  };

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
      mapY: transform.current.y,
      target: e.target,
      time: Date.now() // ล็อกเวลาเพื่อแยกแยะระหว่าง Tap กับ Drag
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

    // ระยะ Threshold สำหรับมือถือ ป้องกันคลิกพลาดเป็นเลื่อน
    if (!dragState.current.isDragging && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      dragState.current.isDragging = true;
    }

    if (dragState.current.isDragging) {
      // ใช้ RequestAnimationFrame เพื่อความลื่นไหล
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        transform.current.x = dragState.current.mapX + dx;
        transform.current.y = dragState.current.mapY + dy;
        applyTransform();
      });
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (lassoRef.current.active) {
      if (lasso && lasso.w > 5 && lasso.h > 5) {
        const lRect = {
          left: Math.min(lassoRef.current.clientStartX, e.clientX), top: Math.min(lassoRef.current.clientStartY, e.clientY),
          right: Math.max(lassoRef.current.clientStartX, e.clientX), bottom: Math.max(lassoRef.current.clientStartY, e.clientY),
        };
        const selectedGroup = [];
        seatElementsCache.current.forEach((seatData, seatId) => {
          if (transform.current.scale < ZOOM_THRESHOLD) return; 
          const sRect = seatData.node.getBoundingClientRect();
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

    const timeDiff = Date.now() - dragState.current.time;
    // ถ้าระยะเวลาแตะน้อยกว่า 300ms ให้นับว่าเป็นการคลิกแน่นอนแม้ลากนิ้วไปนิดเดียว
    if (!dragState.current.isDragging || timeDiff < 300) {
      handleMapClick(dragState.current.target, e.clientX, e.clientY);
    }
    dragState.current.isDragging = false;
  };

  const handleZoom = (factor) => { transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); applyTransform(true); };
  const handleReset = () => { transform.current = { x: 0, y: 0, scale: 1 }; applyTransform(true); };

  return (
    <div className="relative select-none w-full h-full min-h-125 md:min-h-150">
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
        className="bg-[#0f172a] rounded-xl border dark:border-gray-600 shadow-inner overflow-hidden relative w-full h-full min-h-125 md:min-h-150 touch-none cursor-grab active:cursor-grabbing"
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