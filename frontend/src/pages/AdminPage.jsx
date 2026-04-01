import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InteractiveSeatMap from '../components/InteractiveSeatMap'; // นำเข้าแผนที่ตัวใหม่

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [news, setNews] = useState([]);
  const [venues, setVenues] = useState([]); 

  const [editingConcert, setEditingConcert] = useState(null);
  const [editingNews, setEditingNews] = useState(null);

  // Map Builder States
  const [mapConcert, setMapConcert] = useState(null);
  const [mapSvg, setMapSvg] = useState('');
  const [channels, setChannels] = useState([{ id: 1, name: 'VIP', price: 5000, color: '#ef4444' }]);
  const [activeChannelId, setActiveChannelId] = useState(1);
  const [isEraserMode, setIsEraserMode] = useState(false); // โหมดยางลบ
  const [seatConfigs, setSeatConfigs] = useState([]); // เก็บที่นั่งทั้งหมดที่แอดมินเซ็ตไว้

  useEffect(() => { fetchData(); }, [activeTab]);

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
        const resV = await api.get('/api/admin/venues');
        setVenues(resV.data || []);
        const resC = await api.get('/api/admin/concerts');
        setConcerts(resC.data || []);
      }
      if (activeTab === 'venues') {
        const resV = await api.get('/api/admin/venues');
        setVenues(resV.data || []);
      }
      if (activeTab === 'news') {
        const resN = await api.get('/api/admin/news');
        setNews(resN.data || []);
      }
    } catch (e) { console.error("Error fetching admin data"); }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status });
      alert("อัปเดตสถานะผู้ใช้สำเร็จ");
    } catch (e) { alert("Error updating user"); }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) {
      await api.put(`/api/admin/bookings/${bookingId}/cancel`);
      fetchData();
    }
  };

  const handleUploadVenue = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const file = e.target.svg_file.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await api.post('/api/admin/venues', { name, svg_content: event.target.result });
        alert("อัปโหลดสถานที่ (SVG) สำเร็จ!");
        e.target.reset();
        fetchData();
      } catch (err) { alert("เกิดข้อผิดพลาดในการอัปโหลด"); }
    };
    reader.readAsText(file);
  };

  const handleDeleteVenue = async (id) => {
    if (window.confirm("ยืนยันการลบสถานที่?")) {
      await api.delete(`/api/admin/venues/${id}`);
      fetchData();
    }
  };

  const handleCreateConcert = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set('show_date', new Date(formData.get('show_date')).toISOString());
    try {
      await api.post('/api/admin/concerts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
      await api.put(`/api/admin/concerts/${editingConcert.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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

  // ================= MAP BUILDER LOGIC =================
  const openMapBuilder = async (c) => {
    setMapConcert(c);
    setSeatConfigs([]); 
    setIsEraserMode(false);
    try {
      const { data } = await api.get(`/api/concerts/${c.id}`);
      setMapSvg(data.svg_content || '');
      
      if (data.configured_seats && data.configured_seats.length > 0) {
        setSeatConfigs(data.configured_seats); // โหลดที่นั่งดั้งเดิมใส่ State
        
        // ดึงช่องสีราคาออกมาใส่ Channel
        const loadedChannels = new Map();
        data.configured_seats.forEach(s => {
          const chKey = `${s.zone_name}-${s.price}`;
          if (!loadedChannels.has(chKey)) {
            loadedChannels.set(chKey, { id: Date.now() + Math.random(), name: s.zone_name, price: s.price, color: s.color });
          }
        });
        const chArray = Array.from(loadedChannels.values());
        if(chArray.length > 0) {
          setChannels(chArray);
          setActiveChannelId(chArray[0].id);
        }
      }
    } catch (e) { alert("Error loading map"); }
  };

  // ฟังก์ชันรับค่าเมื่อ InteractiveSeatMap ตรวจจับการคลิก/ลากคลุมได้
  const handleAdminSeatSelect = (seats) => {
    const seatArray = Array.isArray(seats) ? seats : [seats];
    if (seatArray.length === 0) return;
    
    setSeatConfigs(prevConfigs => {
      // 1. จำลอง Map เพื่อการค้นหา/ลบ/แก้ไข ระดับ O(1) (ป้องกันเครื่องค้าง)
      const configMap = new Map();
      for (const config of prevConfigs) {
         configMap.set(config.seat_code, config);
      }
      
      const activeChannel = channels.find(c => c.id === activeChannelId);

      // 2. จัดการข้อมูลทีละเก้าอี้
      for (const seat of seatArray) {
        if (isEraserMode) {
          configMap.delete(seat.seat_code); // โหมดยางลบ: ลบออกจากการขาย
        } else if (activeChannel) {
          // ถ้าคลิกทีละ 1 ที่นั่ง แล้วสีนั้นถูกเลือกไว้อยู่แล้ว ให้ถือว่าเป็นการ "ยกเลิกสี (Toggle off)"
          if (seatArray.length === 1 && configMap.has(seat.seat_code) && configMap.get(seat.seat_code).zone_name === activeChannel.name) {
             configMap.delete(seat.seat_code);
          } else {
             // สาดสีใหม่ทับลงไป
             configMap.set(seat.seat_code, {
               seat_code: seat.seat_code,
               zone_name: activeChannel.name,
               price: Number(activeChannel.price),
               color: activeChannel.color
             });
          }
        }
      }
      
      return Array.from(configMap.values());
    });
  };

  const handleSaveMap = async () => {
    if (!window.confirm("ยืนยันการตั้งค่าผัง? (ที่นั่งที่ไม่ได้ระบายสีจะไม่ถูกเปิดขาย)")) return;

    try {
      await api.post(`/api/admin/concerts/${mapConcert.id}/seats`, { seats: seatConfigs });
      alert("บันทึกผังสำเร็จ!");
      setMapConcert(null);
    } catch(e) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
  };

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

  // ---------------- UI MAP BUILDER ----------------
  if (mapConcert) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4 bg-gray-50 min-h-screen select-none">
        <div className="flex justify-between items-center mb-6 bg-white p-4 shadow rounded border">
          <h2 className="text-2xl font-bold">📍 จัดการผังเปิดขาย: {mapConcert.name}</h2>
          <div className="space-x-4">
            <button onClick={() => setMapConcert(null)} className="px-4 py-2 bg-gray-300 rounded font-bold">กลับ</button>
            <button onClick={handleSaveMap} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-lg">💾 บันทึกการตั้งค่า</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/4 bg-white p-4 shadow rounded border h-fit">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">🎨 เครื่องมือจัดการโซน</h3>
            
            {/* ปุ่มโหมดยางลบ */}
            <button 
              onClick={() => setIsEraserMode(true)} 
              className={`w-full py-2 mb-4 font-bold rounded border transition-all ${isEraserMode ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
            >
              🧹 ยางลบ (ใช้ลบที่นั่งที่คลุมผิด)
            </button>

            <div className="space-y-4 mb-6">
              {channels.map((ch, idx) => (
                <div 
                  key={ch.id} 
                  onClick={() => { setActiveChannelId(ch.id); setIsEraserMode(false); }} 
                  className={`p-3 border rounded cursor-pointer transition-all ${!isEraserMode && activeChannelId === ch.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-md bg-blue-50' : 'border-gray-300'}`}
                >
                  <div className="flex flex-col space-y-2">
                    <input type="text" value={ch.name} placeholder="ชื่อโซน" onChange={(e) => { const newCh = [...channels]; newCh[idx].name = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full font-bold bg-white" />
                    <div className="flex gap-2">
                      <input type="number" value={ch.price} placeholder="ราคา" onChange={(e) => { const newCh = [...channels]; newCh[idx].price = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full bg-white" />
                      <input type="color" value={ch.color} onChange={(e) => { const newCh = [...channels]; newCh[idx].color = e.target.value; setChannels(newCh); }} className="h-8 w-12 cursor-pointer bg-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setChannels([...channels, { id: Date.now(), name: 'โซนใหม่', price: 1000, color: '#3b82f6' }])} className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 border border-blue-300 border-dashed">
              + เพิ่มสีโซนใหม่
            </button>
            
            <p className="text-sm text-gray-500 mt-6 bg-gray-100 p-3 rounded">
              💡 <b>ทิปส์การใช้งาน:</b> <br/>
              • <b>ลากคลุม:</b> กด <kbd className="bg-gray-300 px-1 rounded text-black">Shift</kbd> ค้างไว้แล้วลากเมาส์<br/>
              • <b>เลือกทั้งโซน:</b> คลิกที่กรอบเส้นโซนบนแผนที่<br/>
              • <b>ซูมเข้า/ออก:</b> กด <kbd className="bg-gray-300 px-1 rounded text-black">Ctrl</kbd> ค้าง + เลื่อนลูกกลิ้ง
            </p>
          </div>

          <div className="w-full lg:w-3/4 bg-[#0f172a] shadow rounded border h-175">
            <InteractiveSeatMap 
              svgContent={mapSvg}
              configuredSeats={seatConfigs}
              mode="admin"
              onSeatSelect={handleAdminSeatSelect}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------------- UI ADMIN DASHBOARD ----------------
  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <button onClick={() => setActiveTab('venues')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'venues' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>1. จัดการสถานที่ (SVG Map)</button>
        <button onClick={() => setActiveTab('concerts')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>2. จัดการคอนเสิร์ต/ผังที่นั่ง</button>
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>3. ดูการจองตั๋ว</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการผู้ใช้</button>
        <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'news' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>จัดการข่าวสาร</button>
      </div>

      {activeTab === 'venues' && (
        <div className="space-y-8 animate-fade-in">
          <form onSubmit={handleUploadVenue} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border shadow-sm dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 dark:text-white">+ อัปโหลดสถานที่ (SVG รูปเดียว)</h3>
            <div className="flex gap-4">
              <input type="text" name="name" placeholder="ชื่อสถานที่" required className="p-2 border rounded flex-1 dark:bg-gray-800 dark:text-white" />
              <input type="file" name="svg_file" accept=".svg" required className="p-2 border rounded flex-1 bg-white dark:bg-gray-800" />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold">อัปโหลด</button>
            </div>
          </form>
          <div className="grid grid-cols-2 gap-4">
            {venues.map(v => (
              <div key={v.id} className="bg-white dark:bg-gray-900 p-5 border dark:border-gray-700 rounded flex justify-between items-center">
                <span className="font-bold text-lg dark:text-white">{v.name}</span>
                <button onClick={() => handleDeleteVenue(v.id)} className="bg-red-500 text-white px-3 py-2 rounded">ลบ</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'concerts' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateConcert} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border shadow-sm dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 dark:text-white">+ สร้างคอนเสิร์ต</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="name" placeholder="ชื่อคอนเสิร์ต" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="text" name="venue" placeholder="สถานที่จัดงาน (ข้อความ)" className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <select name="venue_id" required className="p-2 border rounded dark:bg-gray-800 dark:text-white">
                <option value="">-- เลือกสถานที่ (SVG Map) --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" name="ticket_price" placeholder="ราคาตั๋วเริ่มต้น (บาท)" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="datetime-local" name="show_date" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <input type="file" name="image" accept="image/*" className="p-2 border rounded bg-white dark:bg-gray-800" title="รูปปกคอนเสิร์ต" />
            </div>
            <button type="submit" className="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">สร้างคอนเสิร์ต</button>
          </form>

          <div className="grid gap-4">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded shadow-sm flex justify-between items-center border-l-4 border-blue-500">
                <div>
                  <h4 className="font-bold text-xl dark:text-white">{c.name}</h4>
                  <p className="text-sm text-gray-500">สถานที่: {c.venue_name} | วันที่: {new Date(c.show_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openMapBuilder(c)} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-black hover:bg-purple-700 shadow transition">🗺️ จัดการผังที่นั่ง/ราคา</button>
                  <button onClick={() => setEditingConcert(c)} className="bg-blue-600 text-white px-4 py-3 rounded-lg font-bold">แก้ไข</button>
                  <button onClick={() => handleDeleteConcert(c.id)} className="bg-red-600 text-white px-4 py-3 rounded-lg font-bold">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">คอนเสิร์ต</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">รหัสที่นั่ง</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">ราคา</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">ผู้จอง (Email)</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">สถานะ</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const user = users.find(u => String(u.id) === String(b.user_id));
                return (
                  <tr key={b.id} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 font-bold dark:text-gray-300">{b.concert_name}</td>
                    <td className="px-6 py-4 text-blue-600 font-bold">{b.seat_code || 'ระบบเก่า'}</td>
                    <td className="px-6 py-4 dark:text-gray-300">฿{b.price}</td>
                    <td className="px-6 py-4 dark:text-gray-300">{user ? user.email : `User ID: ${b.user_id}`}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                    <td className="px-6 py-4">{b.status === 'confirmed' && <button onClick={() => handleCancelBooking(b.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">ยกเลิก</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Email</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Role</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">Status</th>
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

      {activeTab === 'news' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateNews} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border dark:border-gray-700">
            <h3 className="text-xl font-bold dark:text-white mb-4">+ ประกาศข่าวสารใหม่</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="title" placeholder="หัวข้อข่าว" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <textarea name="content" placeholder="รายละเอียดข่าวสาร" required rows="3" className="p-2 border rounded dark:bg-gray-800 dark:text-white"></textarea>
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
        </div>
      )}

      {/* MODALS */}
      {editingConcert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUpdateConcert} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขข้อมูลคอนเสิร์ต</h3>
            <div className="flex flex-col gap-4">
              <input type="text" name="name" defaultValue={editingConcert.name} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <input type="text" name="venue" defaultValue={editingConcert.venue || editingConcert.venue_name} placeholder="สถานที่ (ข้อความ)" className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <select name="venue_id" defaultValue={editingConcert.venue_id || ''} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="">-- ไม่ใช้ SVG Map --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" name="ticket_price" defaultValue={editingConcert.ticket_price} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <input type="datetime-local" name="show_date" defaultValue={formatDateForInput(editingConcert.show_date)} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <p className="text-sm text-gray-500 -mb-2">อัปเดตรูปภาพปก (เว้นว่างไว้หากใช้รูปเดิม)</p>
              <input type="file" name="image" accept="image/*" className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingConcert(null)} className="px-4 py-2 bg-gray-300 rounded">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">บันทึก</button>
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