import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { News } from '../types';

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
    <div className="space-y-8">
      <form onSubmit={handleCreateNews} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
        <h3 className="text-xl font-bold dark:text-white mb-4">+ ประกาศข่าวสารใหม่</h3>
        <div className="flex flex-col gap-4">
          <input type="text" name="title" placeholder="หัวข้อข่าว" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
          <textarea name="content" placeholder="รายละเอียดข่าวสาร" required rows={3} className="p-2 border rounded dark:bg-gray-800 dark:text-white"></textarea>
          <input type="file" name="image" accept="image/*" className="p-2 border rounded bg-white dark:bg-gray-800" title="รูปภาพประกอบข่าว" />
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded w-fit">ประกาศข่าว</button>
        </div>
      </form>

      <h3 className="text-xl font-bold dark:text-white">ข่าวสารปัจจุบัน</h3>
      <div className="grid gap-4">
        {news.map(n => (
          <div key={n.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded flex justify-between items-center">
            <div>
              <h4 className="font-bold dark:text-white">{n.title}</h4>
              <p className="text-sm text-gray-500">{new Date(n.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setEditingNews(n)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">แก้ไข</button>
              <button onClick={() => handleDeleteNews(n.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {editingNews && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateNews} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขประกาศข่าวสาร</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="title" defaultValue={editingNews.title} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <textarea name="content" defaultValue={editingNews.content} required rows={4} className="p-2 border rounded dark:bg-gray-700 dark:text-white"></textarea>
              <select name="is_active" defaultValue={String(editingNews.is_active)} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
              <p className="text-sm text-gray-500 -mb-2">อัปเดตรูปภาพประกอบ (เว้นว่างไว้หากใช้รูปเดิม)</p>
              <input type="file" name="image" accept="image/*" className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingNews(null)} className="px-4 py-2 bg-gray-300 rounded">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">บันทึก</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}