import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Venue } from '../types';

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
    <div className="space-y-8">
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
  );
}