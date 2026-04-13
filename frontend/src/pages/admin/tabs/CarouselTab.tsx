import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface Carousel {
  id: number;
  image_url: string;
  link_url: string;
  sort_order: number;
}

export default function CarouselTab() {
  const [items, setItems] = useState<Carousel[]>([]);
  const [form, setForm] = useState({ image_url: '', link_url: '', sort_order: 0 });

  const fetchItems = async () => {
    try {
      // ดึงข้อมูลผ่าน Endpoint นี้ (ตรงกับ router.go)
      const { data } = await api.get('/api/carousel');
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch carousels");
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ส่งข้อมูลผ่าน Endpoint นี้
      await api.post('/api/admin/carousel', { ...form, is_active: true });
      setForm({ image_url: '', link_url: '', sort_order: 0 });
      fetchItems();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเพิ่มแบนเนอร์");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบแบนเนอร์นี้?')) return;
    try {
      // ส่งคำสั่งลบผ่าน Endpoint นี้
      await api.delete(`/api/admin/carousel/${id}`);
      fetchItems();
    } catch (err) {
      alert("ไม่สามารถลบได้");
    }
  };

  return (
    <div className="space-y-8">
      {/* ฟอร์มเพิ่ม Carousel */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-black mb-6 text-gray-900 dark:text-white">เพิ่มแบนเนอร์ใหม่ (หน้า Home)</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Image URL *</label>
            <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} required />
          </div>
          <div className="md:col-span-5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Link URL (เมื่อกดแบนเนอร์)</label>
            <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="ปล่อยว่างได้" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-blue-500/30">
              เพิ่มรูป
            </button>
          </div>
        </form>
      </div>

      {/* แสดงรายการแบนเนอร์ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative group">
            <img src={item.image_url} className="w-full h-48 object-cover" alt="Banner" />
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-3">
                <span className="font-bold">ลิงก์: </span>
                {item.link_url || 'ไม่มีการฝังลิงก์'}
              </p>
              <button 
                onClick={() => handleDelete(item.id)} 
                className="w-full text-red-500 hover:text-red-600 font-bold text-sm bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 py-2.5 rounded-xl transition-colors"
              >
                ลบแบนเนอร์นี้
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full p-10 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 border-dashed">
            <p className="text-gray-500 dark:text-gray-400 font-bold">ยังไม่มีรูปแบนเนอร์ในระบบ</p>
          </div>
        )}
      </div>
    </div>
  );
}