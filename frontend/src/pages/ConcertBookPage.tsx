import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import InteractiveSeatMap from '../components/InteractiveSeatMap';
import WaitingRoom from '../components/WaitingRoom';

export default function ConcertBookPage() {
 const { id } = useParams(); 
 const navigate = useNavigate();
 
 const [concert, setConcert] = useState<any>(null);
 const [svgContent, setSvgContent] = useState<string>('');
 const [configuredSeats, setConfiguredSeats] = useState<any[]>([]);
 const [bookedSeats, setBookedSeats] = useState<string[]>([]);
 const [waitSeats, setWaitSeats] = useState<string[]>([]); 
 const [selectedSeat, setSelectedSeat] = useState<any>(null);
 const [focusZone, setFocusZone] = useState<string>('');
 
 const [isBooking, setIsBooking] = useState(false);
 const [queueState, setQueueState] = useState('joining');
 const [myTicket, setMyTicket] = useState(0);
 const [currentTicket, setCurrentTicket] = useState(0);

 useEffect(() => {
 let queueInterval: ReturnType<typeof setInterval>;
 let seatUpdateInterval: ReturnType<typeof setInterval>;

 const fetchSeatMapDetails = async () => {
 try {
 const { data } = await api.get(`/api/concerts/${id}`);
 setConcert(data.concert);
 setSvgContent(data.svg_content || '');
 setConfiguredSeats(data.configured_seats || []);
 setBookedSeats(data.booked_seats || []);
 setWaitSeats(data.wait_seats || []); 
 } catch (err: any) { 
 console.error("Error loading concert map"); 
 }
 };

 const checkStatus = async (ticket: number) => {
 try {
 const { data } = await api.get(`/api/concerts/${id}/queue/status?ticket=${ticket}`);
 setCurrentTicket(data.current_ticket);
 
 if (data.status === 'ready') {
 setQueueState('ready');
 clearInterval(queueInterval);
 fetchSeatMapDetails();
 seatUpdateInterval = setInterval(fetchSeatMapDetails, 5000);
 }
 } catch (err: any) {}
 };

 const joinQueue = async () => {
 try {
 const { data } = await api.get(`/api/concerts/${id}/queue/join`);
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
 } catch (err: any) {
 console.error("Join Queue Error:", err.response || err); 
 const status = err.response?.status;
 
 if (status === 401) {
 alert("กรุณาเข้าสู่ระบบก่อนทำการจองที่นั่ง");
 navigate('/login');
 } else if (status === 403) {
 alert(err.response?.data?.error || "บัญชีของคุณถูกระงับ หรือไม่มีสิทธิ์เข้าคิว");
 navigate('/');
 } else {
 alert(`ไม่สามารถเข้าร่วมคิวได้ (Error: ${status || 'Network'})`);
 }
 }
 };

 joinQueue();

 return () => {
 clearInterval(queueInterval);
 clearInterval(seatUpdateInterval);
 };
 }, [id]);

 const handleBook = async () => {
 if (!selectedSeat || isBooking || !concert) return;
 setIsBooking(true);
 
 try {
 await api.post('/api/concerts/book', { 
 concert_id: concert.id, 
 seat_code: selectedSeat.seat_code, 
 price: selectedSeat.price,
 queue_ticket: myTicket
 });
 alert("🎉 จองที่นั่งสำเร็จ! กรุณาชำระเงินภายใน 10 นาที");
 navigate('/my-bookings');
 } catch (err: any) {
 const status = err.response?.status;
 if (status === 409) alert("❌ ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป กรุณาเลือกที่นั่งอื่น");
 else if (status === 403) alert("❌ ไม่อนุญาตให้จอง: คิวของคุณไม่ถูกต้อง (Bot Prevention)");
 else if (status === 500 || status === 503) alert("⏳ ระบบกำลังมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้ง");
 else alert("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");

 try {
 const { data } = await api.get(`/api/concerts/${id}`);
 setBookedSeats(data.booked_seats || []);
 setWaitSeats(data.wait_seats || []); 
 } catch (e: any) {}
 setSelectedSeat(null);
 } finally {
 setIsBooking(false);
 }
 };

 if (queueState === 'joining' || queueState === 'waiting') {
 return <WaitingRoom myTicket={myTicket} currentTicket={currentTicket} />;
 }

 if (!concert) return <div className="text-center p-20 text-xl font-bold ">กำลังโหลดข้อมูลแผนผังที่นั่ง...</div>;

 const uniqueZones = useMemo(() => {
   if (!svgContent) return [];
   try {
     const parser = new DOMParser();
     const doc = parser.parseFromString(svgContent, 'image/svg+xml');
     const groups = doc.querySelectorAll('g[id]');
     const zones = new Set<string>();
     groups.forEach(g => {
       const id = g.getAttribute('id');
       // Include groups with an ID, but not individual seats
       if (id && !id.toLowerCase().includes('seat') && g.querySelectorAll('circle, ellipse, rect, path, polygon').length > 0) {
         zones.add(id);
       }
     });
     // Fallback to configuredSeats if no groups found
     if (zones.size === 0) {
       configuredSeats.forEach(s => s.zone_name && zones.add(s.zone_name));
     }
     return Array.from(zones);
   } catch (e) {
     return Array.from(new Set(configuredSeats.map(s => s.zone_name))).filter(Boolean);
   }
 }, [svgContent, configuredSeats]);
 
 const ZoneSelector = () => (
  <select 
    value={focusZone} 
    onChange={e => setFocusZone(e.target.value)}
    className="px-3 py-2 border rounded-lg bg-canvas text-ink text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto min-w-[200px]"
  >
    <option value="">-- เลือกโซนเพื่อซูม --</option>
    {uniqueZones.map(z => (
      <option key={z as string} value={z as string}>โซน {z as string}</option>
    ))}
  </select>
 );

  return (
  <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-canvas select-none overflow-hidden animate-fade-in z-50">
  {/* Header */}
  <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 shrink-0">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 md:mb-4 border-b pb-2 md:pb-4">
  <div className="w-full wrap-break-word flex justify-between items-center">
    <div>
      <h2 className="text-2xl md:text-3xl font-black text-ink leading-tight">{concert.name}</h2>
      <p className="text-sm md:text-base text-muted font-bold mt-1">📍 สถานที่: {concert.venue_name || concert.venue}</p>
    </div>
    
    {/* Zone Dropdown */}
    <div className="ml-4 shrink-0 hidden md:block">
      <ZoneSelector />
    </div>
  </div>
  </div>
  </div>

  {/* Zone Select for Mobile */}
  <div className="w-full px-4 mb-2 md:hidden shrink-0">
    <ZoneSelector />
  </div>

  {/* Map Container */}
  <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 md:px-6 relative">
  <div className="w-full h-full relative rounded-lg overflow-hidden border">
  <InteractiveSeatMap 
  concertId={id}
  svgContent={svgContent}
  configuredSeats={configuredSeats}
  bookedSeats={bookedSeats}
  waitSeats={waitSeats} 
  selectedSeat={selectedSeat}
  onSeatSelect={setSelectedSeat}
  focusZone={focusZone}
  />
  </div>
  </div>

  {/* Legend */}
  <div className="shrink-0 flex flex-wrap gap-3 md:gap-4 justify-center mt-3 mb-2 text-xs md:text-sm font-bold px-2">
  <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-gray-400 rounded-full"></div> ที่นั่งโซนต่างๆ</span>
  <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-canvas border-2 border-red-500 rounded-full"></div> กำลังเลือก</span>
  <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-[#eab308] rounded-full"></div> รอชำระเงิน</span>
  <span className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full"></div> ถูกจองแล้ว</span>
  </div>

  {/* Bottom Bar */}
  <div className="shrink-0 w-full bg-canvas/95 backdrop-blur-md md:bg-blue-50 md:p-4 p-4 flex flex-row justify-between items-center border-t border-outline md:border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-all z-50">
  <div className="max-w-7xl mx-auto w-full flex flex-row justify-between items-center">
    <div className="flex flex-col flex-1 truncate pr-2">
    <p className="hidden md:block text-muted font-bold text-sm">ที่นั่งที่กำลังเลือก</p>
    <h3 className="text-base md:text-2xl font-black text-ink truncate">
    {selectedSeat ? (
    <>โซน {selectedSeat.zone_name} <span className="text-red-500 mx-1">|</span> {selectedSeat.seat_code}</>
    ) : (
    <span className="text-muted text-sm md:text-lg font-normal">ยังไม่ได้เลือกที่นั่ง</span>
    )}
    </h3>
    <p className="mt-0 md:mt-1 text-xs md:text-base ">รวม: <span className="font-black text-green-600 text-base md:text-xl">฿{selectedSeat ? selectedSeat.price : '0'}</span></p>
    </div>
    
    <button 
    onClick={handleBook} 
    disabled={!selectedSeat || isBooking} 
    className={`shrink-0 px-5 md:px-12 py-3 md:py-4 rounded-lg font-black text-white text-sm md:text-lg transition-all duration-300 ${
    selectedSeat && !isBooking
    ? 'bg-green-600 hover:bg-green-700 active:scale-95 md:hover:scale-105 shadow-lg shadow-green-500/30 cursor-pointer' 
    : 'bg-gray-400 cursor-not-allowed opacity-70'
    }`}
    >
    {isBooking ? 'รอสักครู่...' : 'ยืนยันจอง'}
    </button>
  </div>
  </div>
  </div>
 );
}