import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // users | concerts | news
  const [users, setUsers] = useState([]);
  
  // States สำหรับฟอร์ม
  const [concertForm, setConcertForm] = useState({ name: '', venue: '', show_date: '', layout_image_url: '' });
  const [newsForm, setNewsForm] = useState({ title: '', content: '', image_url: '' });

  useEffect(() => {
    if (activeTab === 'users') {
      api.get('/api/admin/users').then(res => setUsers(res.data)).catch(console.error);
    }
  }, [activeTab]);

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { status });
      alert("อัปเดตสถานะสำเร็จ");
    } catch (e) { alert("Error"); }
  };

  // ✅ ฟังก์ชันเพิ่มคอนเสิร์ต
  const handleCreateConcert = async (e) => {
    e.preventDefault();
    try {
      // แปลงวันที่ให้เป็นรูปแบบ ISO String ถ้าจำเป็น
      const payload = { ...concertForm, show_date: new Date(concertForm.show_date).toISOString() };
      await api.post('/api/admin/concerts', payload);
      alert("สร้างคอนเสิร์ตและที่นั่งสำเร็จ!");
      setConcertForm({ name: '', venue: '', show_date: '', layout_image_url: '' });
    } catch (err) { alert("เกิดข้อผิดพลาดในการสร้างคอนเสิร์ต"); }
  };

  // ✅ ฟังก์ชันเพิ่มข่าวสาร
  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/news', newsForm);
      alert("สร้างข่าวสารสำเร็จ!");
      setNewsForm({ title: '', content: '', image_url: '' });
    } catch (err) { alert("เกิดข้อผิดพลาดในการสร้างข่าว"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการผู้ใช้ (Users)</button>
        <button onClick={() => setActiveTab('concerts')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>+ เพิ่มคอนเสิร์ต</button>
        <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>+ เพิ่มข่าวสาร</button>
      </div>

      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Email</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Role</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b dark:border-gray-700">
                  <td className="px-6 py-4 dark:text-gray-300">{u.email}</td>
                  <td className="px-6 py-4 dark:text-gray-300">{u.role}</td>
                  <td className="px-6 py-4">
                    <select defaultValue={u.status || 'active'} onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} className="border rounded p-1 dark:bg-gray-800 dark:text-white dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ ฟอร์มสร้างคอนเสิร์ต */}
      {activeTab === 'concerts' && (
        <form onSubmit={handleCreateConcert} className="max-w-xl bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
          <h3 className="text-xl font-bold dark:text-white mb-4">เพิ่มข้อมูลคอนเสิร์ตใหม่</h3>
          <div className="space-y-4">
            <input type="text" placeholder="ชื่อคอนเสิร์ต" required value={concertForm.name} onChange={e => setConcertForm({...concertForm, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input type="text" placeholder="สถานที่จัดงาน" required value={concertForm.venue} onChange={e => setConcertForm({...concertForm, venue: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input type="datetime-local" required value={concertForm.show_date} onChange={e => setConcertForm({...concertForm, show_date: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input type="text" placeholder="URL รูปภาพหน้าปก (Optional)" value={concertForm.layout_image_url} onChange={e => setConcertForm({...concertForm, layout_image_url: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">บันทึกข้อมูล</button>
          </div>
        </form>
      )}

      {/* ✅ ฟอร์มสร้างข่าวสาร */}
      {activeTab === 'news' && (
        <form onSubmit={handleCreateNews} className="max-w-xl bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
          <h3 className="text-xl font-bold dark:text-white mb-4">ประกาศข่าวสาร (หน้าแรก)</h3>
          <div className="space-y-4">
            <input type="text" placeholder="หัวข้อข่าว" required value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <textarea placeholder="รายละเอียดข่าวสาร" required rows="4" value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <input type="text" placeholder="URL รูปประกอบ (Optional)" value={newsForm.image_url} onChange={e => setNewsForm({...newsForm, image_url: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">ประกาศข่าว</button>
          </div>
        </form>
      )}
    </div>
  );
}