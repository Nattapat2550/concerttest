import React, { useState, useRef, useEffect } from 'react';
import api from '../../../services/api';

export default function ScanTicketTab() {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ให้ Auto Focus ที่ช่อง Input เสมอ เพื่อให้พร้อมใช้เครื่องแสกนเลเซอร์ยิงได้ทันที
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data } = await api.post('/api/admin/bookings/scan', { token });
      // แสกนผ่าน!
      setMessage({ type: 'success', text: data.message || 'ตรวจสอบบัตรสำเร็จ อนุญาตให้เข้างาน' });
      
      // ล้างช่อง input ทันทีเพื่อพร้อมแสกนคนต่อไป
      setToken('');
      inputRef.current?.focus(); 
      
    } catch (err: any) {
      // แสกนไม่ผ่าน (บัตรปลอม, ใช้ไปแล้ว, หรือยกเลิกแล้ว)
      setMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด บัตรไม่ถูกต้อง' });
      setToken('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto mt-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Ticket Scanner</h2>
        <p className="text-gray-500 dark:text-gray-400">ระบบตรวจสอบและตัดบัตรเข้างาน</p>
      </div>
      
      <form onSubmit={handleScan} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            รหัส QR Code (คลิกที่ช่องนี้ก่อนใช้เครื่องแสกน)
          </label>
          <input
            ref={inputRef}
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="คลิกที่นี่แล้วยิงเครื่องแสกน QR..."
            className="w-full p-4 text-center text-lg border-2 border-blue-200 dark:border-blue-900/50 rounded-xl bg-blue-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 text-lg shadow-lg shadow-blue-500/30"
        >
          {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบบัตร'}
        </button>
      </form>

      {/* กล่องแสดงผลลัพธ์การแสกน */}
      {message && (
        <div className={`mt-8 p-6 rounded-2xl font-bold text-center text-xl animate-fade-in-up border-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
            : 'bg-red-50 text-red-700 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        }`}>
          {message.type === 'success' ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              {message.text}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}