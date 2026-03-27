import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [news, setNews] = useState([]);
  const [venues, setVenues] = useState([]); 

  // States สำหรับแก้ไข (Modals)
  const [editingConcert, setEditingConcert] = useState(null);
  const [editingNews, setEditingNews] = useState(null);

  // States สำหรับจัดการโซนย่อย (Venue Zones)
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueZones, setVenueZones] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'users' || activeTab === 'bookings') {
        const userRes = await api.get('/api/admin/users');
        setUsers(userRes.data || []);
      }
      if (activeTab === 'bookings') {
        const bookRes = await api.get('/api/admin/bookings');
        setBookings(bookRes.data || []);
      }
      if (activeTab === 'concerts') {
        const conRes = await api.get('/api/admin/concerts');
        setConcerts(conRes.data || []);
        const venRes = await api.get('/api/admin/venues');
        setVenues(venRes.data || []);
      }
      if (activeTab === 'venues') {
        const venRes = await api.get('/api/admin/venues');
        setVenues(venRes.data || []);
      }
      if (activeTab === 'news') {
        const newsRes = await api.get('/api/admin/news');
        setNews(newsRes.data || []);
      }
    } catch (e) { console.error("Error fetching admin data"); }
  };

  // ============ 1. USERS & BOOKINGS ============
  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status });
      alert("อัปเดตสถานะผู้ใช้สำเร็จ");
    } catch (e) { alert("Error updating user"); }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) {
      await api.put(`/api/admin/bookings/${bookingId}/cancel`);
      alert("ยกเลิกการจองสำเร็จ");
      fetchData();
    }
  };

  // ============ 2. VENUES & ZONES ============
  const handleUploadMaster = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const file = e.target.svg_file.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await api.post('/api/admin/venues', { name, master_svg: event.target.result });
        alert("สร้างสถานที่และ Master Map สำเร็จ!");
        e.target.reset();
        fetchData();
      } catch (err) { alert("เกิดข้อผิดพลาดในการอัปโหลด"); }
    };
    reader.readAsText(file);
  };

  const loadVenueZones = async (vid) => {
    const { data } = await api.get(`/api/admin/venues/${vid}/zones`);
    setVenueZones(data || []);
  };

  const handleUploadZone = (e) => {
    e.preventDefault();
    const zone_name = e.target.zone_name.value.toUpperCase();
    const file = e.target.svg_file.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await api.post(`/api/admin/venues/${selectedVenue.id}/zones`, { zone_name, sub_svg: event.target.result });
        alert(`อัปโหลดผังเก้าอี้โซน ${zone_name} สำเร็จ!`);
        e.target.reset();
        loadVenueZones(selectedVenue.id);
      } catch (err) { alert("เกิดข้อผิดพลาด"); }
    };
    reader.readAsText(file);
  };

  const handleDeleteVenue = async (id) => {
    if (window.confirm("ต้องการลบสถานที่นี้? (มีผลกับคอนเสิร์ตที่ผูกอยู่)")) {
      await api.delete(`/api/admin/venues/${id}`);
      fetchData();
    }
  };

  // ============ 3. CONCERTS ============
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

  // ============ 4. NEWS ============
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

  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <button onClick={() => { setActiveTab('bookings'); setSelectedVenue(null); }} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>ดูการจองตั๋ว</button>
        <button onClick={() => { setActiveTab('users'); setSelectedVenue(null); }} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการผู้ใช้</button>
        <button onClick={() => { setActiveTab('venues'); setSelectedVenue(null); }} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'venues' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการสถานที่ (SVG Map)</button>
        <button onClick={() => { setActiveTab('concerts'); setSelectedVenue(null); }} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการคอนเสิร์ต</button>
        <button onClick={() => { setActiveTab('news'); setSelectedVenue(null); }} className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการข่าวสาร</button>
      </div>

      {/* --- TAB: BOOKINGS --- */}
      {activeTab === 'bookings' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">คอนเสิร์ต</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">รหัสที่นั่ง (SVG)</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">ราคา</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">ผู้จอง (Email)</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">สถานะ</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const user = users.find(u => String(u.id) === String(b.user_id));
                return (
                  <tr key={b.id} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 dark:text-gray-300 font-bold">{b.concert_name}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">{b.seat_code || 'ระบบเก่า'}</td>
                    <td className="px-6 py-4 dark:text-gray-300">฿{b.price}</td>
                    <td className="px-6 py-4 dark:text-gray-300">{user ? user.email : `User ID: ${b.user_id}`}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {b.status === 'confirmed' && (
                        <button onClick={() => handleCancelBooking(b.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">ยกเลิกการจอง</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB: USERS --- */}
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
                    <select defaultValue={u.status || 'active'} onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)} className="border rounded p-1 dark:bg-gray-800 dark:text-white outline-none">
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

      {/* --- TAB: VENUES (SVG) --- */}
      {activeTab === 'venues' && !selectedVenue && (
        <div className="space-y-8 animate-fade-in">
          <form onSubmit={handleUploadMaster} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700 shadow-sm">
            <h3 className="text-xl font-bold mb-2 dark:text-white">+ 1. สร้างสถานที่ (อัปโหลด Master SVG)</h3>
            <p className="text-sm text-gray-500 mb-4">ไฟล์แผนผังใหญ่รวมโซน ที่มี tag <code className="bg-gray-200 px-1 rounded">class="zone-clickable" id="ชื่อโซน"</code></p>
            <div className="flex flex-col md:flex-row gap-4">
              <input type="text" name="name" placeholder="ชื่อสถานที่ เช่น Impact Arena" required className="p-2 border rounded flex-1 dark:bg-gray-800 dark:text-white" />
              <input type="file" name="svg_file" accept=".svg" required className="p-2 border rounded flex-1 bg-white dark:bg-gray-800" />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">อัปโหลด Master Map</button>
            </div>
          </form>

          <h3 className="text-xl font-bold dark:text-white">รายการสถานที่</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map(v => (
              <div key={v.id} className="bg-white dark:bg-gray-900 p-5 border dark:border-gray-700 rounded-lg shadow flex justify-between items-center">
                <span className="font-bold text-lg dark:text-white">{v.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedVenue(v); loadVenueZones(v.id); }} className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-purple-700">⚙️ จัดการโซนย่อย (เก้าอี้)</button>
                  <button onClick={() => handleDeleteVenue(v.id)} className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'venues' && selectedVenue && (
        <div className="animate-fade-in">
          <button onClick={() => setSelectedVenue(null)} className="mb-4 text-blue-600 font-bold underline">&lt; กลับไปหน้าสถานที่</button>
          <h3 className="text-2xl font-black mb-6 dark:text-white border-l-4 border-purple-600 pl-4">จัดการโซนย่อย: {selectedVenue.name}</h3>
          
          <form onSubmit={handleUploadZone} className="bg-purple-50 dark:bg-gray-900 p-6 rounded-lg border border-purple-200 dark:border-gray-700 mb-8 shadow-sm">
            <h3 className="text-xl font-bold mb-2 text-purple-800 dark:text-purple-400">+ 2. เพิ่มผังที่นั่งรายโซน (อัปโหลด Sub SVG)</h3>
            <p className="text-sm text-gray-500 mb-4">ไฟล์ผังเก้าอี้ ที่มี tag <code className="bg-gray-200 px-1 rounded">class="seat" id="รหัสที่นั่ง"</code></p>
            <div className="flex flex-col md:flex-row gap-4">
              <input type="text" name="zone_name" placeholder="ชื่อโซน (เช่น A1, B2)" required className="p-2 border rounded w-full md:w-1/3 uppercase font-bold text-center dark:bg-gray-800 dark:text-white" />
              <input type="file" name="svg_file" accept=".svg" required className="p-2 border rounded w-full flex-1 bg-white dark:bg-gray-800" />
              <button type="submit" className="bg-purple-600 text-white px-8 py-2 rounded font-bold hover:bg-purple-700">บันทึกโซน</button>
            </div>
          </form>

          <h3 className="font-bold mb-4 dark:text-white">โซนที่มีผังเก้าอี้แล้ว ({venueZones.length} โซน)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {venueZones.map(z => (
              <div key={z.id} className="p-4 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-center shadow-sm">
                <p className="font-black text-xl text-purple-700 dark:text-purple-400">{z.zone_name}</p>
                <span className="text-xs font-bold text-green-600">✅ อัปโหลดผังแล้ว</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: CONCERTS --- */}
      {activeTab === 'concerts' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateConcert} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
            <h3 className="text-xl font-bold dark:text-white mb-4">+ เพิ่มข้อมูลคอนเสิร์ตใหม่</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="name" placeholder="ชื่อคอนเสิร์ต" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="text" name="venue" placeholder="สถานที่จัดงาน (ข้อความแบบเก่า)" className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <select name="venue_id" required className="p-2 border rounded dark:bg-gray-800 dark:text-white">
                <option value="">-- เลือกสถานที่ (SVG Map) --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" name="ticket_price" placeholder="ราคาตั๋ว (บาท)" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="datetime-local" name="show_date" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="file" name="image" accept="image/*" className="p-2 border rounded bg-white dark:bg-gray-800" />
            </div>
            <button type="submit" className="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">บันทึกข้อมูล</button>
          </form>

          <h3 className="text-xl font-bold dark:text-white">รายการคอนเสิร์ตปัจจุบัน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded flex justify-between items-center">
                <div>
                  <h4 className="font-bold dark:text-white">{c.name}</h4>
                  <p className="text-sm text-gray-500">{(c.venue_name || c.venue)} | ฿{c.ticket_price} | {new Date(c.show_date).toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingConcert(c)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">แก้ไข</button>
                  <button onClick={() => handleDeleteConcert(c.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: NEWS --- */}
      {activeTab === 'news' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateNews} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
            <h3 className="text-xl font-bold dark:text-white mb-4">+ ประกาศข่าวสารใหม่</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="title" placeholder="หัวข้อข่าว" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <textarea name="content" placeholder="รายละเอียดข่าวสาร" required rows="3" className="p-2 border rounded dark:bg-gray-800 dark:text-white"></textarea>
              <input type="file" name="image" accept="image/*" className="p-2 border rounded bg-white dark:bg-gray-800" />
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
        </div>
      )}

      {/* MODALS แก้ไข Concert และ News */}
      {editingConcert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateConcert} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขข้อมูลคอนเสิร์ต</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="name" defaultValue={editingConcert.name} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <select name="venue_id" defaultValue={editingConcert.venue_id || ''} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="">-- ไม่ใช้ SVG Map --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" name="ticket_price" defaultValue={editingConcert.ticket_price} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <input type="datetime-local" name="show_date" defaultValue={formatDateForInput(editingConcert.show_date)} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingConcert(null)} className="px-4 py-2 bg-gray-300 rounded">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">บันทึกการแก้ไข</button>
            </div>
          </form>
        </div>
      )}

      {editingNews && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateNews} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขประกาศข่าวสาร</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="title" defaultValue={editingNews.title} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <textarea name="content" defaultValue={editingNews.content} required rows="4" className="p-2 border rounded dark:bg-gray-700 dark:text-white"></textarea>
              <select name="is_active" defaultValue={editingNews.is_active} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingNews(null)} className="px-4 py-2 bg-gray-300 rounded">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">บันทึกการแก้ไข</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}