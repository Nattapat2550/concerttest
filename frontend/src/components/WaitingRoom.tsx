import React from 'react';

// 1. สร้าง Interface เพื่อบอกว่ารับ Props อะไรมาบ้าง
interface WaitingRoomProps {
  myTicket: number;
  currentTicket: number;
}

// 2. ใส่ Type ให้ Props
export default function WaitingRoom({ myTicket, currentTicket }: WaitingRoomProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] text-center px-4">
      <div className="bg-canvas  p-6 md:p-8 rounded-lg shadow-2xl border border-gray-200  max-w-md w-full animate-fade-in">
        <div className="text-5xl mb-6 animate-pulse duration-700 ease-out">🎟️</div>
        <h2 className="text-2xl md:text-3xl font-black text-ink  mb-2">Waiting Room</h2>
        <p className="text-sm md:text-base text-gray-500  font-bold mb-6">กรุณารอสักครู่ ระบบกำลังจัดคิวให้คุณ...</p>
        
        <div className="bg-blue-50  rounded-lg p-4 mb-4 border border-blue-100 ">
          <p className="text-xs md:text-sm text-gray-500  uppercase tracking-wide font-bold">คิวของคุณ</p>
          <p className="text-4xl md:text-5xl font-black text-primary ">{myTicket || '...'}</p>
        </div>
        
        <div className="flex justify-between text-xs md:text-sm font-bold text-gray-600  mt-6 px-2">
          <span>กำลังเรียกคิวที่: <span className="text-green-600 ">{currentTicket || '...'}</span></span>
          <span>รออีก {Math.max(0, myTicket - currentTicket)} คิว</span>
        </div>

        <p className="text-[10px] md:text-xs text-red-500 font-bold mt-8 bg-red-50 /20 p-3 rounded-lg">
          ⚠️ ห้ามรีเฟรชหรือปิดหน้านี้เด็ดขาด มิฉะนั้นคุณจะเสียคิวทันที
        </p>
      </div>
    </div>
  );
}