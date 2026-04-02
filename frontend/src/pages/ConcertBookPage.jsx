import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import InteractiveSeatMap from '../components/InteractiveSeatMap';
import WaitingRoom from '../components/WaitingRoom'; // ✅ นำเข้า Component ที่แยกไว้

export default function ConcertBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [concert, setConcert] = useState(null);
  const [svgContent, setSvgContent] = useState('');
  const [configuredSeats, setConfiguredSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  
  const [isBooking, setIsBooking] = useState(false);
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

    const joinQueue = async () => {
      try {
        const { data } = await api.get('/api/concerts/queue/join');
        setMyTicket(data.ticket);
        
        if (data.status === 'ready') {
          setQueueState('ready');
          fetchSeatMapDetails();
          seatUpdateInterval = setInterval(fetchSeatMapDetails, 5000);
        } else {
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
        queue_ticket: myTicket
      });
      alert("🎉 จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) alert("❌ ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป กรุณาเลือกที่นั่งอื่น");
      else if (status === 403) alert("❌ ไม่อนุญาตให้จอง: คิวของคุณไม่ถูกต้อง (Bot Prevention)");
      else if (status === 500 || status === 503) alert("⏳ ระบบกำลังมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้ง");
      else alert("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");

      try {
        const { data } = await api.get(`/api/concerts/${id}`);
        setBookedSeats(data.booked_seats || []);
      } catch (e) {}
      setSelectedSeat(null);
    } finally {
      setIsBooking(false);
    }
  };

  // ✅ เรียกใช้ WaitingRoom Component ถ้ายังไม่ถึงคิว
  if (queueState === 'joining' || queueState === 'waiting') {
    return <WaitingRoom myTicket={myTicket} currentTicket={currentTicket} />;
  }

  if (!concert) return <div className="text-center p-20 text-xl font-bold dark:text-white">กำลังโหลดข้อมูลแผนผังที่นั่ง...</div>;

  return (
    // ✅ เพิ่ม pb-28 บนมือถือ เพื่อไม่ให้แผนผังโดนแถบจองด้านล่างบัง
    <div className="max-w-7xl mx-auto p-4 md:p-6 mt-2 md:mt-6 bg-white dark:bg-gray-800 rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border dark:border-gray-700 select-none pb-28 md:pb-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{concert.name}</h2>
          <p className="text-sm md:text-base text-gray-500 font-bold mt-1">📍 สถานที่: {concert.venue_name || concert.venue}</p>
        </div>
      </div>

      {/* ✅ ปรับ Container ของแผนผังให้ซ่อน Scrollbar แต่ยังเลื่อนลื่นไหลบนมือถือ */}
      <div className="w-full overflow-x-auto overflow-y-hidden touch-pan-x touch-pan-y scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-150 md:min-w-full">
          <InteractiveSeatMap 
            svgContent={svgContent}
            configuredSeats={configuredSeats}
            bookedSeats={bookedSeats}
            selectedSeat={selectedSeat}
            onSeatSelect={setSelectedSeat}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 md:gap-4 justify-center mt-6 text-xs md:text-sm font-bold dark:text-gray-300">
         <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-gray-400 rounded-full"></div> ที่นั่งโซนต่างๆ</span>
         <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-white border-2 border-red-500 rounded-full"></div> กำลังเลือก</span>
         <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-gray-400 opacity-40 rounded-full"></div> ถูกจองแล้ว</span>
      </div>

      {/* ✅ ปรับ UI เป็น Sticky Bottom Bar บนมือถือ และเป็น กล่องปกติบน Desktop */}
      <div className="fixed md:static bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md dark:bg-gray-900/95 md:bg-blue-50 md:dark:bg-gray-900 p-4 md:p-6 rounded-t-3xl md:rounded-xl flex flex-row justify-between items-center border-t md:border border-gray-200 dark:border-gray-700 md:border-blue-200 mt-0 md:mt-6 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] md:shadow-md transition-all">
        <div className="flex flex-col">
          <p className="hidden md:block text-gray-600 dark:text-gray-400 font-bold">ที่นั่งที่กำลังเลือก</p>
          <h3 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white min-h-6 md:min-h-8">
             {selectedSeat ? (
               <>โซน {selectedSeat.zone_name} <span className="text-red-500 mx-1 md:mx-2">|</span> {selectedSeat.seat_code}</>
             ) : (
               <span className="text-gray-400 text-sm md:text-lg font-normal">ยังไม่ได้เลือกที่นั่ง</span>
             )}
          </h3>
          <p className="mt-0 md:mt-1 text-sm md:text-base dark:text-gray-300">รวม: <span className="font-black text-green-600 dark:text-green-400 text-lg md:text-xl">฿{selectedSeat ? selectedSeat.price : '0'}</span></p>
        </div>
        
        <button 
          onClick={handleBook} 
          disabled={!selectedSeat || isBooking} 
          className={`px-6 md:px-12 py-3 md:py-4 rounded-xl font-black text-white text-sm md:text-lg transition-all duration-300 ${
            selectedSeat && !isBooking
            ? 'bg-green-600 hover:bg-green-700 active:scale-95 md:hover:scale-105 shadow-lg shadow-green-500/30 cursor-pointer' 
            : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'
          }`}
        >
          {isBooking ? 'รอสักครู่...' : 'ยืนยันจอง'}
        </button>
      </div>
    </div>
  );
}