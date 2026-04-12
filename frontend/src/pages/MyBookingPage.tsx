// frontend/src/pages/MyBookingPage.tsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

import ticketImg from '../assets/ticket.png';
import eraserImg from '../assets/eraser.png';
import calendarImg from '../assets/calendar.png';

interface Booking {
  id: number;
  concert_name: string;
  seat_code: string;
  price: number;
  status: string;
  qr_token: string;
  eticket_config: string; 
}

interface EticketConfig {
  bgUrl: string;
  width: number;
  height: number;
  qr: { x: number; y: number; size: number };
  seat: { x: number; y: number; size: number; color: string };
  name: { x: number; y: number; size: number; color: string };
}

export default function MyBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);

  useEffect(() => { 
    fetchBookings(); 
    fetchWallet();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/api/concerts/my-bookings');
      setBookings(data || []);
    } catch (err: any) { console.error("No bookings found"); }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/api/concerts/wallet');
      setWallet(data.balance || 0);
    } catch (e) { }
  };

  const handleTopup = async () => {
    const amount = prompt("ใส่จำนวน GTYCoin ที่ต้องการเติม (จำลองระบบธนาคาร)");
    if (amount && !isNaN(Number(amount))) {
      try {
        await api.post('/api/concerts/wallet/topup', { amount: Number(amount) });
        alert("เติมเงินเข้าระบบสำเร็จ!");
        fetchWallet();
      } catch (e) { alert("เกิดข้อผิดพลาดในการเติมเงิน"); }
    }
  };

  const handlePayment = async (bookingId: number) => {
    if (window.confirm("ยืนยันการชำระเงินด้วย GTYCoin?")) {
      try {
        await api.post(`/api/concerts/bookings/${bookingId}/pay`);
        alert("ชำระเงินสำเร็จ! บัตรของคุณได้รับการยืนยันแล้ว");
        fetchWallet();
        fetchBookings();
      } catch (err: any) { 
        alert(err.response?.data?.error || "GTYCoin ไม่พอหรือเกิดข้อผิดพลาด"); 
      }
    }
  };

  const handleCancel = async (id: number) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกตั๋วใบนี้? ระบบจะปล่อยที่นั่งคืนทันที")) {
      try {
        await api.put(`/api/concerts/bookings/${id}/cancel`);
        alert("ยกเลิกตั๋วสำเร็จ");
        fetchBookings();
      } catch (err: any) { alert("เกิดข้อผิดพลาดในการยกเลิก"); }
    }
  };

  const renderEticket = (ticket: Booking) => {
    let config: EticketConfig | null = null;
    try {
      if (ticket.eticket_config && ticket.eticket_config !== "{}") {
        config = JSON.parse(ticket.eticket_config);
      }
    } catch (e) {}

    // กรณี Admin ออกแบบ Template ไว้
    if (config && config.bgUrl) {
      return (
        <div 
          className="relative mx-auto bg-cover bg-center shadow-lg rounded-xl overflow-hidden" 
          style={{ width: config.width || 350, height: config.height || 500, backgroundImage: `url(${config.bgUrl})` }}
        >
          <div style={{ position: 'absolute', top: config.qr?.y || 50, left: config.qr?.x || 50 }}>
            <QRCodeCanvas value={ticket.qr_token} size={config.qr?.size || 100} level="H" />
          </div>
          <div style={{ position: 'absolute', top: config.seat?.y || 200, left: config.seat?.x || 50, color: config.seat?.color || '#000', fontSize: config.seat?.size || 16, fontWeight: 'bold' }}>
            {ticket.seat_code}
          </div>
          <div style={{ position: 'absolute', top: config.name?.y || 230, left: config.name?.x || 50, color: config.name?.color || '#000', fontSize: config.name?.size || 14, fontWeight: 'bold' }}>
            {ticket.concert_name}
          </div>
        </div>
      );
    }

    // กรณีคอนเสิร์ตนี้ไม่มี Template ให้ใช้ Layout รูปแบบมาตรฐานของระบบ
    return (
      <div className="bg-white p-6 rounded-3xl mx-auto border border-gray-200 shadow-inner w-full">
        <div className="flex justify-center mb-6">
          <QRCodeCanvas value={ticket.qr_token} size={220} level="H" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-bold text-lg text-gray-900 line-clamp-1">{ticket.concert_name}</p>
          <div className="inline-block bg-blue-50 text-blue-600 px-6 py-2 rounded-xl border border-blue-200 mt-2">
            <span className="text-sm font-bold uppercase opacity-80 mr-2">Seat:</span>
            <span className="font-black text-2xl">{ticket.seat_code}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-6 lg:px-12 2xl:px-20 py-12 md:py-16 min-h-[75vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-outline pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
            <img src={ticketImg} className="w-8 h-8 object-contain dark:invert" alt="My Tickets" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-text-main tracking-tight">ตั๋วของฉัน</h2>
        </div>
        
        {/* Wallet UI */}
        <div className="flex items-center gap-4 bg-brand/10 px-5 py-3 rounded-2xl border border-brand/20">
          <div>
            <p className="text-xs font-bold text-text-sub uppercase">ยอดเงิน GTYCoin</p>
            <p className="text-xl font-black text-brand">{wallet.toLocaleString()} เหรียญ</p>
          </div>
          <button onClick={handleTopup} className="px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition">
            เติมเงิน
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-bg-card py-24 text-center rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline w-full max-w-4xl mx-auto">
          <img src={ticketImg} alt="Empty" className="w-20 h-20 mx-auto opacity-20 dark:invert mb-6" />
          <p className="text-text-sub text-xl font-bold">คุณยังไม่มีประวัติการจองตั๋ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {bookings.map((b) => (
            <div key={b.id} className="relative bg-bg-card rounded-3xl shadow-sm hover:shadow-md border border-outline overflow-hidden flex flex-col sm:flex-row transition-all">
              
              <div className={`absolute left-0 top-0 w-2 h-full ${b.status === 'confirmed' ? 'bg-green-500' : (b.status === 'wait' ? 'bg-yellow-400' : 'bg-gray-500')}`}></div>

              <div className="p-6 sm:p-8 flex-1 pl-8">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <h3 className={`text-2xl font-black leading-snug line-clamp-2 ${b.status === 'cancelled' ? 'text-text-sub line-through' : 'text-text-main'}`}>
                    {b.concert_name}
                  </h3>
                  <span className={`shrink-0 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                    b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' 
                    : b.status === 'wait' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-bg-main p-4 rounded-2xl border border-outline text-center">
                    <p className="text-xs text-text-sub font-bold uppercase mb-1">ที่นั่ง (SEAT)</p>
                    <p className="text-xl font-black text-brand">{b.seat_code}</p>
                  </div>
                  <div className="bg-bg-main p-4 rounded-2xl border border-outline text-center">
                    <p className="text-xs text-text-sub font-bold uppercase mb-1">ยอดชำระ</p>
                    <p className="text-xl font-black text-text-main">฿{b.price?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              <div className="sm:w-56 bg-bg-main/50 border-t sm:border-t-0 sm:border-l border-outline border-dashed p-6 flex flex-col justify-center items-center gap-3 relative">
                <div className="hidden sm:block absolute -top-4 -left-4 w-8 h-8 rounded-full bg-bg-main border-b border-r border-outline"></div>
                <div className="hidden sm:block absolute -bottom-4 -left-4 w-8 h-8 rounded-full bg-bg-main border-t border-r border-outline"></div>

                <img src={calendarImg} className="w-10 h-10 opacity-20 dark:invert mb-2" alt="Ticket Art" />
                
                {b.status === 'wait' ? (
                  <>
                    <button 
                      onClick={() => handlePayment(b.id)} 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition-colors shadow-sm"
                    >
                      ชำระเงิน {b.price} เหรียญ
                    </button>
                    <button onClick={() => handleCancel(b.id)} className="w-full text-sm text-red-500 font-bold mt-1">ยกเลิก</button>
                  </>
                ) : b.status === 'confirmed' ? (
                  <button 
                    onClick={() => setSelectedTicket(b)} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand font-bold rounded-xl transition-colors border border-brand/20"
                  >
                    ดู E-Ticket (QR)
                  </button>
                ) : (
                  <p className="text-sm font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-lg text-center w-full">หมดอายุ / ยกเลิก</p>
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}

      {/* Modal E-Ticket QR Code */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="relative w-full max-w-md">
            {/* Close Button placed outside or top of ticket to prevent overlap */}
            <button 
              onClick={() => setSelectedTicket(null)} 
              className="absolute -top-10 right-0 text-white hover:text-gray-200 text-3xl font-bold leading-none z-50 drop-shadow-md"
            >
              &times;
            </button>
            
            {/* Render Template ของ E-Ticket */}
            {renderEticket(selectedTicket)}

            <p className="text-white text-center text-sm mt-6 font-bold tracking-wide drop-shadow-md">
              โปรดแสดง QR Code นี้ให้เจ้าหน้าที่แสกนเพื่อเข้างาน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}