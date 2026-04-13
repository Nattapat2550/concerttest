// frontend/src/pages/admin/tabs/DocumentsTab.tsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function DocumentsTab() {
  const [docs, setDocs] = useState<any[]>([]);
  // เพิ่ม state สำหรับติดตามว่ากำลังแก้ไข ID ไหนอยู่ (ถ้าเป็น null แปลว่าสร้างใหม่)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', cover_image: '', gallery_urls: '' });

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/api/documents/list');
      setDocs(data || []);
    } catch (err) {
      console.error("Failed to fetch documents");
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // แปลง gallery_urls จาก comma-separated string เป็น JSON array
    const galleryArray = form.gallery_urls.split(',').map(url => url.trim()).filter(url => url !== "");
    
    try {
      const payload = {
        ...form,
        gallery_urls: JSON.stringify(galleryArray),
        is_active: true
      };

      if (editingId) {
        // อัปเดตข้อมูลเก่า
        await api.put(`/api/admin/documents/${editingId}`, payload);
      } else {
        // สร้างข้อมูลใหม่
        await api.post('/api/admin/documents', payload);
      }

      resetForm();
      fetchDocs();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  // ฟังก์ชันเริ่มการแก้ไข
  const handleEdit = (doc: any) => {
    let parsedUrls = '';
    try {
      // แปลงจาก JSON String ของฐานข้อมูล กลับมาเป็น string ธรรมดาคั่นด้วยลูกน้ำเพื่อใส่ใน Textarea
      const arr = JSON.parse(doc.gallery_urls || '[]');
      parsedUrls = arr.join(', ');
    } catch (e) {
      parsedUrls = '';
    }

    setForm({
      title: doc.title,
      description: doc.description,
      cover_image: doc.cover_image,
      gallery_urls: parsedUrls
    });
    setEditingId(doc.id);
    
    // เลื่อนหน้าจอกลับขึ้นไปด้านบนที่ฟอร์ม
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบข้อมูลชุดนี้?')) return;
    try {
      await api.delete(`/api/admin/documents/${id}`);
      if (editingId === id) resetForm(); // ถ้ากำลังลบตัวที่แก้ไขอยู่ ให้รีเซ็ตฟอร์มด้วย
      fetchDocs();
    } catch (err) {
      alert("ไม่สามารถลบข้อมูลได้");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', description: '', cover_image: '', gallery_urls: '' });
  };

  return (
    <div className="space-y-8">
      {/* ฟอร์มสร้าง/แก้ไข Document */}
      <div className={`p-6 rounded-2xl shadow-sm border transition-all ${editingId ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
        <h3 className="text-xl font-black mb-6 text-gray-900 dark:text-white">
          {editingId ? `กำลังแก้ไขข้อมูล (ID: ${editingId})` : 'สร้างข้อมูล & แกลเลอรีใหม่'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">หัวข้อ (Title)</label>
            <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ภาพปก (Cover Image URL)</label>
            <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={form.cover_image} onChange={e => setForm({...form, cover_image: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เนื้อหา (รองรับ HTML)</label>
            <textarea className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-32 resize-y" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ลิงก์รูปแกลเลอรี (คั่นด้วยเครื่องหมายคอมม่า , )</label>
            <textarea placeholder="https://image1.jpg, https://image2.jpg" className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-20 resize-y" value={form.gallery_urls} onChange={e => setForm({...form, gallery_urls: e.target.value})} />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-blue-500/30">
              {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลใหม่'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-8 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold rounded-xl transition-all">
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ตารางแสดง Document ทั้งหมด */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="p-4 font-black text-gray-900 dark:text-white">ภาพปก</th>
                <th className="p-4 font-black text-gray-900 dark:text-white">หัวข้อ</th>
                <th className="p-4 font-black text-gray-900 dark:text-white">วันที่สร้าง</th>
                <th className="p-4 font-black text-gray-900 dark:text-white text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className={`border-t border-gray-200 dark:border-gray-700 transition-colors ${editingId === d.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                  <td className="p-4">
                    <img src={d.cover_image} alt="cover" className="w-16 h-12 object-cover rounded-md border border-gray-200 dark:border-gray-700" />
                  </td>
                  <td className="p-4 font-bold text-gray-900 dark:text-white">{d.title}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{new Date(d.created_at).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleEdit(d)} className="text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors">
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-600 font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors">
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">ไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}