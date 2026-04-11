import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Venue } from '../types';

// นำเข้า Icon
import placeImg from '../../../assets/place.png';
import ideaImg from '../../../assets/idea.png';
import eraserImg from '../../../assets/eraser.png';

const inputStyle = "w-full p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200";

export default function VenuesTab() {
  const [venues, setVenues] = useState<Venue[]>([]);

  const fetchVenues = async () => {
    try {
      const resV = await api.get('/api/admin/venues');
      setVenues(resV.data || []);
    } catch (e) { console.error("Error fetching venues"); }
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleUploadVenue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as any;
    const name = target.name.value;
    const file = target.svg_file.files[0];
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      try {
        await api.post('/api/admin/venues', { name, svg_content: event.target.result });
        alert("อัปโหลดสถานที่ (SVG) สำเร็จ!");
        target.reset();
        fetchVenues();
      } catch (err) { alert("เกิดข้อผิดพลาดในการอัปโหลด"); }
    };
    reader.readAsText(file);
  };

  const handleDeleteVenue = async (id: number) => {
    if (window.confirm("ยืนยันการลบสถานที่?")) {
      await api.delete(`/api/admin/venues/${id}`);
      fetchVenues();
    }
  };

  return (
    <div className="space-y-10 w-full">
      {/* ---------------- ฟอร์มอัปโหลด ---------------- */}
      <form onSubmit={handleUploadVenue} className="bg-white dark:bg-gray-800 p-8 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-500 to-cyan-400"></div>
        
        <h3 className="text-2xl font-black mb-6 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <img src={placeImg} alt="Venue" className="w-6 h-6 object-contain" />
          </div>
          อัปโหลดสถานที่ (SVG Map)
        </h3>

        <div className="flex flex-col md:flex-row gap-5 items-end">
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">ชื่อสถานที่</label>
            <input type="text" name="name" placeholder="ระบุชื่อสถานที่..." required className={inputStyle} />
          </div>
          <div className="w-full md:flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">ไฟล์ SVG</label>
            <input type="file" name="svg_file" accept=".svg" required className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 bg-white`} />
          </div>
          <button type="submit" className="w-full md:w-auto flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
            <img src={ideaImg} className="w-5 h-5 brightness-0 invert" alt="Upload" />
            อัปโหลด
          </button>
        </div>
      </form>

      {/* ---------------- รายการสถานที่ ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {venues.map(v => (
          <div key={v.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg shrink-0">
                <img src={placeImg} className="w-5 h-5 opacity-60 dark:invert" alt="Place" />
              </div>
              <span className="font-bold text-lg dark:text-white truncate">{v.name}</span>
            </div>
            <button onClick={() => handleDeleteVenue(v.id)} title="ลบ" className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
              <img src={eraserImg} alt="Delete" className="w-5 h-5 object-contain" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}