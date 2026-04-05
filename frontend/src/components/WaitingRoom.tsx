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
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full animate-fade-in">
        <div className="text-5xl mb-6 animate-bounce">🎟️</div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">Waiting Room</h2>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-bold mb-6">กรุณารอสักครู่ ระบบกำลังจัดคิวให้คุณ...</p>
        
        <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-4 mb-4 border border-blue-100 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">คิวของคุณ</p>
          <p className="text-4xl md:text-5xl font-black text-blue-600 dark:text-blue-400">{myTicket || '...'}</p>
        </div>
        
        <div className="flex justify-between text-xs md:text-sm font-bold text-gray-600 dark:text-gray-300 mt-6 px-2">
          <span>กำลังเรียกคิวที่: <span className="text-green-600 dark:text-green-400">{currentTicket || '...'}</span></span>
          <span>รออีก {Math.max(0, myTicket - currentTicket)} คิว</span>
        </div>

        <p className="text-[10px] md:text-xs text-red-500 font-bold mt-8 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          ⚠️ ห้ามรีเฟรชหรือปิดหน้านี้เด็ดขาด มิฉะนั้นคุณจะเสียคิวทันที
        </p>
      </div>
    </div>
  );
}