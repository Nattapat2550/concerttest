import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [news, setNews] = useState([]);
  const [venues, setVenues] = useState([]); 

  // Map Builder States
  const [mapConcert, setMapConcert] = useState(null);
  const [mapSvg, setMapSvg] = useState('');
  const [channels, setChannels] = useState([{ id: 1, name: 'VIP', price: 5000, color: '#ef4444' }]);
  const [activeChannelId, setActiveChannelId] = useState(1);
  const seatConfigRef = useRef({}); 
  const svgContainerRef = useRef(null);

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
    } catch (e) { console.error(e); }
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
      } catch (err) { alert("เกิดข้อผิดพลาด"); }
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
      await api.post('/api/admin/concerts', formData);
      alert("สร้างคอนเสิร์ตสำเร็จ!");
      e.target.reset();
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  // ================= MAP BUILDER LOGIC =================
  const openMapBuilder = async (c) => {
    setMapConcert(c);
    seatConfigRef.current = {}; 
    try {
      const { data } = await api.get(`/api/concerts/${c.id}`);
      setMapSvg(data.svg_content || '');
      
      if (data.configured_seats && data.configured_seats.length > 0) {
        const loadedChannels = new Map();
        data.configured_seats.forEach(s => {
          const chKey = `${s.zone_name}-${s.price}`;
          let chId;
          if (!loadedChannels.has(chKey)) {
            chId = Date.now() + Math.random();
            loadedChannels.set(chKey, { id: chId, name: s.zone_name, price: s.price, color: s.color });
          } else { chId = loadedChannels.get(chKey).id; }
          
          seatConfigRef.current[s.seat_code] = loadedChannels.get(chKey);
        });
        const chArray = Array.from(loadedChannels.values());
        if(chArray.length > 0) {
          setChannels(chArray);
          setActiveChannelId(chArray[0].id);
        }
      }
    } catch (e) { alert("Error loading map"); }
  };

  useEffect(() => {
    if (mapConcert && mapSvg && svgContainerRef.current) {
      let isMouseDown = false;
      const seats = svgContainerRef.current.querySelectorAll('.seat');

      seats.forEach(seat => {
        const seatId = seat.getAttribute('id');
        const config = seatConfigRef.current[seatId];
        seat.style.fill = config ? config.color : '#334155'; // สีเริ่มต้น
        seat.style.cursor = 'crosshair';
        seat.style.transition = 'none';

        const paintSeat = () => {
          const activeChannel = channels.find(c => c.id === activeChannelId);
          if (!activeChannel) return;
          
          if (seatConfigRef.current[seatId]?.id === activeChannel.id) {
            delete seatConfigRef.current[seatId];
            seat.style.fill = '#334155'; 
          } else {
            seatConfigRef.current[seatId] = activeChannel;
            seat.style.fill = activeChannel.color;
          }
        };

        seat.onmousedown = (e) => { isMouseDown = true; paintSeat(); e.preventDefault(); };
        seat.onmouseenter = () => { if (isMouseDown) paintSeat(); };
      });

      document.onmouseup = () => { isMouseDown = false; };
      return () => { document.onmouseup = null; };
    }
  }, [mapConcert, mapSvg, activeChannelId, channels]);

  const handleSaveMap = async () => {
    if (!window.confirm("ยืนยันการตั้งค่าผัง? (ที่นั่งที่ไม่ได้ระบายสีจะไม่ถูกเปิดขาย)")) return;
    
    const seatsToSave = Object.keys(seatConfigRef.current).map(seatId => {
      const ch = seatConfigRef.current[seatId];
      return { seat_code: seatId, zone_name: ch.name, price: Number(ch.price), color: ch.color };
    });

    try {
      await api.post(`/api/admin/concerts/${mapConcert.id}/seats`, { seats: seatsToSave });
      alert("บันทึกผังสำเร็จ!");
      setMapConcert(null);
    } catch(e) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
  };

  // ---------------- UI ----------------
  if (mapConcert) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4 bg-gray-50 min-h-screen select-none">
        <div className="flex justify-between items-center mb-6 bg-white p-4 shadow rounded border">
          <h2 className="text-2xl font-bold">📍 จัดการผังเปิดขาย: {mapConcert.name}</h2>
          <div className="space-x-4">
            <button onClick={() => setMapConcert(null)} className="px-4 py-2 bg-gray-300 rounded font-bold">กลับ</button>
            <button onClick={handleSaveMap} className="px-6 py-2 bg-green-600 text-white rounded font-bold">💾 บันทึกผังที่นั่ง</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/4 bg-white p-4 shadow rounded border h-fit">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">🎨 สร้างโซน/ราคา</h3>
            <div className="space-y-4 mb-6">
              {channels.map((ch, idx) => (
                <div key={ch.id} onClick={() => setActiveChannelId(ch.id)} className={`p-3 border rounded cursor-pointer transition-all ${activeChannelId === ch.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-gray-300'}`}>
                  <div className="flex flex-col space-y-2">
                    <input type="text" value={ch.name} placeholder="ชื่อโซน" onChange={(e) => { const newCh = [...channels]; newCh[idx].name = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full font-bold" />
                    <div className="flex gap-2">
                      <input type="number" value={ch.price} placeholder="ราคา" onChange={(e) => { const newCh = [...channels]; newCh[idx].price = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full" />
                      <input type="color" value={ch.color} onChange={(e) => { const newCh = [...channels]; newCh[idx].color = e.target.value; setChannels(newCh); }} className="h-8 w-12 cursor-pointer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setChannels([...channels, { id: Date.now(), name: 'โซนใหม่', price: 1000, color: '#3b82f6' }])} className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded">
              + เพิ่มสีโซน (Channel)
            </button>
            <p className="text-sm text-gray-500 mt-6 bg-gray-100 p-3 rounded">💡 <b>วิธีใช้:</b> เลือกสีโซนด้านบน จากนั้นคลิกหรือลากผ่านเก้าอี้บนแผนที่เพื่อเปิดขาย (คลิกซ้ำเพื่อยกเลิก)</p>
          </div>

          <div className="w-full lg:w-3/4 bg-gray-900 p-6 shadow rounded border overflow-auto h-[700px] flex justify-center items-start cursor-crosshair">
            {mapSvg ? (
              <div ref={svgContainerRef} className="w-full max-w-[1200px]" dangerouslySetInnerHTML={{ __html: mapSvg }} />
            ) : (
              <p className="py-20 text-gray-400 font-bold text-xl">คอนเสิร์ตนี้ยังไม่มี SVG Map</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <button onClick={() => setActiveTab('venues')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'venues' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>1. จัดการสถานที่ (SVG Map)</button>
        <button onClick={() => setActiveTab('concerts')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'concerts' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>2. จัดการคอนเสิร์ต/ผังที่นั่ง</button>
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>3. ดูการจองตั๋ว</button>
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
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="name" placeholder="ชื่อคอนเสิร์ต" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
              <select name="venue_id" required className="p-2 border rounded dark:bg-gray-800 dark:text-white">
                <option value="">-- เลือกสถานที่ (SVG Map) --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="datetime-local" name="show_date" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
            </div>
            <button type="submit" className="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded">สร้างคอนเสิร์ต</button>
          </form>
          <div className="grid gap-4">
            {concerts.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded shadow-sm flex justify-between items-center border-l-4 border-blue-500">
                <div>
                  <h4 className="font-bold text-xl dark:text-white">{c.name}</h4>
                  <p className="text-gray-500">วันที่: {new Date(c.show_date).toLocaleDateString()}</p>
                </div>
                <button onClick={() => openMapBuilder(c)} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-black hover:bg-purple-700">🗺️ จัดการผังที่นั่ง</button>
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
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">สถานะ</th>
                <th className="px-6 py-3 text-left text-sm font-bold dark:text-gray-200">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b dark:border-gray-700">
                  <td className="px-6 py-4 font-bold dark:text-gray-300">{b.concert_name}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">{b.seat_code} (฿{b.price})</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                  <td className="px-6 py-4">{b.status === 'confirmed' && <button onClick={() => handleCancelBooking(b.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">ยกเลิก</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}