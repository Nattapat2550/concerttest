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
  
  const [isBooking, setIsBooking] = useState(false);
  
  // 🌟 State จัดการหน้ารอคิว
  const [queueState, setQueueState] = useState('joining');
  const [myTicket, setMyTicket] = useState(0);
  const [currentTicket, setCurrentTicket] = useState(0);

  useEffect(() => {
    let queueInterval;
    let seatUpdateInterval;

    const fetchSeatMapDetails = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setConcert(data.concert);
        setSvgContent(data.svg_content || '');
        setConfiguredSeats(data.configured_seats || []);
        setBookedSeats(data.booked_seats || []);
      } catch (err) { 
        console.error("Error loading concert map"); 
      }
    };

    // ฟังก์ชันเช็คสถานะคิว
    const checkStatus = async (ticket) => {
      try {
        const { data } = await api.get(`/api/concerts/queue/status?ticket=${ticket}`);
        setCurrentTicket(data.current_ticket);
        
        if (data.status === 'ready') {
          setQueueState('ready');
          clearInterval(queueInterval);
          fetchSeatMapDetails();
          seatUpdateInterval = setInterval(fetchSeatMapDetails, 5000);
        }
      } catch (err) {}
    };

    // เข้าร่วมคิวทันทีที่เปิดหน้า
    const joinQueue = async () => {
      try {
        const { data } = await api.get('/api/concerts/queue/join');
        setMyTicket(data.ticket);
        
        // ✅ ถ้าระบบคนไม่เยอะ ข้ามหน้ารอไปเลย (Smart Bypass)
        if (data.status === 'ready') {
          setQueueState('ready');
          fetchSeatMapDetails();
          seatUpdateInterval = setInterval(fetchSeatMapDetails, 5000);
        } else {
          // ถ้าระบบคนล้น ถึงจะแสดงหน้ารอคิว
          setQueueState('waiting');
          checkStatus(data.ticket);
          queueInterval = setInterval(() => checkStatus(data.ticket), 3000);
        }
      } catch (err) {
        alert("ไม่สามารถเข้าร่วมคิวได้ ระบบอาจจะเต็ม");
      }
    };

    joinQueue();

    return () => {
      clearInterval(queueInterval);
      clearInterval(seatUpdateInterval);
    };
  }, [id]);

  const handleBook = async () => {
    if (!selectedSeat || isBooking) return;
    setIsBooking(true);
    
    try {
      await api.post('/api/concerts/book', { 
        concert_id: parseInt(id), 
        seat_code: selectedSeat.seat_code, 
        price: selectedSeat.price,
        queue_ticket: myTicket // ✅ แก้บัค 403: แนบตั๋วคิวไปให้ Backend ยืนยันว่าเราไม่ได้ลัดคิว
      });
      alert("🎉 จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        alert("❌ ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป กรุณาเลือกที่นั่งอื่น");
      } else if (status === 403) {
        alert("❌ ไม่อนุญาตให้จอง: คิวของคุณไม่ถูกต้อง หรือขาดการเชื่อมต่อ (Bot Prevention)");
      } else if (status === 500 || status === 503) {
        alert("⏳ ระบบกำลังมีผู้ใช้งานจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง");
      } else {
        alert("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }

      // โหลดแผนผังใหม่หลังจองพลาด
      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setBookedSeats(data.booked_seats || []);
      } catch (e) {}
      setSelectedSeat(null);
    } finally {
      setIsBooking(false);
    }
  };

  // 🌟 UI หน้ารอคิว (แสดงเฉพาะตอนคนแห่เข้าจองเยอะๆ จนโควต้าหมด)
  if (queueState === 'joining' || queueState === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full animate-fade-in">
          <div className="text-5xl mb-6 animate-bounce">🎟️</div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Waiting Room</h2>
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-6">กรุณารอสักครู่ ระบบกำลังจัดคิวให้คุณ...</p>
          
          <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-4 mb-4 border border-blue-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">คิวของคุณ</p>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{myTicket || '...'}</p>
          </div>
          
          <div className="flex justify-between text-sm font-bold text-gray-600 dark:text-gray-300 mt-6 px-2">
            <span>กำลังเรียกคิวที่: <span className="text-green-600 dark:text-green-400">{currentTicket || '...'}</span></span>
            <span>รออีก {Math.max(0, myTicket - currentTicket)} คิว</span>
          </div>

          <p className="text-xs text-red-500 font-bold mt-8 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            ⚠️ ห้ามรีเฟรชหรือปิดหน้านี้เด็ดขาด มิฉะนั้นคุณจะเสียคิวทันที
          </p>
        </div>
      </div>
    );
  }

  if (!concert) return <div className="text-center p-20 text-xl font-bold dark:text-white">กำลังโหลดข้อมูลแผนผังที่นั่ง...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 select-none animate-fade-in">
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
          disabled={!selectedSeat || isBooking} 
          className={`px-12 py-4 rounded-xl font-black text-white text-lg transition-all duration-300 ${
            selectedSeat && !isBooking
            ? 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-xl hover:shadow-green-500/50 cursor-pointer' 
            : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'
          }`}
        >
          {isBooking ? 'กำลังดำเนินการ... ⏳' : 'ยืนยันการจอง 🎟️'}
        </button>
      </div>
    </div>
  );
}