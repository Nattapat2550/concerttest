import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Concert, Venue } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// นำเข้าไอคอนแทน Emoji
import placeImg from '../../../assets/place.png';
import ticketImg from '../../../assets/ticket.png';
import paintImg from '../../../assets/paint.png';
import settingsImg from '../../../assets/settings.png';
import eraserImg from '../../../assets/eraser.png';
import ideaImg from '../../../assets/idea.png';
import calendarImg from '../../../assets/calendar.png';

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

// สไตล์ Input มาตรฐานเพื่อความสวยงาม
const inputStyle = "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
const labelStyle = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5";

export default function ConcertsTab({ onOpenMapBuilder }: ConcertsTabProps) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [editingConcert, setEditingConcert] = useState<Concert | null>(null);

  const [newDescription, setNewDescription] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
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
    setIsHtmlModeEdit(c.description?.includes('<div') || c.description?.includes('<iframe') ? true : false);
  };

  return (
    <div className="space-y-8 w-full">
      {/* ---------------- ฟอร์มสร้างคอนเสิร์ต ---------------- */}
      <form onSubmit={handleCreateConcert} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
        {/* แถบสีตกแต่งด้านบน */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-green-400 to-blue-500"></div>
        
        <h3 className="text-2xl font-black mb-6 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <img src={ideaImg} alt="Create" className="w-6 h-6 object-contain" />
          </div>
          สร้างคอนเสิร์ตใหม่
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="lg:col-span-2">
            <label className={labelStyle}>ชื่อคอนเสิร์ต *</label>
            <input type="text" name="name" placeholder="ระบุชื่อคอนเสิร์ต" required className={inputStyle} />
          </div>
          
          {/* เพิ่มช่อง Concert ID ในฟอร์มสร้างแบบอ่านอย่างเดียว เพื่อความครบถ้วน */}
          <div className="lg:col-span-1">
             <label className={labelStyle}>รหัสคอนเสิร์ต (Concert ID)</label>
             <input type="text" disabled placeholder="สร้างอัตโนมัติ" className={`${inputStyle} bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed`} />
          </div>

          <div className="lg:col-span-1">
            <label className={labelStyle}>สถานะการจอง</label>
            <select name="is_active" className={inputStyle}>
              <option value="false">ปิดรับจอง (Coming Soon)</option>
              <option value="true">เปิดให้จองทันที</option>
            </select>
          </div>

          <div>
            <label className={labelStyle}>สถานที่จัดงาน (ข้อความ)</label>
            <input type="text" name="venue" placeholder="เช่น อิมแพ็ค อารีน่า" className={inputStyle} />
          </div>

          <div>
            <label className={labelStyle}>เลือกสถานที่ (SVG Map) *</label>
            <select name="venue_id" required className={inputStyle}>
              <option value="">-- เลือกเพื่อใช้ผังที่นั่ง --</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelStyle}>ราคาตั๋วเริ่มต้น (บาท) *</label>
            <input type="number" name="ticket_price" placeholder="0.00" required className={inputStyle} />
          </div>

          <div>
            <label className={labelStyle}>วันและเวลาแสดง *</label>
            <input type="datetime-local" name="show_date" required className={inputStyle} />
          </div>
        </div>

        <div className="mb-6">
          <label className={labelStyle}>รูปภาพปกคอนเสิร์ต</label>
          <input type="file" name="image" accept="image/*" className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400`} />
        </div>
        
        {/* ส่วน Text Editor */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-between items-end mb-3 gap-3">
            <label className={`${labelStyle} mb-0`}>รายละเอียดคอนเสิร์ต</label>
            <button 
              type="button" 
              onClick={() => setIsHtmlModeNew(!isHtmlModeNew)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                isHtmlModeNew 
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/30' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
              }`}
            >
              <img src={isHtmlModeNew ? paintImg : settingsImg} alt="Mode" className={`w-4 h-4 object-contain ${isHtmlModeNew ? 'brightness-0 invert' : 'dark:invert opacity-70'}`} />
              {isHtmlModeNew ? 'สลับไปใช้ Visual Editor' : 'สลับไปวางโค้ด HTML'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {isHtmlModeNew ? (
              <textarea 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full h-64 p-5 font-mono text-sm bg-[#1e1e1e] text-green-400 border-none outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                placeholder=""
              />
            ) : (
              <ReactQuill 
                theme="snow" 
                modules={quillModules}
                value={newDescription} 
                onChange={setNewDescription} 
                className="h-64 mb-10"
              />
            )}
          </div>
          {isHtmlModeNew && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
              <img src={eraserImg} alt="Warning" className="w-3 h-3 object-contain" />
              ข้อควรระวัง: หากใส่โค้ด HTML/Tailwind ไปแล้ว กรุณาอย่าสลับกลับไปโหมด Visual Editor เพราะโปรแกรมจะลบคลาส CSS ของคุณทิ้ง
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-0.5">
            <img src={ideaImg} className="w-5 h-5 brightness-0 invert" alt="Save" />
            สร้างคอนเสิร์ต
          </button>
        </div>
      </form>

      {/* ---------------- ตารางแสดงคอนเสิร์ต (Grid Layout) ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {concerts.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full relative">
            
            {/* Status Badge & ID */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-md">
                ID: {c.id}
              </span>
              {c.is_active ? (
                <span className="text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800/50">เปิดให้จองอยู่</span>
              ) : (
                <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">Coming Soon</span>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <h4 className="font-black text-xl text-gray-900 dark:text-white mb-4 line-clamp-2 leading-tight">
                 {c.name} 
              </h4>
              <div className="space-y-2 mt-auto">
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <img src={placeImg} className="w-4 h-4 opacity-60 dark:invert" alt="Venue" />
                  <span className="truncate">{c.venue_name || c.venue || 'ไม่ระบุสถานที่'}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <img src={calendarImg} className="w-4 h-4 opacity-60 dark:invert" alt="Date" />
                  {new Date(c.show_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <img src={ticketImg} className="w-4 h-4 opacity-60 dark:invert" alt="Price" />
                  เริ่มต้น ฿{c.ticket_price?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2">
              <button onClick={() => onOpenMapBuilder(c)} title="ผังที่นั่ง" className="flex items-center justify-center py-2.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl transition-colors font-bold text-sm">
                <img src={placeImg} alt="Map" className="w-4 h-4 object-contain" />
              </button>
              <button onClick={() => openEditModal(c)} className="flex items-center justify-center py-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl transition-colors font-bold text-sm">
                แก้ไข
              </button>
              <button onClick={() => handleDeleteConcert(c.id)} className="flex items-center justify-center py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-xl transition-colors font-bold text-sm">
                ลบ
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Modal แก้ไข ---------------- */}
      {editingConcert && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-hidden">
          <form onSubmit={handleUpdateConcert} className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
            
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <img src={settingsImg} alt="Edit" className="w-5 h-5 object-contain dark:invert opacity-80" />
                </div>
                แก้ไขคอนเสิร์ต
              </h3>
              <button type="button" onClick={() => setEditingConcert(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold p-2 leading-none">&times;</button>
            </div>

            <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                
                {/* ช่อง Concert ID (ชัดเจนในโหมดแก้ไข) */}
                <div className="lg:col-span-1">
                   <label className={labelStyle}>รหัสคอนเสิร์ต (Concert ID)</label>
                   <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                     <span className="px-4 py-3 bg-gray-200 dark:bg-gray-800 text-gray-500 font-bold border-r border-gray-300 dark:border-gray-700">ID</span>
                     <input type="text" disabled value={editingConcert.id} className="w-full p-3 bg-transparent text-gray-700 dark:text-gray-300 font-mono font-bold outline-none" />
                   </div>
                </div>

                <div className="lg:col-span-3">
                  <label className={labelStyle}>ชื่อคอนเสิร์ต *</label>
                  <input type="text" name="name" defaultValue={editingConcert.name} required className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>สถานที่ (ข้อความ)</label>
                  <input type="text" name="venue" defaultValue={editingConcert.venue || editingConcert.venue_name} className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>เลือกสถานที่ (SVG Map)</label>
                  <select name="venue_id" defaultValue={editingConcert.venue_id || ''} className={inputStyle}>
                    <option value="">-- ไม่ใช้ SVG Map --</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>ราคาตั๋วเริ่มต้น (บาท) *</label>
                  <input type="number" name="ticket_price" defaultValue={editingConcert.ticket_price} required className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>วันและเวลาแสดง *</label>
                  <input type="datetime-local" name="show_date" defaultValue={formatDateForInput(editingConcert.show_date)} required className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>สถานะการจอง</label>
                  <select name="is_active" defaultValue={String(editingConcert.is_active)} className={inputStyle}>
                     <option value="false">ปิดรับจอง (Coming Soon)</option>
                     <option value="true">เปิดให้จองทันที</option>
                  </select>
                </div>
                
                <div className="lg:col-span-3">
                  <label className={labelStyle}>อัปเดตรูปภาพปก (เว้นว่างหากใช้รูปเดิม)</label>
                  <input type="file" name="image" accept="image/*" className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700`} />
                </div>
              </div>

              <div className="mb-2">
                <div className="flex flex-wrap justify-between items-end mb-3 gap-3">
                  <label className={`${labelStyle} mb-0`}>รายละเอียดคอนเสิร์ต / จัดหน้าเว็บ</label>
                  <button 
                    type="button" 
                    onClick={() => setIsHtmlModeEdit(!isHtmlModeEdit)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                      isHtmlModeEdit 
                        ? 'bg-purple-600 text-white shadow-purple-500/30' 
                        : 'bg-white text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <img src={isHtmlModeEdit ? paintImg : settingsImg} alt="Mode" className={`w-4 h-4 object-contain ${isHtmlModeEdit ? 'brightness-0 invert' : 'dark:invert opacity-70'}`} />
                    {isHtmlModeEdit ? 'สลับไปใช้ Visual Editor' : 'สลับไปวางโค้ด HTML'}
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  {isHtmlModeEdit ? (
                    <textarea 
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full h-80 p-5 font-mono text-sm bg-[#1e1e1e] text-green-400 border-none outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                      placeholder=""
                    />
                  ) : (
                    <ReactQuill 
                      theme="snow" 
                      modules={quillModules}
                      value={editDescription} 
                      onChange={setEditDescription} 
                      className="h-80 mb-10"
                    />
                  )}
                </div>
                {isHtmlModeEdit && (
                  <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                    <img src={eraserImg} alt="Warning" className="w-3 h-3 object-contain" />
                    ข้อควรระวัง: หากแก้ไขโค้ด HTML แล้ว ให้กดบันทึกเลย ห้ามสลับกลับไปโหมด Visual Editor ไม่งั้นระบบจะลบคลาส CSS ทิ้ง
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setEditingConcert(null)} className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                ยกเลิก
              </button>
              <button type="submit" className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                <img src={ideaImg} alt="Save" className="w-5 h-5 brightness-0 invert" />
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}