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

  // โหลดรูปตั๋วลงเครื่อง
  const handleDownloadTicket = async () => {
    if (!selectedTicket) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let config: any = null;
    try { if (selectedTicket.eticket_config) config = JSON.parse(selectedTicket.eticket_config); } catch (e) {}

    if (config && config.bgUrl) {
      canvas.width = config.width || 350;
      canvas.height = config.height || 600;
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // เพื่อให้เซฟรูปที่มาจากเว็บอื่นได้
      img.src = config.bgUrl;
      await new Promise(r => img.onload = r);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const qrCanvas = document.querySelector('.qr-code-canvas') as HTMLCanvasElement;
      if (qrCanvas) ctx.drawImage(qrCanvas, config.qr?.x || 50, config.qr?.y || 50, config.qr?.size || 100, config.qr?.size || 100);

      ctx.fillStyle = config.seat?.color || '#000';
      ctx.font = `bold ${config.seat?.size || 16}px sans-serif`;
      ctx.fillText(selectedTicket.seat_code, config.seat?.x || 50, (config.seat?.y || 200) + (config.seat?.size || 16));

      ctx.fillStyle = config.name?.color || '#000';
      ctx.font = `bold ${config.name?.size || 14}px sans-serif`;
      ctx.fillText(selectedTicket.concert_name, config.name?.x || 50, (config.name?.y || 230) + (config.name?.size || 14));
    } else {
      // ตั๋วแบบ Default
      canvas.width = 400; canvas.height = 500;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 400, 500);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, 0, 400, 80);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('E-TICKET', 140, 50);
      ctx.fillStyle = '#000000'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(selectedTicket.concert_name, 30, 140);
      ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = '#2563eb'; ctx.fillText(`Seat: ${selectedTicket.seat_code}`, 30, 190);
      const qrCanvas = document.querySelector('.qr-code-canvas') as HTMLCanvasElement;
      if (qrCanvas) ctx.drawImage(qrCanvas, 100, 240, 200, 200);
    }

    const link = document.createElement('a');
    link.download = `ETicket_${selectedTicket.seat_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const renderEticket = (ticket: Booking) => {
    let config: any = null;
    try { if (ticket.eticket_config && ticket.eticket_config !== "{}") config = JSON.parse(ticket.eticket_config); } catch (e) {}

    if (config && config.bgUrl) {
      return (
        <div className="relative mx-auto bg-cover bg-center shadow-lg rounded-xl overflow-hidden bg-white" style={{ width: config.width || 350, height: config.height || 500, backgroundImage: `url(${config.bgUrl})` }}>
          <div style={{ 
            position: 'absolute', 
            top: config.qr?.y || 50, 
            left: config.qr?.x || 50,
            backgroundColor: '#ffffff', /* บังคับพื้นหลังกล่องเป็นสีขาว */
            padding: '10px', /* สร้างขอบขาวรอบๆ ตัว QR Code */
            borderRadius: '8px' /* (ตัวเลือกเสริม) ลบมุมให้สวยงาม */
          }}>
            <QRCodeCanvas 
              className="qr-code-canvas" 
              value={ticket.qr_token} 
              size={config.qr?.size ? config.qr.size - 20 : 80} /* ลดขนาดตัว QR ลงนิดหน่อยเพื่อเผื่อพื้นที่ให้ padding */
              level="M" /* แนะนำให้เปลี่ยนจาก "H" เป็น "M" */
              includeMargin={true} /* บังคับให้สร้างขอบขาวจากตัวไลบรารีด้วย */
            />
          </div>
          <div style={{ position: 'absolute', top: config.seat?.y || 200, left: config.seat?.x || 50, color: config.seat?.color || '#000', fontSize: config.seat?.size || 16, fontWeight: 'bold' }}>{ticket.seat_code}</div>
          <div style={{ position: 'absolute', top: config.name?.y || 230, left: config.name?.x || 50, color: config.name?.color || '#000', fontSize: config.name?.size || 14, fontWeight: 'bold' }}>{ticket.concert_name}</div>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-3xl mx-auto border border-gray-200 shadow-inner w-full max-w-sm">
        <div className="flex justify-center mb-6"><QRCodeCanvas className="qr-code-canvas" value={ticket.qr_token} size={220} level="H" /></div>
        <div className="text-center space-y-2">
          <p className="font-bold text-lg text-gray-900 line-clamp-1">{ticket.concert_name}</p>
          <div className="inline-block bg-blue-50 text-blue-600 px-6 py-2 rounded-xl border border-blue-200 mt-2">
            <span className="text-sm font-bold uppercase opacity-80 mr-2">Seat:</span><span className="font-black text-2xl">{ticket.seat_code}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-6 lg:px-12 py-12 min-h-[75vh]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 border-b pb-6 border-outline">
        <h2 className="text-3xl font-black text-text-main flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl"><img src={ticketImg} className="w-6 h-6 dark:invert" alt="Ticket" /></div>
          ตั๋วของฉัน
        </h2>
        <div className="flex items-center gap-4 bg-brand/10 px-5 py-3 rounded-2xl border border-brand/20">
          <div><p className="text-xs font-bold uppercase text-text-sub">ยอดเงิน GTYCoin</p><p className="text-xl font-black text-brand">{wallet.toLocaleString()} เหรียญ</p></div>
          <button onClick={handleTopup} className="px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-blue-700">เติมเงิน</button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-bg-card py-24 text-center rounded-3xl border border-outline shadow-sm">
          <img src={ticketImg} alt="Empty" className="w-16 h-16 mx-auto opacity-20 dark:invert mb-4" />
          <p className="text-text-sub font-bold">คุณยังไม่มีประวัติการจองตั๋ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {bookings.map((b) => (
            <div key={b.id} className="relative bg-bg-card rounded-3xl shadow-sm border border-outline flex flex-col sm:flex-row overflow-hidden">
              <div className={`absolute left-0 top-0 w-2 h-full ${b.status === 'confirmed' ? 'bg-green-500' : (b.status === 'wait' ? 'bg-yellow-400' : 'bg-gray-500')}`}></div>
              
              <div className="p-6 flex-1 pl-8">
                <h3 className={`text-xl font-black mb-2 ${b.status === 'cancelled' ? 'line-through text-text-sub' : 'text-text-main'}`}>{b.concert_name}</h3>
                <p className="text-sm text-text-main mt-4">ที่นั่ง: <span className="font-bold text-brand">{b.seat_code}</span> | ยอดชำระ: ฿{b.price}</p>
                <p className={`text-xs font-bold mt-2 inline-block px-3 py-1 rounded-lg border ${
                    b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' 
                    : b.status === 'wait' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    สถานะ: {b.status.toUpperCase()}
                </p>
              </div>

              <div className="p-6 bg-bg-main/50 border-l border-outline border-dashed flex flex-col justify-center items-center gap-2 min-w-40">
                {b.status === 'wait' ? (
                  <>
                    <button onClick={() => handlePayment(b.id)} className="w-full px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl text-sm transition">ชำระ ฿{b.price}</button>
                    <button onClick={() => handleCancel(b.id)} className="text-xs text-red-500 font-bold mt-1 hover:underline">ยกเลิก</button>
                    <p className="text-[10px] text-gray-500 text-center mt-1 bg-gray-100 px-2 py-1 rounded-md">หมดอายุใน 10 นาที</p>
                  </>
                ) : b.status === 'confirmed' ? (
                  <button onClick={() => setSelectedTicket(b)} className="w-full px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand font-bold rounded-xl text-sm border border-brand/20 transition">ดู E-Ticket</button>
                ) : (
                  <p className="text-sm font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-lg w-full text-center">ยกเลิก / หมดอายุ</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 text-white hover:text-gray-300 text-4xl leading-none">&times;</button>
          
          <div className="mb-6">{renderEticket(selectedTicket)}</div>
          
          <button onClick={handleDownloadTicket} className="px-6 py-3 bg-white text-black font-black rounded-full shadow-2xl hover:bg-gray-200 flex items-center gap-2 transition-transform active:scale-95">
            📥 โหลดตั๋วลงเครื่อง (Download)
          </button>
        </div>
      )}
    </div>
  );
}