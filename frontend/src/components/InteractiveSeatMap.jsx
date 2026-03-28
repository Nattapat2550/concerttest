import React, { useEffect, useRef, useState } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  selectedSeat = null,
  onSeatSelect
}) {
  const transformWrapperRef = useRef(null);
  const svgContainerRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);

  // ใช้ตัวแปร Ref เก็บค่าล้วนๆ เพื่อป้องกัน React รีเฟรชหน้าจอตอนซูม (กันสีหาย)
  const transform = useRef({ scale: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // ฟังก์ชันขยับภาพ (ยิงตรงเข้า DOM ไม่ผ่าน State สีเลยไม่หาย)
  const applyTransform = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  // --- 1. ระบบ ZOOM ---
  useEffect(() => {
    // ดักจับการ Scroll เมาส์ที่กล่องแม่
    const container = transformWrapperRef.current?.parentElement;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = transform.current.scale + delta;
        
        // บังคับสเกลให้อยู่ระหว่าง 1 ถึง 10
        newScale = Math.max(1, Math.min(newScale, 10));

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

  // --- 2. ระบบลงสีและสถานะ (ทำแค่ตอนข้อมูลเปลี่ยนเท่านั้น) ---
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;

    const seats = svgContainerRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];

      if (!config) {
        seat.setAttribute('data-status', 'unavailable');
        return;
      }

      // 🎨 ใส่สีดั้งเดิม (สีที่ให้มากับ SVG หรือแอดมินตั้งค่า)
      if (config.color) {
        seat.style.fill = config.color;
      }

      const isBooked = bookedSeats.includes(seatId);
      const isSelected = selectedSeat?.seat_code === seatId;

      if (isBooked) {
        seat.setAttribute('data-status', 'booked');
        seat.removeAttribute('data-selected');
      } else {
        seat.setAttribute('data-status', 'available');
        if (isSelected) {
          seat.setAttribute('data-selected', 'true');
          seat.parentNode.appendChild(seat); // ดันที่นั่งขึ้นมาหน้าสุดให้ขอบชัดๆ
        } else {
          seat.removeAttribute('data-selected');
        }
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  // --- 3. ระบบ DRAG (เลื่อนแผนที่) ---
  const handlePointerDown = (e) => {
    if (transform.current.scale <= 1) return; // สเกล 1 ห้ามเลื่อน
    isDragging.current = false;
    dragStart.current = {
      x: e.clientX - transform.current.x,
      y: e.clientY - transform.current.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (transform.current.scale <= 1 || !e.buttons) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    // เผื่อระยะคนมือสั่นตอนคลิก (ต้องขยับเมาส์เกิน 10px ถึงจะมองว่าเป็นการลาก ไม่ใช่การคลิก)
    if (Math.abs(newX - transform.current.x) > 10 || Math.abs(newY - transform.current.y) > 10) {
      isDragging.current = true;
      transform.current.x = newX;
      transform.current.y = newY;
      applyTransform();
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    // หน่วงเวลาปิดสถานะลากนิดหน่อย เพื่อไม่ให้ไปชนกับ Event คลิก
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  // --- 4. ระบบกดจองที่นั่ง ---
  const handleMapClick = (e) => {
    if (isDragging.current) return; // ถ้ากำลังลากภาพอยู่ ไม่นับว่าเป็นการกดจอง

    const seatNode = e.target.closest('.seat');
    if (!seatNode) return;

    const seatId = seatNode.getAttribute('id');
    const status = seatNode.getAttribute('data-status');

    if (status === 'unavailable' || status === 'booked') return;

    const config = configuredSeats.find(s => s.seat_code === seatId);
    if (config) {
      if (selectedSeat?.seat_code === seatId) {
        onSeatSelect(null); // กดย้ำเพื่อยกเลิก
      } else {
        onSeatSelect(config); // เลือกที่นั่งใหม่
      }
    }
  };

  // ปุ่มคอนโทรล
  const handleZoomIn = () => { transform.current.scale = Math.min(transform.current.scale + 0.5, 10); applyTransform(); };
  const handleZoomOut = () => {
    transform.current.scale = Math.max(transform.current.scale - 0.5, 1);
    if (transform.current.scale === 1) { transform.current.x = 0; transform.current.y = 0; }
    applyTransform();
  };
  const handleReset = () => { transform.current.scale = 1; transform.current.x = 0; transform.current.y = 0; applyTransform(); };

  return (
    <div className="relative select-none">
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg shadow backdrop-blur-sm">
        <button onClick={handleZoomOut} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">-</button>
        <button onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded text-sm font-bold hover:bg-gray-300 transition">RESET</button>
        <button onClick={handleZoomIn} className="bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-1 rounded font-bold hover:bg-gray-300 transition">+</button>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full shadow-lg pointer-events-none z-20 font-bold text-sm transition-all duration-300 transform ${showZoomHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        💡 กด <kbd className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">Ctrl</kbd> ค้างไว้แล้วเลื่อนลูกกลิ้งเพื่อซูมแผนที่
      </div>

      <div 
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleMapClick}
      >
        <style>
          {`
            .svg-container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .svg-container svg {
              width: 100% !important;
              height: 100% !important;
              max-height: 650px;
            }
            .seat {
              /* 🔥 ถอดคำสั่ง transform ออก ป้องกันเป้าดิ้นหนีมือตอนซูมคลิก */
              transition: filter 0.15s ease, stroke 0.15s ease;
              transform-box: fill-box;
            }
            .seat[data-status="unavailable"] { display: none !important; }
            .seat[data-status="available"] { opacity: 1; cursor: pointer; pointer-events: auto; }
            
            /* เปลี่ยนจากสเกลขยาย เป็นเรืองแสงสว่างขึ้นแทน เพื่อให้กล่อง Hitbox อยู่กับที่เป๊ะๆ */
            .seat[data-status="available"]:not([data-selected="true"]):hover {
              filter: brightness(1.5);
              stroke: #ffffff;
              stroke-width: 1.5px;
            }
            .seat[data-selected="true"] {
              stroke: #ef4444 !important;
              stroke-width: 4px !important;
              filter: brightness(1.2) drop-shadow(0px 0px 4px rgba(239, 68, 68, 0.8));
            }
            .seat[data-status="booked"] {
              fill: #475569 !important; /* บังคับที่นั่งที่จองแล้วเป็นสีเทาเข้ม */
              opacity: 0.5 !important;
              cursor: not-allowed !important;
              pointer-events: none !important;
              stroke: none !important;
            }
          `}
        </style>

        {configuredSeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center absolute z-10">
            <span className="text-6xl mb-4">🚧</span>
            <p className="text-gray-500 font-bold text-2xl text-center">แอดมินยังไม่ได้เปิดขายที่นั่ง<br/>สำหรับคอนเสิร์ตนี้</p>
          </div>
        ) : svgContent ? (
          <div 
            ref={transformWrapperRef}
            className="w-full h-full origin-center transition-transform duration-75 ease-out will-change-transform"
          >
            <div 
              ref={svgContainerRef}
              className="svg-container"
              dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
          </div>
        ) : (
          <p className="text-gray-400 font-bold text-xl absolute z-10">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}