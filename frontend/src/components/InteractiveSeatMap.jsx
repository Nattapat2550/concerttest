import React, { useEffect, useRef, useState } from 'react';

export default function InteractiveSeatMap({
  svgContent,
  configuredSeats = [],
  bookedSeats = [],
  selectedSeat = null,
  onSeatSelect
}) {
  const containerRef = useRef(null);
  const svgWrapperRef = useRef(null);
  const [showZoomHint, setShowZoomHint] = useState(false);

  // 🔥 ใช้ Ref เก็บค่า ซูม/ลาก ล้วนๆ (แก้ปัญหา "ซูมแล้วสีหาย" เพราะ React จะไม่ล้างจอเรนเดอร์ใหม่)
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // ฟังก์ชันยิงคำสั่งไปยืดหดภาพโดยตรง (ลื่นมากและภาพไม่ขาด)
  const updateTransform = () => {
    if (svgWrapperRef.current) {
      svgWrapperRef.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    }
  };

  // --- 1. ระบบ ZOOM ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = transform.current.scale + delta;
        newScale = Math.min(Math.max(1, newScale), 10); // ล็อกสเกลไว้ที่ 1x - 10x

        // ถ้าซูมกลับมาปกติ บังคับภาพกลับมาอยู่ตรงกลางเป๊ะๆ
        if (newScale === 1) {
          transform.current.x = 0;
          transform.current.y = 0;
        }

        transform.current.scale = newScale;
        updateTransform();
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // --- 2. ระบบลงสี (ทำงานครั้งเดียว หรือเมื่อคนกดจอง สีจะไม่มีวันหายตอนซูม) ---
  useEffect(() => {
    if (!svgWrapperRef.current || !svgContent) return;

    const seats = svgWrapperRef.current.querySelectorAll('.seat');
    const configMap = {};
    configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

    seats.forEach(seat => {
      const seatId = seat.getAttribute('id');
      const config = configMap[seatId];

      if (!config) {
        seat.setAttribute('data-status', 'unavailable');
        return;
      }

      // ใส่สีดั้งเดิมตามที่แอดมินตั้ง
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
          seat.parentNode.appendChild(seat); // เด้งมาไว้หน้าสุด
        } else {
          seat.removeAttribute('data-selected');
        }
      }
    });
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  // --- 3. ระบบ DRAG (ลากแผนที่) ---
  const handlePointerDown = (e) => {
    if (transform.current.scale === 1) return; // ถ้าไม่ได้ซูม ห้ามลากภาพ
    isDragging.current = false;
    dragStart.current = {
      x: e.clientX - transform.current.x,
      y: e.clientY - transform.current.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (transform.current.scale === 1 || !e.buttons) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    // 🔥 แก้ปัญหา "ซูมใกล้แล้วกดจองไม่ติด" -> ต้องลากเกิน 6 pixel ถึงจะมองว่าเป็นการ "ลาก" (กันมือสั่น)
    if (Math.abs(newX - transform.current.x) > 6 || Math.abs(newY - transform.current.y) > 6) {
      isDragging.current = true;
      transform.current.x = newX;
      transform.current.y = newY;
      updateTransform();
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  // --- 4. ระบบกดเลือกที่นั่ง ---
  const handleMapClick = (e) => {
    if (isDragging.current) return; // ถ้าเป็นการลากแผนที่ จะไม่นับเป็นการกดจอง

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
        onSeatSelect(config);
      }
    }
  };

  // ปุ่มควบคุม
  const handleZoomIn = () => {
    transform.current.scale = Math.min(transform.current.scale + 0.5, 10);
    updateTransform();
  };
  const handleZoomOut = () => {
    const newScale = Math.max(transform.current.scale - 0.5, 1);
    transform.current.scale = newScale;
    if (newScale === 1) {
      transform.current.x = 0;
      transform.current.y = 0;
    }
    updateTransform();
  };
  const handleReset = () => {
    transform.current.scale = 1;
    transform.current.x = 0;
    transform.current.y = 0;
    updateTransform();
  };

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

      {/* กรอบแผนที่ (จัดการ Events ทั้งหมดที่นี่) */}
      <div 
        ref={containerRef}
        className="bg-[#0f172a] rounded-xl flex items-center justify-center border dark:border-gray-600 shadow-inner overflow-hidden relative h-[650px] touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleMapClick}
      >
        <style>
          {`
            /* 🔥 แก้ภาพขาด: บังคับให้ SVG ไม่ว่าจะสเกลไหน ก็ต้องอยู่ในกล่อง 100% ไม่หลุดขอบ */
            .svg-wrapper > svg {
              width: 100% !important;
              height: 100% !important;
              max-height: 650px;
            }
            .seat {
              transition: filter 0.15s ease, stroke 0.15s ease;
              transform-origin: center;
              transform-box: fill-box;
            }
            .seat[data-status="unavailable"] { display: none !important; }
            .seat[data-status="available"] { opacity: 1; cursor: pointer; pointer-events: auto; }
            
            /* แก้กดไม่ติด: เอาคำสั่งขยายที่นั่งเวลาชี้เมาส์ออก เพราะมันทำให้เป้ากดดิ้นหนีมือตอนซูมใกล้ๆ */
            .seat[data-status="available"]:not([data-selected="true"]):hover {
              filter: brightness(1.3);
            }
            .seat[data-selected="true"] {
              stroke: #ef4444 !important;
              stroke-width: 4px !important;
              filter: drop-shadow(0px 0px 4px rgba(239, 68, 68, 0.6));
            }
            .seat[data-status="booked"] {
              fill: #9ca3af !important;
              opacity: 0.4 !important;
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
          /* 🔥 กล่องห่อหุ้ม SVG (ตัวที่จะถูกซูมและย้ายตำแหน่ง) */
          <div 
            ref={svgWrapperRef}
            className="svg-wrapper w-full h-full flex items-center justify-center origin-center transition-transform duration-75 ease-out"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <p className="text-gray-400 font-bold text-xl absolute z-10">ไม่มีแผนผัง Interactive สำหรับคอนเสิร์ตนี้</p>
        )}
      </div>
    </div>
  );
}