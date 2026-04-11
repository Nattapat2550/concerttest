// frontend/src/pages/MyBookingPage.tsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react'; // นำเข้าไลบรารี

import ticketImg from '../assets/ticket.png';
import eraserImg from '../assets/eraser.png';
import calendarImg from '../assets/calendar.png';

interface Booking {
  id: number;
  concert_name: string;
  seat_code: string;
  price: number;
  status: string;
  qr_token: string; // เพิ่ม Token สำหรับ QR
}

export default function MyBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/api/concerts/my-bookings');
      setBookings(data || []);
    } catch (err: any) { console.error("No bookings found"); }
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

  return (
    <div className="w-full px-6 lg:px-12 2xl:px-20 py-12 md:py-16 min-h-[75vh]">
      <div className="flex items-center gap-4 mb-10 border-b border-outline pb-6">
        <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
          <img src={ticketImg} className="w-8 h-8 object-contain dark:invert" alt="My Tickets" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-text-main tracking-tight">
          ตั๋วคอนเสิร์ตของฉัน
        </h2>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-bg-card py-24 text-center rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-outline w-full max-w-4xl mx-auto">
          <img src={ticketImg} alt="Empty" className="w-20 h-20 mx-auto opacity-20 dark:invert mb-6" />
          <p className="text-text-sub text-xl font-bold">คุณยังไม่มีประวัติการจองตั๋ว</p>
          <p className="text-text-sub/70 mt-2">ไปที่หน้าคอนเสิร์ตเพื่อเริ่มจองประสบการณ์ของคุณเลย</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {bookings.map((b) => (
            <div key={b.id} className="relative bg-bg-card rounded-3xl shadow-sm hover:shadow-md border border-outline overflow-hidden flex flex-col sm:flex-row transition-all">
              
              <div className={`absolute left-0 top-0 w-2 h-full ${b.status === 'confirmed' ? 'bg-green-500' : (b.status === 'used' ? 'bg-gray-500' : 'bg-red-500')}`}></div>

              <div className="p-6 sm:p-8 flex-1 pl-8">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <h3 className={`text-2xl font-black leading-snug line-clamp-2 ${(b.status === 'cancelled' || b.status === 'used') ? 'text-text-sub' : 'text-text-main'} ${b.status === 'cancelled' ? 'line-through decoration-2' : ''}`}>
                    {b.concert_name}
                  </h3>
                  <span className={`shrink-0 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' : (b.status === 'used' ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50')}`}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-bg-main p-4 rounded-2xl border border-outline text-center">
                    <p className="text-xs text-text-sub font-bold uppercase mb-1">ที่นั่ง (SEAT)</p>
                    <p className="text-xl font-black text-brand">{b.seat_code}</p>
                  </div>
                  <div className="bg-bg-main p-4 rounded-2xl border border-outline text-center">
                    <p className="text-xs text-text-sub font-bold uppercase mb-1">ยอดชำระ (PRICE)</p>
                    <p className="text-xl font-black text-text-main">฿{b.price?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              <div className="sm:w-48 bg-bg-main/50 border-t sm:border-t-0 sm:border-l border-outline border-dashed p-6 flex flex-col justify-center items-center gap-3 relative">
                <div className="hidden sm:block absolute -top-4 -left-4 w-8 h-8 rounded-full bg-bg-main border-b border-r border-outline"></div>
                <div className="hidden sm:block absolute -bottom-4 -left-4 w-8 h-8 rounded-full bg-bg-main border-t border-r border-outline"></div>

                <img src={calendarImg} className="w-10 h-10 opacity-20 dark:invert mb-2" alt="Ticket Art" />
                
                {b.status === 'confirmed' ? (
                  <>
                    <button 
                      onClick={() => setSelectedTicket(b)} 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand font-bold rounded-xl transition-colors border border-brand/20"
                    >
                      ดู E-Ticket (QR)
                    </button>
                    <button 
                      onClick={() => handleCancel(b.id)} 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors border border-red-200 dark:border-red-800/50 text-sm"
                    >
                      <img src={eraserImg} alt="Cancel" className="w-4 h-4 object-contain" />
                      ยกเลิก
                    </button>
                  </>
                ) : b.status === 'used' ? (
                  <p className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg text-center w-full">ใช้งานแล้ว</p>
                ) : (
                  <p className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg text-center w-full">ถูกยกเลิกแล้ว</p>
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}

      {/* Modal E-Ticket QR Code */}
      {selectedTicket && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-bg-card rounded-3xl p-8 max-w-sm w-full relative shadow-2xl border border-outline">
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-text-sub hover:text-text-main text-3xl leading-none">&times;</button>
            <h3 className="text-xl font-black mb-6 text-center tracking-tight">E-Ticket Pass</h3>
            
            <div className="flex justify-center mb-6 bg-white p-4 rounded-xl mx-auto border border-gray-200 shadow-inner">
              <QRCodeCanvas value={selectedTicket.qr_token} size={220} level="H" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="font-bold text-lg text-text-main line-clamp-1">{selectedTicket.concert_name}</p>
              <div className="inline-block bg-brand/10 text-brand px-6 py-2 rounded-xl border border-brand/20 mt-2">
                <span className="text-sm font-bold uppercase opacity-80 mr-2">Seat:</span>
                <span className="font-black text-2xl">{selectedTicket.seat_code}</span>
              </div>
              <p className="text-text-sub text-sm mt-4 pt-4 border-t border-outline">โปรดแสดง QR Code นี้ให้เจ้าหน้าที่แสกนเพื่อเข้างาน</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}