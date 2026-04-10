import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Concert, Venue } from '../types';
import placeImg from '../../../assets/place.png';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface ConcertsTabProps {
  onOpenMapBuilder: (concert: Concert) => void;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

export default function ConcertsTab({ onOpenMapBuilder }: ConcertsTabProps) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [editingConcert, setEditingConcert] = useState<Concert | null>(null);

  const [newDescription, setNewDescription] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // 💡 เพิ่ม State สำหรับเปิด/ปิดโหมด HTML
  const [isHtmlModeNew, setIsHtmlModeNew] = useState(false);
  const [isHtmlModeEdit, setIsHtmlModeEdit] = useState(false);

  const fetchData = async () => {
    try {
      const resV = await api.get('/api/admin/venues');
      setVenues(resV.data || []);
      const resC = await api.get('/api/admin/concerts');
      setConcerts(resC.data || []);
    } catch (e) { console.error("Error fetching admin data"); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateConcert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const showDateStr = formData.get('show_date') as string;
    if (showDateStr) formData.set('show_date', new Date(showDateStr).toISOString());
    
    formData.append('description', newDescription);

    try {
      await api.post('/api/admin/concerts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert("สร้างคอนเสิร์ตสำเร็จ!");
      (e.target as HTMLFormElement).reset();
      setNewDescription('');
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleUpdateConcert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingConcert) return;
    const formData = new FormData(e.currentTarget);
    const showDateStr = formData.get('show_date') as string;
    if (showDateStr) formData.set('show_date', new Date(showDateStr).toISOString());
    
    formData.append('description', editDescription);

    try {
      await api.put(`/api/admin/concerts/${editingConcert.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert("แก้ไขคอนเสิร์ตสำเร็จ!");
      setEditingConcert(null);
      fetchData();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteConcert = async (id: number) => {
    if (window.confirm("ต้องการลบคอนเสิร์ตนี้?")) {
      await api.delete(`/api/admin/concerts/${id}`);
      fetchData();
    }
  };

  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().slice(0, 16);
  };

  const openEditModal = (c: Concert) => {
    setEditingConcert(c);
    setEditDescription(c.description || '');
    // ถ้าข้อมูลมี Tag HTML ให้เปิดโหมด Code เป็นค่าเริ่มต้น
    setIsHtmlModeEdit(c.description?.includes('<div') || c.description?.includes('<iframe') ? true : false);
  };

  return (
    <div className="space-y-8">
      {/* ฟอร์มสร้างคอนเสิร์ต */}
      <form onSubmit={handleCreateConcert} className="bg-gray-50 dark:bg-gray-900 p-6 rounded border shadow-sm dark:border-gray-700">
        <h3 className="text-xl font-bold mb-4 dark:text-white">+ สร้างคอนเสิร์ต</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" name="name" placeholder="ชื่อคอนเสิร์ต" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
          <input type="text" name="venue" placeholder="สถานที่จัดงาน (ข้อความ)" className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
          <select name="venue_id" required className="p-2 border rounded dark:bg-gray-800 dark:text-white">
            <option value="">-- เลือกสถานที่ (SVG Map) --</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input type="number" name="ticket_price" placeholder="ราคาตั๋วเริ่มต้น (บาท)" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
          <input type="datetime-local" name="show_date" required className="p-2 border rounded dark:bg-gray-800 dark:text-white" />
          <select name="is_active" className="p-2 border rounded dark:bg-gray-800 dark:text-white">
             <option value="false">ปิดรับจอง (Coming Soon)</option>
             <option value="true">เปิดให้จองทันที</option>
          </select>
          <input type="file" name="image" accept="image/*" className="p-2 border rounded bg-white dark:bg-gray-800" title="รูปปกคอนเสิร์ต" />
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              รายละเอียดคอนเสิร์ต
            </label>
            <button 
              type="button" 
              onClick={() => setIsHtmlModeNew(!isHtmlModeNew)} 
              className={`px-3 py-1 rounded text-sm font-bold transition ${isHtmlModeNew ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {isHtmlModeNew ? '💻 สลับไปใช้ Visual Editor' : '⚙️ สลับไปวางโค้ด HTML'}
            </button>
          </div>

          <div className="bg-white rounded overflow-hidden">
            {isHtmlModeNew ? (
              <textarea 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm bg-gray-900 text-green-400 border-none outline-none focus:ring-2 focus:ring-blue-500 rounded"
                placeholder=""
              />
            ) : (
              <ReactQuill 
                theme="snow" 
                modules={quillModules}
                value={newDescription} 
                onChange={setNewDescription} 
                className="h-64 mb-12"
              />
            )}
          </div>
          {isHtmlModeNew && <p className="text-xs text-red-500 mt-1">* <b>ข้อควรระวัง:</b> หากใส่โค้ด HTML/Tailwind ไปแล้ว กรุณาอย่าสลับกลับไปโหมด Visual Editor เพราะโปรแกรมอาจลบคลาส CSS ของคุณทิ้ง</p>}
        </div>

        <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">สร้างคอนเสิร์ต</button>
      </form>

      {/* ตารางแสดงคอนเสิร์ต */}
      <div className="grid gap-4">
        {concerts.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center border-l-4 border-blue-500 gap-4">
            <div>
              <h4 className="font-bold text-xl dark:text-white">
                 {c.name} 
                 {c.is_active ? <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">เปิดให้จองอยู่</span> : <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>}
              </h4>
              <p className="text-sm text-gray-500">สถานที่: {c.venue_name} | วันที่: {new Date(c.show_date).toLocaleDateString()}</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onOpenMapBuilder(c)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-black hover:bg-purple-700 shadow transition flex items-center">
                <img src={placeImg} alt="Manage" className="w-5 h-5 mr-2 brightness-0 invert object-contain" /> 
                ผังที่นั่ง
              </button>
              <button onClick={() => openEditModal(c)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">แก้ไข/จัดหน้า</button>
              <button onClick={() => handleDeleteConcert(c.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal แก้ไข */}
      {editingConcert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateConcert} className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 dark:text-white">แก้ไขข้อมูลและออกแบบหน้าเว็บ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" name="name" defaultValue={editingConcert.name} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <input type="text" name="venue" defaultValue={editingConcert.venue || editingConcert.venue_name} placeholder="สถานที่ (ข้อความ)" className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <select name="venue_id" defaultValue={editingConcert.venue_id || ''} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                <option value="">-- ไม่ใช้ SVG Map --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" name="ticket_price" defaultValue={editingConcert.ticket_price} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <input type="datetime-local" name="show_date" defaultValue={formatDateForInput(editingConcert.show_date)} required className="p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <select name="is_active" defaultValue={String(editingConcert.is_active)} className="p-2 border rounded dark:bg-gray-700 dark:text-white">
                 <option value="false">ปิดรับจอง (Coming Soon)</option>
                 <option value="true">เปิดให้จองทันที</option>
              </select>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  รายละเอียดคอนเสิร์ต
                </label>
                <button 
                  type="button" 
                  onClick={() => setIsHtmlModeEdit(!isHtmlModeEdit)} 
                  className={`px-3 py-1 rounded text-sm font-bold transition ${isHtmlModeEdit ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {isHtmlModeEdit ? '💻 สลับไปใช้ Visual Editor' : '⚙️ สลับไปวางโค้ด HTML'}
                </button>
              </div>

              <div className="bg-white rounded overflow-hidden">
                {isHtmlModeEdit ? (
                  <textarea 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full h-72 p-4 font-mono text-sm bg-gray-900 text-green-400 border-none outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    placeholder=""
                  />
                ) : (
                  <ReactQuill 
                    theme="snow" 
                    modules={quillModules}
                    value={editDescription} 
                    onChange={setEditDescription} 
                    className="h-72 mb-12"
                  />
                )}
              </div>
              {isHtmlModeEdit && <p className="text-xs text-red-500 mt-1">* <b>ข้อควรระวัง:</b> หากแก้ไขโค้ด HTML แล้ว ให้กดบันทึกเลย <b>ห้ามสลับกลับไปโหมด Visual Editor</b> ไม่งั้นระบบจะลบคลาส CSS ทิ้ง</p>}
            </div>

            <p className="text-sm text-gray-500 mb-2">อัปเดตรูปภาพปก (เว้นว่างไว้หากใช้รูปเดิม)</p>
            <input type="file" name="image" accept="image/*" className="p-2 border rounded dark:bg-gray-700 dark:text-white w-full mb-6" />
            
            <div className="flex justify-end gap-3 border-t pt-4">
              <button type="button" onClick={() => setEditingConcert(null)} className="px-6 py-2 bg-gray-300 rounded font-bold">ยกเลิก</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold">บันทึก</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}