import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ConcertBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [concert, setConcert] = useState(null);
  const [masterSvg, setMasterSvg] = useState('');
  
  const [activeZone, setActiveZone] = useState(null);
  const [zoneSvg, setZoneSvg] = useState('');
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeatCode, setSelectedSeatCode] = useState(null);

  const containerRef = useRef(null);

  // 1. โหลดข้อมูลคอนเสิร์ตและผังรวม
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setConcert(data.concert);
        setMasterSvg(data.master_svg);
      } catch (err) { alert("Error loading concert map"); }
    };
    fetchMaster();
  }, [id]);

  // 2. ผูก Event Click ให้กับโซนต่างๆ ใน Master SVG
  useEffect(() => {
    if (!activeZone && masterSvg && containerRef.current) {
      const zones = containerRef.current.querySelectorAll('.zone-clickable');
      zones.forEach(zone => {
        zone.style.cursor = 'pointer';
        zone.onclick = () => loadZone(zone.getAttribute('id'));
      });
    }
  }, [masterSvg, activeZone]);

  // 3. โหลดผังเก้าอี้ของโซนที่เลือก
  const loadZone = async (zoneName) => {
    try {
      const { data } = await api.get(`/api/concerts/${id}/zones/${zoneName}`);
      if (!data.sub_svg) return alert(`ขออภัย ยังไม่เปิดขายหรือยังไม่มีผังสำหรับโซน ${zoneName}`);
      
      setZoneSvg(data.sub_svg);
      setBookedSeats(data.booked_seats || []);
      setActiveZone(zoneName);
      setSelectedSeatCode(null);
    } catch (err) { alert("ไม่สามารถโหลดผังที่นั่งได้"); }
  };

  // 4. ผูก Event ให้กับเก้าอี้แต่ละตัวใน Sub SVG
  useEffect(() => {
    if (activeZone && zoneSvg && containerRef.current) {
      const seats = containerRef.current.querySelectorAll('.seat');
      seats.forEach(seat => {
        const seatId = seat.getAttribute('id');
        if (!seatId) return;

        const isBooked = bookedSeats.includes(seatId);
        const isSelected = selectedSeatCode === seatId;

        seat.style.transition = 'all 0.15s ease-in-out';
        seat.onmouseover = null;
        seat.onmouseout = null;

        if (isBooked) {
          seat.style.fill = '#9ca3af'; 
          seat.style.cursor = 'not-allowed';
          seat.style.opacity = '0.3';
          seat.onclick = null;
        } else {
          seat.style.fill = isSelected ? '#ef4444' : '#22c55e'; // แดง (กำลังเลือก), เขียว (ว่าง)
          seat.style.cursor = 'pointer';
          seat.style.opacity = '1';
          
          seat.onmouseover = () => { if(!isSelected) seat.style.transform = 'scale(1.2)'; };
          seat.onmouseout = () => { if(!isSelected) seat.style.transform = 'scale(1)'; };
          seat.onclick = () => setSelectedSeatCode(seatId);
        }
      });
    }
  }, [zoneSvg, bookedSeats, selectedSeatCode, activeZone]);

  const handleBook = async () => {
    if (!selectedSeatCode) return;
    try {
      await api.post('/api/concerts/book', { 
        concert_id: parseInt(id), 
        seat_code: selectedSeatCode, 
        price: concert.ticket_price 
      });
      alert("🎉 จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      alert("❌ ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป กรุณาเลือกที่นั่งอื่น");
      loadZone(activeZone); // รีเฟรชโซนทันที
    }
  };

  if (!concert) return <div className="text-center p-20 text-xl font-bold dark:text-white">กำลังโหลดข้อมูลคอนเสิร์ต...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{concert.name}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">📍 สถานที่: {concert.venue_name || concert.venue}</p>
        </div>
        {activeZone && (
          <button onClick={() => setActiveZone(null)} className="mt-4 md:mt-0 px-5 py-2 bg-gray-800 dark:bg-gray-600 text-white rounded-lg font-bold shadow hover:bg-gray-700 transition">
            ⬅️ กลับไปดูผังรวม
          </button>
        )}
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4 flex flex-col items-center min-h-[500px] border dark:border-gray-700 shadow-inner overflow-hidden relative">
        {!activeZone ? (
          <div className="w-full h-full max-w-4xl flex flex-col items-center">
            {masterSvg ? (
              <>
                <span className="bg-white dark:bg-gray-800 px-4 py-1 rounded-full text-sm font-bold shadow mb-4 text-blue-600 dark:text-blue-400">👆 คลิกเลือกโซนที่ต้องการจอง</span>
                <div ref={containerRef} className="w-full interactive-master-svg" dangerouslySetInnerHTML={{ __html: masterSvg }} />
              </>
            ) : (
              <p className="mt-20 text-gray-400 font-bold text-xl">ไม่มีแผนผัง Interactive Map สำหรับคอนเสิร์ตนี้</p>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-3xl font-black mb-4 text-white bg-blue-600 px-8 py-2 rounded-full shadow border-2 border-white tracking-widest">
              ZONE {activeZone}
            </h3>
            <div className="flex gap-4 mb-4 text-sm font-bold bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow dark:text-white">
              <span className="flex items-center gap-1"><div className="w-4 h-4 bg-green-500 rounded-full"></div> ว่าง</span>
              <span className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded-full"></div> กำลังเลือก</span>
              <span className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-400 rounded-full opacity-50"></div> จองแล้ว</span>
            </div>
            <div ref={containerRef} className="w-full max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border dark:border-gray-700 interactive-sub-svg" dangerouslySetInnerHTML={{ __html: zoneSvg }} />
          </div>
        )}
      </div>

      {activeZone && (
        <div className="bg-blue-50 dark:bg-gray-900 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center border border-blue-200 dark:border-gray-700 mt-6 shadow-md">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <p className="text-gray-600 dark:text-gray-400 font-bold">ที่นั่งที่กำลังเลือก</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              โซน {activeZone} <span className="text-red-600 mx-2">|</span> {selectedSeatCode || <span className="text-gray-400 font-normal text-lg">ยังไม่ได้เลือก</span>}
            </h3>
            <p className="mt-1 dark:text-gray-300">ราคารวม: <span className="font-black text-green-600 dark:text-green-400 text-xl">฿{concert.ticket_price}</span></p>
          </div>
          <button onClick={handleBook} disabled={!selectedSeatCode} className={`px-12 py-4 rounded-xl font-black text-white text-lg transition-transform ${selectedSeatCode ? 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-xl' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'}`}>
            ยืนยันการจอง 🎟️
          </button>
        </div>
      )}
    </div>
  );
}