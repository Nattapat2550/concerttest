// frontend/src/pages/AppealPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AppealPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/appeals', { email, reason });
      setMessage(res.data.message || 'ยื่นคำร้องสำเร็จแล้ว');
      setEmail('');
      setReason('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยื่นคำร้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">ยื่นคำร้องปลดแบน / ระงับบัญชี</h2>
        {message && <div className="p-4 mb-4 text-sm font-semibold text-green-700 bg-green-100 rounded-lg">{message}</div>}
        {error && <div className="p-4 mb-4 text-sm font-semibold text-red-700 bg-red-100 rounded-lg">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลที่ถูกระงับ</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลที่ต้องการอุทธรณ์</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="อธิบายเหตุผลหรือปัญหาที่เกิดขึ้น..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? 'กำลังส่งข้อมูล...' : 'ส่งคำร้องปลดแบน'}
          </button>
        </form>
        <button onClick={() => navigate('/login')} className="mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-900 transition">
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}