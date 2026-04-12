// frontend/src/pages/admin/tabs/ScanTicketTab.tsx
import React, { useState, useRef, useEffect } from 'react';
import api from '../../../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScanTicketTab() {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'laser' | 'camera'>('laser'); // โหมดแสกน
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto Focus สำหรับโหมดเลเซอร์
  useEffect(() => {
    if (scanMode === 'laser') {
      inputRef.current?.focus();
    }
  }, [scanMode]);

  // ตั้งค่ากล้องเมื่อเลือกโหมด Camera
  useEffect(() => {
    // ถ้าไม่ได้อยู่โหมดกล้อง ไม่ต้องทำอะไร
    if (scanMode !== 'camera') return;

    let isProcessing = false;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        if (isProcessing) return;
        isProcessing = true;
        
        try {
          // เมื่อแสกนติด ให้สั่ง clear ปิดกล้องไปเลยป้องกันบั๊ก DOM ค้าง
          await scanner.clear();
          
          // ส่งค่าไปตรวจสอบ API
          await processToken(decodedText);
          
          // สลับกลับไปหน้าจอผลลัพธ์
          setScanMode('laser');
        } catch (error) {
          console.error("Scanner clear error:", error);
        } finally {
          isProcessing = false;
        }
      },
      (errorMessage) => {
        // ignore errors while scanning (มี error ยิบย่อยโผล่มาเป็นปกติ)
      }
    );

    // Cleanup Function เมื่อ Component Unmount หรือเปลี่ยนโหมด
    return () => {
      scanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [scanMode]);

  // ฟังก์ชันหลักสำหรับตรวจสอบ Token
  const processToken = async (scanToken: string) => {
    if (!scanToken.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data } = await api.post('/api/admin/bookings/scan', { token: scanToken });
      setMessage({ type: 'success', text: data.message || 'ตรวจสอบบัตรสำเร็จ อนุญาตให้เข้างาน' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด บัตรไม่ถูกต้อง' });
    } finally {
      setLoading(false);
      setToken('');
      if (scanMode === 'laser') {
        inputRef.current?.focus();
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processToken(token);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto mt-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Ticket Scanner</h2>
        <p className="text-gray-500 dark:text-gray-400">ระบบตรวจสอบและตัดบัตรเข้างาน</p>
      </div>

      {/* ปุ่มสลับโหมดการแสกน */}
      <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-8">
        <button
          onClick={() => { setScanMode('laser'); setMessage(null); }}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
            scanMode === 'laser' 
              ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          🔫 ใช้เครื่องแสกน USB
        </button>
        <button
          onClick={() => { setScanMode('camera'); setMessage(null); }}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
            scanMode === 'camera' 
              ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📷 ใช้กล้อง (มือถือ/Webcam)
        </button>
      </div>
      
      {/* โหมดใช้เครื่องแสกน USB / กรอกเอง */}
      {scanMode === 'laser' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-6 animate-fade-in">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">
              คลิกที่ช่องด้านล่าง แล้วยิงเครื่องแสกน QR Code
            </label>
            <input
              ref={inputRef}
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="รอรับรหัสจากการแสกน..."
              className="w-full p-4 text-center text-lg border-2 border-blue-200 dark:border-blue-900/50 rounded-xl bg-blue-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 text-lg shadow-lg shadow-blue-500/30"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบรหัส'}
          </button>
        </form>
      )}

      {/* โหมดใช้กล้องมือถือ / Webcam */}
      {/* ⚠️ การแก้ไข: ใช้ CSS ซ่อน (display: none) แทนการลบ Component เพื่อป้องกัน clear() ทำงานพลาด */}
      <div className={`flex flex-col items-center animate-fade-in ${scanMode === 'camera' ? 'block' : 'hidden'}`}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-900 shadow-inner bg-black">
          <div id="qr-reader" className="w-full bg-white"></div>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
          อนุญาตการเข้าถึงกล้อง แล้วนำ QR Code มาส่องในกรอบ
        </p>
      </div>

      {/* กล่องแสดงผลลัพธ์การแสกน */}
      {message && scanMode === 'laser' && (
        <div className={`mt-8 p-6 rounded-2xl font-bold text-center text-xl animate-fade-in-up border-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
            : 'bg-red-50 text-red-700 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        }`}>
          {message.type === 'success' ? (
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl">✅</span>
              {message.text}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl">❌</span>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}