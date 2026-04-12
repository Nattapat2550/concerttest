// frontend/src/pages/admin/tabs/AppealsTab.tsx
import React, { useEffect, useState } from 'react';
import api from '../../../services/api';

interface Appeal {
  id: number;
  email: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function AppealsTab() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppeals = async () => {
    try {
      const res = await api.get('/api/admin/appeals');
      setAppeals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleReview = async (id: number, status: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะ ${status === 'approved' ? 'อนุมัติ (ปลดแบน)' : 'ปฏิเสธ'} คำร้องนี้?`)) return;
    try {
      await api.put(`/api/admin/appeals/${id}`, { status });
      fetchAppeals();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  };

  if (loading) return <div className="text-center py-10">กำลังโหลด...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-200">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 font-semibold w-1/4">อีเมล</th>
              <th className="p-4 font-semibold w-2/5">เหตุผลการอุทธรณ์</th>
              <th className="p-4 font-semibold">วันที่ส่ง</th>
              <th className="p-4 font-semibold">สถานะ</th>
              <th className="p-4 font-semibold text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {appeals.map((appeal) => (
              <tr key={appeal.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="p-4">{appeal.email}</td>
                <td className="p-4 wrap-break-word">{appeal.reason}</td>
                <td className="p-4">{new Date(appeal.created_at).toLocaleString('th-TH')}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    appeal.status === 'approved' ? 'bg-green-100 text-green-700' :
                    appeal.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {appeal.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right space-x-3">
                  {appeal.status === 'pending' && (
                    <>
                      <button onClick={() => handleReview(appeal.id, 'approved')} className="text-green-600 hover:text-green-800 font-bold bg-green-50 px-3 py-1 rounded">อนุมัติ (ปลดแบน)</button>
                      <button onClick={() => handleReview(appeal.id, 'rejected')} className="text-red-600 hover:text-red-800 font-bold bg-red-50 px-3 py-1 rounded">ปฏิเสธ</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {appeals.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-medium">ไม่มีรายการคำร้อง</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}