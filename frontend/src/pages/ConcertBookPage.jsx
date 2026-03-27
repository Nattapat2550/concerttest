import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ConcertBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [concert, setConcert] = useState(null);
  const [svgContent, setSvgContent] = useState('');
  const [configuredSeats, setConfiguredSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgContainerRef = useRef(null);
  const mapWrapperRef = useRef(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setConcert(data.concert);
        setSvgContent(data.svg_content || '');
        setConfiguredSeats(data.configured_seats || []);
        setBookedSeats(data.booked_seats || []);
      } catch (err) { alert("Error loading concert map"); }
    };
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (svgContent && svgContainerRef.current) {
      const seats = svgContainerRef.current.querySelectorAll('.seat');
      const configMap = {};
      configuredSeats.forEach(s => { configMap[s.seat_code] = s; });

      seats.forEach(seat => {
        const seatId = seat.getAttribute('id');
        const config = configMap[seatId];

        seat.onclick = null;
        seat.onmouseover = null;
        seat.onmouseout = null;
        seat.style.transition = 'transform 0.1s ease-in-out';

        if (!config) {
          seat.style.opacity = '0'; // ซ่อนที่นั่งที่ไม่ได้ระบายสี
          seat.style.pointerEvents = 'none';
          return;
        }

        const isBooked = bookedSeats.includes(seatId);
        const isSelected = selectedSeat?.seat_code === seatId;

        seat.style.opacity = '1';
        seat.style.pointerEvents = 'auto';

        if (isBooked) {
          seat.style.fill = '#475569'; 
          seat.style.cursor = 'not-allowed';
          seat.style.opacity = '0.3';
        } else {
          seat.style.fill = isSelected ? '#ffffff' : config.color; 
          seat.style.stroke = isSelected ? '#ef4444' : 'none';
          seat.style.strokeWidth = isSelected ? '3px' : '0';
          seat.style.cursor = 'pointer';
          
          seat.onmouseover = () => { if(!isSelected) seat.style.transform = 'scale(1.4)'; };
          seat.onmouseout = () => { if(!isSelected) seat.style.transform = 'scale(1)'; };
          
          seat.onclick = (e) => { 
            e.stopPropagation(); 
            setSelectedSeat(config); 
          };
        }
      });
    }
  }, [svgContent, configuredSeats, bookedSeats, selectedSeat]);

  const handleWheel = (e) => {
    e.preventDefault();
    const newScale = Math.min(Math.max(0.5, scale + (e.deltaY * -0.002)), 8);
    setScale(newScale);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
      return () => wrapper.removeEventListener('wheel', handleWheel);
    }
  }, [scale]);

  const handleBook = async () => {
    if (!selectedSeat) return;
    try {
      await api.post('/api/concerts/book', { concert_id: parseInt(id), seat_code: selectedSeat.seat_code, price: selectedSeat.price });
      alert("🎉 จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      alert("❌ ที่นั่งนี้เพิ่งถูกจองไป กรุณาเลือกที่นั่งอื่น");
      const { data } = await api.get(`/api/concerts/${id}`);
      setBookedSeats(data.booked_seats || []);
      setSelectedSeat(null);
    }
  };

  if (!concert) return <div className="text-center p-20 text-xl font-bold dark:text-white">กำลังโหลด...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 select-none">
      <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{concert.name}</h2>
          <p className="text-gray-500 font-bold">📍 {concert.venue_name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="bg-gray-200 px-3 py-1 rounded font-bold">-</button>
          <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="bg-gray-200 px-3 py-1 rounded font-bold text-sm">RESET</button>
          <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="bg-gray-200 px-3 py-1 rounded font-bold">+</button>
        </div>
      </div>

      <div 
        ref={mapWrapperRef}
        className={`bg-[#0f172a] rounded-xl flex items-center justify-center shadow-inner overflow-hidden relative h-[650px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-lg shadow pointer-events-none z-10 font-bold text-sm">
          🔍 เลื่อนลูกกลิ้งเมาส์เพื่อซูม / คลิกค้างเพื่อเลื่อนแผนที่
        </div>

        {svgContent ? (
          <div ref={svgContainerRef} className="absolute origin-center transition-transform duration-75"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }} />
        ) : (
          <p className="text-gray-400 font-bold text-xl">ไม่มีแผนผังสำหรับคอนเสิร์ตนี้</p>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-gray-900 p-6 rounded-xl flex justify-between items-center border border-blue-200 dark:border-gray-700 mt-6 shadow-md">
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-bold">ที่นั่งที่กำลังเลือก</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
             {selectedSeat ? (<>โซน {selectedSeat.zone_name} <span className="text-red-500 mx-2">|</span> {selectedSeat.seat_code}</>) : (<span className="text-gray-400 font-normal">ยังไม่ได้เลือกที่นั่งบนแผนที่</span>)}
          </h3>
          <p className="mt-1 dark:text-gray-300">ราคารวม: <span className="font-black text-green-600 text-xl">฿{selectedSeat ? selectedSeat.price : '0'}</span></p>
        </div>
        <button onClick={handleBook} disabled={!selectedSeat} className={`px-12 py-4 rounded-xl font-black text-white text-lg ${selectedSeat ? 'bg-green-600 hover:bg-green-700 shadow-xl' : 'bg-gray-400 cursor-not-allowed'}`}>
          ยืนยันการจอง 🎟️
        </button>
      </div>
    </div>
  );
}