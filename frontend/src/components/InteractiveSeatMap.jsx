import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import RBush from 'rbush';

export default function InteractiveSeatMap({
  svgContent, // แนะนำให้เป็นไฟล์ SVG ที่มีแค่โซน (ดึงโหนดที่นั่งนับหมื่นออกไปก่อนเพื่อลดขนาด DOM)
  configuredSeats = [], // ข้อมูลที่นั่ง (จำเป็นต้องมี property x และ y เพิ่มเติมจาก backend)
  bookedSeats = [],
  selectedSeat = null,
  onSeatSelect
}) {
  const containerRef = useRef(null);
  const transformWrapperRef = useRef(null);
  const svgContainerRef = useRef(null);
  
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [visibleSeats, setVisibleSeats] = useState([]); // เก็บเฉพาะที่นั่งที่อยู่ในหน้าจอ

  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, mapStartX: 0, mapStartY: 0 });
  
  // 1. สร้าง R-Tree Instance สำหรับทำ Spatial Indexing
  const rbushIndex = useRef(new RBush());

  // 2. สร้าง Index เมื่อข้อมูล configuredSeats เปลี่ยนแปลง
  useEffect(() => {
    if (configuredSeats.length === 0) return;

    rbushIndex.current.clear();
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ rbush ต้องการ (minX, minY, maxX, maxY)
    // สมมติว่าที่นั่งมีขนาด 10x10 หน่วย (ปรับตัวเลขตาม scale จริงของ SVG)
    const seatItems = configuredSeats.map(seat => ({
      minX: seat.x - 5,
      minY: seat.y - 5,
      maxX: seat.x + 5,
      maxY: seat.y + 5,
      seatData: seat
    }));

    rbushIndex.current.load(seatItems);
    updateVisibleSeats(); // อัปเดตที่นั่งทันทีที่โหลดเสร็จ
  }, [configuredSeats]);

  // 3. ฟังก์ชันคำนวณว่าที่นั่งไหนอยู่ใน Viewport (หน้าจอที่มองเห็น)
  const updateVisibleSeats = useCallback(() => {
    if (!containerRef.current) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const { x: tx, y: ty, scale } = transform.current;

    // คำนวณ Bounding Box ของหน้าจอปัจจุบัน เทียบกับพิกัดดั้งเดิมของ SVG
    // การหารด้วย scale และลบค่า translate จะทำให้ได้พื้นที่จริงที่กำลังโฟกัส
    const minX = -tx / scale;
    const minY = -ty / scale;
    const maxX = (width - tx) / scale;
    const maxY = (height - ty) / scale;

    // ค้นหาเฉพาะที่นั่งที่อยู่ในกรอบหน้าจอ
    const results = rbushIndex.current.search({ minX, minY, maxX, maxY });

    // Level of Detail (LOD) - ซูมเกิน 1.5 ถึงจะเริ่ม Render ที่นั่ง
    if (scale >= 1.5) {
      setVisibleSeats(results.map(item => item.seatData));
    } else {
      setVisibleSeats([]); // ซูมออกกว้างๆ ไม่ต้อง Render ที่นั่ง (โชว์แค่โซน)
    }
  }, []);

  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
    // อัปเดต Viewport Culling ทุกครั้งที่มีการขยับหรือซูม
    updateVisibleSeats();
  };

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
        } else {
          // คำนวณการซูมให้พุ่งเป้าไปที่จุดที่เมาส์ชี้ (Zoom to pointer)
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const scaleRatio = newScale / transform.current.scale;
          transform.current.x = mouseX - (mouseX - transform.current.x) * scaleRatio;
          transform.current.y = mouseY - (mouseY - transform.current.y) * scaleRatio;
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
  }, [updateVisibleSeats]);

  const handlePointerDown = (e) => {
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

  const handlePointerUp = () => {
    setTimeout(() => {
      dragState.current.isDragging = false;
    }, 50);
  };

  const handleZoomIn = () => { 
    transform.current.scale = Math.min(transform.current.scale + 0.5, 10); 
    applyTransform(); 
  };
  const handleZoomOut = () => { 
    transform.current.scale = Math.max(transform.current.scale - 0.5, 1); 
    if (transform.current.scale === 1) { transform.current.x = 0; transform.current.y = 0; }
    applyTransform(); 
  };
  const handleReset = () => { 
    transform.current.scale = 1; transform.current.x = 0; transform.current.y = 0; 
    applyTransform(); 
  };

  const handleSeatClick = (seat) => {
    if (dragState.current.isDragging || bookedSeats.includes(seat.seat_code)) return;
    if (selectedSeat?.seat_code === seat.seat_code) {
      onSeatSelect(null);
    } else {
      onSeatSelect(seat);
    }
  };

  return (
    <div className="relative select-none w-full">
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
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-162.5 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {configuredSeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center absolute z-10 pointer-events-none">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง<br/>สำหรับคอนเสิร์ตนี้</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={transformWrapperRef}
            className="w-full h-full origin-top-left flex items-center justify-center relative"
          >
            {/* Layer 1: ภาพรวมโซนดั้งเดิม */}
            <div 
              ref={svgContainerRef}
              className="svg-container w-full h-full absolute inset-0 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: svgContent }} 
            />

            {/* Layer 2: On-Demand Seats วาดเฉพาะที่อยู่ใน Viewport */}
            <svg 
              className="absolute inset-0 w-full h-full z-10"
              style={{ overflow: 'visible' }}
            >
              {visibleSeats.map(seat => {
                const isBooked = bookedSeats.includes(seat.seat_code);
                const isSelected = selectedSeat?.seat_code === seat.seat_code;
                
                let fill = seat.color || '#3b82f6';
                let stroke = 'none';
                let opacity = 1;
                let cursor = 'pointer';

                if (isBooked) {
                  fill = '#475569';
                  opacity = 0.5;
                  cursor = 'not-allowed';
                } else if (isSelected) {
                  stroke = '#ef4444'; // Red stroke for selected
                }

                return (
                  <circle
                    key={seat.seat_code}
                    cx={seat.x}
                    cy={seat.y}
                    r={4} // รัศมีที่นั่ง (ปรับตามสัดส่วน SVG ของคุณ)
                    fill={fill}
                    opacity={opacity}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 0}
                    cursor={cursor}
                    onClick={() => handleSeatClick(seat)}
                    onTouchEnd={(e) => { e.preventDefault(); handleSeatClick(seat); }}
                    className="transition-all duration-100 hover:brightness-125 hover:stroke-white hover:stroke-[1.5px]"
                  />
                );
              })}
            </svg>
          </div>
        ) : (
          <p className="text-gray-400 font-bold text-xl absolute z-10 pointer-events-none">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}