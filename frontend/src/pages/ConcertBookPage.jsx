import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import InteractiveSeatMap from '../components/InteractiveSeatMap';

export default function ConcertBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [concert, setConcert] = useState(null);
  const [svgContent, setSvgContent] = useState('');
  const [configuredSeats, setConfiguredSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setConcert(data.concert);
        setSvgContent(data.svg_content || '');
        setConfiguredSeats(data.configured_seats || []);
        setBookedSeats(data.booked_seats || []);
      } catch (err) { 
        alert("Error loading concert map"); 
      }
    };
    fetchDetails();
  }, [id]);

  const handleBook = async () => {
    if (!selectedSeat) return;
    try {
      await api.post('/api/concerts/book', { 
        concert_id: parseInt(id), 
        seat_code: selectedSeat.seat_code, 
        price: selectedSeat.price 
      });
      alert("🎉 จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      alert("❌ ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป กรุณาเลือกที่นั่งอื่น");
      // อัพเดตเฉพาะที่นั่งที่โดนจองใหม่ ไม่ต้องโหลดหน้าใหม่
      const { data } = await api.get(`/api/concerts/${id}`);
      setBookedSeats(data.booked_seats || []);
      setSelectedSeat(null);
    }
  };

  if (!concert) return <div className="text-center p-20 text-xl font-bold dark:text-white">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 select-none">
      <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{concert.name}</h2>
          <p className="text-gray-500 font-bold mt-1">📍 สถานที่: {concert.venue_name || concert.venue}</p>
        </div>
      </div>

      <InteractiveSeatMap 
        svgContent={svgContent}
        configuredSeats={configuredSeats}
        bookedSeats={bookedSeats}
        selectedSeat={selectedSeat}
        onSeatSelect={setSelectedSeat}
      />

      {/* Legend คำอธิบายสถานะที่นั่ง */}
      <div className="flex gap-4 justify-center mt-4 text-sm font-bold dark:text-gray-300">
         <span className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-400 rounded-full"></div> ที่นั่งโซนต่างๆ</span>
         <span className="flex items-center gap-1"><div className="w-4 h-4 bg-white border-2 border-red-500 rounded-full"></div> กำลังเลือก</span>
         <span className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-400 opacity-40 rounded-full"></div> ถูกจองแล้ว</span>
      </div>

      <div className="bg-blue-50 dark:bg-gray-900 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center border border-blue-200 dark:border-gray-700 mt-6 shadow-md transition-all">
        <div className="text-center sm:text-left mb-4 sm:mb-0">
          <p className="text-gray-600 dark:text-gray-400 font-bold">ที่นั่งที่กำลังเลือก</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white min-h-8">
             {selectedSeat ? (
               <>โซน {selectedSeat.zone_name} <span className="text-red-500 mx-2">|</span> {selectedSeat.seat_code}</>
             ) : (
               <span className="text-gray-400 text-lg font-normal">ยังไม่ได้เลือกที่นั่งบนแผนที่</span>
             )}
          </h3>
          <p className="mt-1 dark:text-gray-300">ราคารวม: <span className="font-black text-green-600 dark:text-green-400 text-xl">฿{selectedSeat ? selectedSeat.price : '0'}</span></p>
        </div>
        <button 
          onClick={handleBook} 
          disabled={!selectedSeat} 
          className={`px-12 py-4 rounded-xl font-black text-white text-lg transition-all duration-300 ${
            selectedSeat 
            ? 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-xl hover:shadow-green-500/50 cursor-pointer' 
            : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'
          }`}
        >
          ยืนยันการจอง 🎟️
        </button>
      </div>
    </div>
  );
}