import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [news, setNews] = useState([]);

  // State สำหรับ Modal แก้ไขข้อมูล
  const [editingConcert, setEditingConcert] = useState(null);
  const [editingNews, setEditingNews] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'users' || activeTab === 'bookings') {
        const userRes = await api.get('/api/admin/users');
        setUsers(userRes.data);
      }
      if (activeTab === 'bookings') {
        const bookRes = await api.get('/api/admin/bookings');
        setBookings(bookRes.data);
      }
      if (activeTab === 'concerts') {
        const conRes = await api.get('/api/admin/concerts');
        setConcerts(conRes.data);
      }
      if (activeTab === 'news') {
        const newsRes = await api.get('/api/admin/news');
        setNews(newsRes.data);
      }
    } catch (e) { console.error("Error fetching admin data"); }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status });
      alert("อัปเดตสถานะผู้ใช้สำเร็จ");
    } catch (e) { alert("Error updating user"); }
  };

  // ============ CONCERT CRUD ============
  const handleCreateConcert = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set('show_date', new Date(formData.get('show_date')).toISOString());
    try {
      await api.post('/api/admin/concerts', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("สร้างคอนเสิร์ตสำเร็จ!");
      e.target.reset();
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleUpdateConcert = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set('show_date', new Date(formData.get('show_date')).toISOString());
    try {
      await api.put(`/api/admin/concerts/${editingConcert.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("แก้ไขคอนเสิร์ตสำเร็จ!");
      setEditingConcert(null);
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteConcert = async (id) => {
    if (window.confirm("ต้องการลบคอนเสิร์ตนี้?")) {
      await api.delete(`/api/admin/concerts/${id}`);
      fetchData();
    }
  };

  // ============ NEWS CRUD ============
  const handleCreateNews = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/api/admin/news', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("สร้างประกาศสำเร็จ!");
      e.target.reset();
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleUpdateNews = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.put(`/api/admin/news/${editingNews.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert("แก้ไขประกาศสำเร็จ!");
      setEditingNews(null);
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteNews = async (id) => {
    if (window.confirm("ต้องการลบประกาศนี้?")) {
      await api.delete(`/api/admin/news/${id}`);
      fetchData();
    }
  };

  // Helper สำหรับแปลงวันที่ใส่ Input type="datetime-local"
  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>ดูการจองตั๋ว</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการผู้ใช้ (Users)</button>
        <button onClick={() => setActiveTab('concerts')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการคอนเสิร์ต</button>
        <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการข่าวสาร</button>
      </div>

      {/* 1. ดูข้อมูลการจอง (ระบุได้ว่าใครจอง) */}
      {activeTab === 'bookings' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">คอนเสิร์ต</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">รหัสที่นั่ง</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">ผู้จอง (Email)</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">เวลาจอง</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const user = users.find(u => String(u.id) === String(b.user_id));
                return (
                  <tr key={b.id} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 dark:text-gray-300 font-bold">{b.concert_name}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">{b.seat_code}</td>
                    <td className="px-6 py-4 dark:text-gray-300">{user ? user.email : `User ID: ${b.user_id}`}</td>
                    <td className="px-6 py-4 dark:text-gray-400 text-sm">{new Date(b.booked_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. จัดการผู้ใช้ */}
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
                    <select defaultValue={u.status || 'active'} onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} className="border rounded p-1 dark:bg-gray-800 dark:text-white dark:border-gray-600 outline-none">
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

      {/* 3. จัดการคอนเสิร์ต */}
      {activeTab === 'concerts' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateConcert} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
            <h3 className="text-xl font-bold dark:text-white mb-4">+ เพิ่มข้อมูลคอนเสิร์ตใหม่</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="name" placeholder="ชื่อคอนเสิร์ต" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              <input type="text" name="venue" placeholder="สถานที่จัดงาน" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              <input type="datetime-local" name="show_date" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              <input type="file" name="image" accept="image/*" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white" />
            </div>
            <button type="submit" className="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">บันทึกข้อมูล</button>
          </form>

          <h3 className="text-xl font-bold dark:text-white">รายการคอนเสิร์ตปัจจุบัน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded flex justify-between items-center">
                <div>
                  <h4 className="font-bold dark:text-white">{c.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.venue} | {new Date(c.show_date).toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingConcert(c)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">แก้ไข</button>
                  <button onClick={() => handleDeleteConcert(c.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. จัดการ News */}
      {activeTab === 'news' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateNews} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
            <h3 className="text-xl font-bold dark:text-white mb-4">+ ประกาศข่าวสารใหม่</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="title" placeholder="หัวข้อข่าว" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              <textarea name="content" placeholder="รายละเอียดข่าวสาร" required rows="3" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"></textarea>
              <input type="file" name="image" accept="image/*" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-white" />
              <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 w-fit">ประกาศข่าว</button>
            </div>
          </form>

          <h3 className="text-xl font-bold dark:text-white">ข่าวสารปัจจุบัน</h3>
          <div className="grid gap-4">
            {news.map(n => (
              <div key={n.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded flex justify-between items-center">
                <div>
                  <h4 className="font-bold dark:text-white">{n.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingNews(n)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">แก้ไข</button>
                  <button onClick={() => handleDeleteNews(n.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL สำหรับแก้ไขคอนเสิร์ต ================= */}
      {editingConcert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateConcert} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขข้อมูลคอนเสิร์ต</h3>
            <div className="flex flex-col gap-4">
              <label className="dark:text-gray-300">ชื่อคอนเสิร์ต
                <input type="text" name="name" defaultValue={editingConcert.name} required className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </label>
              <label className="dark:text-gray-300">สถานที่
                <input type="text" name="venue" defaultValue={editingConcert.venue} required className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </label>
              <label className="dark:text-gray-300">วัน-เวลา แสดง
                <input type="datetime-local" name="show_date" defaultValue={formatDateForInput(editingConcert.show_date)} required className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </label>
              <label className="dark:text-gray-300">เปลี่ยนรูปหน้าปก (เว้นว่างไว้ถ้าใช้รูปเดิม)
                <input type="file" name="image" accept="image/*" className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingConcert(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded text-gray-800 dark:text-white">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">บันทึกการแก้ไข</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL สำหรับแก้ไขข่าวสาร ================= */}
      {editingNews && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateNews} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขประกาศข่าวสาร</h3>
            <div className="flex flex-col gap-4">
              <label className="dark:text-gray-300">หัวข้อข่าว
                <input type="text" name="title" defaultValue={editingNews.title} required className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </label>
              <label className="dark:text-gray-300">รายละเอียด
                <textarea name="content" defaultValue={editingNews.content} required rows="4" className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
              </label>
              <label className="dark:text-gray-300">สถานะข่าว
                <select name="is_active" defaultValue={editingNews.is_active} className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="true">เปิดใช้งาน (แสดงผล)</option>
                  <option value="false">ปิดใช้งาน (ซ่อน)</option>
                </select>
              </label>
              <label className="dark:text-gray-300">เปลี่ยนรูปประกอบ (เว้นว่างไว้ถ้าใช้รูปเดิม)
                <input type="file" name="image" accept="image/*" className="mt-1 w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingNews(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded text-gray-800 dark:text-white">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">บันทึกการแก้ไข</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}