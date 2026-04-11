import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { News } from '../types';

import ideaImg from '../../../assets/idea.png';
import calendarImg from '../../../assets/calendar.png';
import settingsImg from '../../../assets/settings.png';
import eraserImg from '../../../assets/eraser.png';

const inputStyle = "w-full p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200";
const labelStyle = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2";

export default function NewsTab() {
  const [news, setNews] = useState<News[]>([]);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  const fetchNews = async () => {
    try {
      const resN = await api.get('/api/admin/news');
      setNews(resN.data || []);
    } catch (e) { console.error("Error fetching news"); }
  };

  useEffect(() => { fetchNews(); }, []);

  const handleCreateNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/api/admin/news', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("สร้างประกาศสำเร็จ!");
      (e.target as HTMLFormElement).reset();
      fetchNews();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleUpdateNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingNews) return;
    const formData = new FormData(e.currentTarget);
    try {
      await api.put(`/api/admin/news/${editingNews.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("แก้ไขประกาศสำเร็จ!");
      setEditingNews(null);
      fetchNews();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteNews = async (id: number) => {
    if (window.confirm("ต้องการลบประกาศนี้?")) {
      await api.delete(`/api/admin/news/${id}`);
      fetchNews();
    }
  };

  return (
    <div className="space-y-10 w-full">
      {/* ---------------- ฟอร์มสร้างข่าวสาร ---------------- */}
      <form onSubmit={handleCreateNews} className="bg-white dark:bg-gray-800 p-8 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-yellow-400 to-orange-500"></div>
        
        <h3 className="text-2xl font-black mb-6 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
            <img src={ideaImg} alt="News" className="w-6 h-6 object-contain" />
          </div>
          สร้างประกาศข่าวสาร
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className={labelStyle}>หัวข้อข่าว</label>
            <input type="text" name="title" placeholder="พิมพ์หัวข้อประกาศที่นี่..." required className={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className={labelStyle}>รายละเอียดเนื้อหา</label>
            <textarea name="content" placeholder="ใส่รายละเอียดข่าวสาร..." required rows={4} className={`${inputStyle} resize-y`}></textarea>
          </div>
          <div className="md:col-span-2">
            <label className={labelStyle}>รูปภาพประกอบ</label>
            <input type="file" name="image" accept="image/*" className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 bg-white`} />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5">
            <img src={ideaImg} className="w-5 h-5 brightness-0 invert" alt="Post" />
            โพสต์ประกาศ
          </button>
        </div>
      </form>

      {/* ---------------- รายการข่าวสาร ---------------- */}
      <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
        <img src={calendarImg} alt="List" className="w-6 h-6 dark:invert opacity-80" />
        ข่าวสารปัจจุบัน
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {news.map(n => (
          <div key={n.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col relative group">
            <div className="p-6 flex-1 flex flex-col">
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                <img src={calendarImg} className="w-3 h-3 opacity-70 dark:invert" alt="Date" />
                {new Date(n.created_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}
              </span>
              <h4 className="font-black text-xl text-gray-900 dark:text-white mb-2 line-clamp-2">{n.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mt-auto">{n.content}</p>
            </div>
            <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingNews(n)} className="flex items-center justify-center gap-2 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl transition-colors font-bold text-sm">
                <img src={settingsImg} className="w-4 h-4 dark:invert" alt="Edit" /> แก้ไข
              </button>
              <button onClick={() => handleDeleteNews(n.id)} className="flex items-center justify-center gap-2 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-xl transition-colors font-bold text-sm">
                <img src={eraserImg} className="w-4 h-4 object-contain" alt="Del" /> ลบ
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Modal แก้ไขข่าวสาร ---------------- */}
      {editingNews && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateNews} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-8 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <img src={settingsImg} alt="Edit" className="w-5 h-5 object-contain dark:invert opacity-80" />
                </div>
                แก้ไขประกาศข่าวสาร
              </h3>
              <button type="button" onClick={() => setEditingNews(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-3xl leading-none">&times;</button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto flex flex-col gap-5">
              <div>
                <label className={labelStyle}>หัวข้อข่าว</label>
                <input type="text" name="title" defaultValue={editingNews.title} required className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>รายละเอียดเนื้อหา</label>
                <textarea name="content" defaultValue={editingNews.content} required rows={5} className={`${inputStyle} resize-y`}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>สถานะการแสดงผล</label>
                  <select name="is_active" defaultValue={String(editingNews.is_active)} className={inputStyle}>
                    <option value="true">เปิดใช้งาน</option>
                    <option value="false">ซ่อนประกาศ</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>อัปเดตรูปภาพ (เว้นไว้หากใช้รูปเดิม)</label>
                  <input type="file" name="image" accept="image/*" className={`${inputStyle} bg-white`} />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-3xl">
              <button type="button" onClick={() => setEditingNews(null)} className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                ยกเลิก
              </button>
              <button type="submit" className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}