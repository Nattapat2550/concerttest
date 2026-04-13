// frontend/src/components/InteractiveSeatMap.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { injectMapStyles, buildVectorZones } from './seatMapUtils'; 
import { usePanZoom } from '../hooks/usePanZoom'; 
import { useSeatWebSocket } from '../hooks/useSeatWebSocket'; // 🌟 นำเข้า Hook

interface SeatConfig {
  seat_code: string;
  price?: number;
  color?: string;
  zone_name?: string;
  status?: string;
}

interface InteractiveSeatMapProps {
  concertId?: string; // 🌟 เพิ่มสำหรับโยง WebSocket
  svgContent: string;
  configuredSeats?: SeatConfig[];
  bookedSeats?: string[];
  waitSeats?: string[]; 
  mode?: 'booking' | 'admin';
  onSeatSelect?: (seat: any) => void;
  selectedSeat?: any;
}

const ZOOM_THRESHOLD = 1.2;

export default function InteractiveSeatMap({
  concertId,
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  waitSeats = [], 
  mode = 'booking',
  onSeatSelect,
}: InteractiveSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformWrapperRef = useRef<HTMLDivElement>(null);
  const [lasso, setLasso] = useState<{x: number, y: number, w: number, h: number} | null>(null); 
  const { transform, applyTransform, handleZoom, handleReset, showZoomHint, rafRef } = usePanZoom(containerRef, transformWrapperRef, ZOOM_THRESHOLD);
  
  // 🌟 เรียกใช้ WebSocket Hook
  const { lockedSeats: wsLockedSeats, lockSeat } = useSeatWebSocket(mode === 'booking' ? concertId : undefined);

  // 🌟 นำที่นั่งที่รอจ่าย (ระบบหลัก) และ ล็อคชั่วคราว (WS) มารวมเป็น Set เดียวกันเพื่อแสดงผลสีเหลือง (#eab308)
  const combinedWaitSeats = useMemo(() => {
    return Array.from(new Set([...waitSeats, ...wsLockedSeats]));
  }, [waitSeats, wsLockedSeats]);

  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapX: 0, mapY: 0, target: null as EventTarget | null });
  const lassoRef = useRef({ active: false, startX: 0, startY: 0, clientStartX: 0, clientStartY: 0 });
  const seatElementsCache = useRef(new Map<string, any>());

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

    const allShapes = svgEl.querySelectorAll('circle, ellipse, rect, path');
    allShapes.forEach((el: any, idx: number) => {
      try {
        if (typeof el.getBBox === 'function') {
          const box = el.getBBox();
          if (box.width > 0 && box.width <= 60 && box.height > 0 && box.height <= 60) {
            let id = el.getAttribute('id') || `seat-auto-${idx}`;
            el.setAttribute('id', id);
            el.classList.add('smart-seat');
            seatElementsCache.current.set(id, { node: el, box: { x: box.x, y: box.y, width: box.width, height: box.height } });
          }
        }
      } catch (e) { }
    });

    injectMapStyles(svgEl, mode);
    handleReset();
  }, [svgContent, mode]);

  useEffect(() => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (!svgEl || seatElementsCache.current.size === 0) return;

    const bookedSet = new Set(bookedSeats);
    const waitSet = new Set(combinedWaitSeats); // 🌟 ใช้ combinedWaitSeats แทน 
    const configuredMap = new Map();
    configuredSeats.forEach(c => configuredMap.set(c.seat_code, c));

    buildVectorZones(svgEl, seatElementsCache.current, configuredMap, bookedSet, mode);

    seatElementsCache.current.forEach((seatData, seatId) => {
      if (mode === 'booking' && !configuredMap.has(seatId)) {
        seatData.node.style.visibility = 'hidden'; 
        seatData.node.style.pointerEvents = 'none';
      } else {
        seatData.node.style.visibility = 'visible';
        seatData.node.style.pointerEvents = '';
      }

      // 💡 [สถานะ Wait/Lock] ให้เป็นสีเหลือง
      if (mode === 'booking' && waitSet.has(seatId)) {
        seatData.node.style.setProperty('fill', '#eab308', 'important');
        seatData.node.style.setProperty('opacity', '0.9', 'important');
        seatData.node.style.setProperty('stroke', '#ffffff', 'important');
        seatData.node.style.setProperty('stroke-width', '1', 'important');
        seatData.node.style.cursor = 'not-allowed';
      }
    });

  }, [configuredSeats, bookedSeats, combinedWaitSeats, mode]); // 🌟 อัปเดต Dependency

  const handleMapClick = (target: EventTarget | null, clientX: number, clientY: number) => {
    if (!target) return;
    const element = target as Element;
    const seat = element.closest('.smart-seat');
    
    if (seat && transform.current.scale >= ZOOM_THRESHOLD) {
      const seatId = seat.getAttribute('id');
      if (!seatId) return;

      // ❌ ห้ามกดจองถ้าที่นั่งนั้นถูก Book หรือ Wait ไปแล้ว
      if (mode === 'booking' && (bookedSeats.includes(seatId) || combinedWaitSeats.includes(seatId))) return;
      
      const config = configuredSeats.find(c => c.seat_code === seatId);
      if (mode === 'booking' && !config) return;

      // 🌟 ทันทีที่เลือก ให้ส่งสัญญาณบอกเซิร์ฟเวอร์ทำการ Lock ชั่วคราว
      if (mode === 'booking') {
        lockSeat(seatId);
      }

      if (onSeatSelect) onSeatSelect(config || { seat_code: seatId, status: 'available' });
      return;
    }

    const overlay = element.closest('.zone-overlay');
    if ((overlay || transform.current.scale < ZOOM_THRESHOLD) && containerRef.current) {
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
                  if(!sId) return null;
                  const conf = configuredSeats.find(c => c.seat_code === sId);
                  return conf || { seat_code: sId, status: 'available' };
              }).filter(s => s);
              if (onSeatSelect && selectedGroup.length > 0) onSeatSelect(selectedGroup);
          }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mode === 'admin' && e.shiftKey && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      lassoRef.current = { active: true, startX, startY, clientStartX: e.clientX, clientStartY: e.clientY };
      setLasso({ x: startX, y: startY, w: 0, h: 0 });
      return;
    }
    dragState.current = { isDragging: false, startX: e.clientX, startY: e.clientY, mapX: transform.current.x, mapY: transform.current.y, target: e.target };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lassoRef.current.active && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const { startX, startY } = lassoRef.current;
      setLasso({ x: Math.min(e.clientX - rect.left, startX), y: Math.min(e.clientY - rect.top, startY), w: Math.abs(e.clientX - rect.left - startX), h: Math.abs(e.clientY - rect.top - startY) });
      return;
    }
    if (e.buttons !== 1) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!dragState.current.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) dragState.current.isDragging = true;
    if (dragState.current.isDragging) {
      transform.current.x = dragState.current.mapX + dx;
      transform.current.y = dragState.current.mapY + dy;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => applyTransform());
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (lassoRef.current.active) {
      if (lasso && lasso.w > 5 && lasso.h > 5) {
        const lRect = {
          left: Math.min(lassoRef.current.clientStartX, e.clientX), top: Math.min(lassoRef.current.clientStartY, e.clientY),
          right: Math.max(lassoRef.current.clientStartX, e.clientX), bottom: Math.max(lassoRef.current.clientStartY, e.clientY),
        };
        const selectedGroup: any[] = [];
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
      setLasso(null); lassoRef.current.active = false;
      return;
    }
    if (!dragState.current.isDragging) handleMapClick(dragState.current.target, e.clientX, e.clientY);
    dragState.current.isDragging = false;
  };

  return (
    <div className="relative select-none w-full h-full min-h-125">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end pointer-events-none">
        <div className="flex gap-2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto border dark:border-gray-600">
          <button onClick={() => handleZoom(-0.5)} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
          <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
          <button onClick={() => handleZoom(0.5)} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
        </div>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้าง + เลื่อนลูกกลิ้งเพื่อซูม
      </div>

      {/* 💡 คำใบ้สถานะที่นั่ง อัปเดตข้อความให้รวมสถานะล็อกชั่วคราวด้วย */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-3 bg-white/90 dark:bg-gray-800/90 p-3 rounded-xl shadow-lg border dark:border-gray-600 text-xs font-bold pointer-events-none">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div> ว่าง</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#eab308]"></div> ล็อก/รอจ่ายเงิน</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> จองแล้ว</div>
      </div>

      <div ref={containerRef} className="bg-[#0f172a] rounded-xl border dark:border-gray-600 shadow-inner overflow-hidden relative w-full h-full min-h-150 touch-none cursor-grab active:cursor-grabbing" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        {lasso && (
          <div className="absolute border-2 border-blue-400 bg-blue-400/30 z-50 pointer-events-none shadow-[0_0_10px_rgba(96,165,250,0.5)]" style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }} />
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