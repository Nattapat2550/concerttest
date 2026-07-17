import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CheckCodePage = () => {
 const navigate = useNavigate();
 const [email, setEmail] = useState('');
 const [code, setCode] = useState('');
 const [msg, setMsg] = useState<string | null>(null);

 useEffect(() => {
 const pending = sessionStorage.getItem('pendingEmail');
 if (!pending) {
 navigate('/register', { replace: true });
 return;
 }
 setEmail(pending);
 }, [navigate]);

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 setMsg(null);
 try {
 await api.post('/api/auth/verify-code', { email, code: code.trim() });
 // แก้ไข: เปลี่ยนจาก /form เป็น /complete-profile ให้ตรงกับ Route ใน App.tsx
 navigate(`/complete-profile?email=${encodeURIComponent(email)}`);
 } catch (err: any) {
 setMsg(err.response?.data?.error || 'รหัสยืนยันไม่ถูกต้อง หรือหมดอายุ');
 }
 };

 return (
 <div className="max-w-md w-full mx-auto mt-10 p-8 bg-canvas rounded-lg shadow-lg border border-outline text-center">
 <h2 className="text-2xl font-bold text-ink mb-2">ยืนยันรหัส</h2>
 <p className="text-sm text-muted mb-6">เราได้ส่งรหัสยืนยันไปที่ <br/><span className="font-semibold text-ink ">{email}</span></p>
 
 <form onSubmit={handleSubmit} className="space-y-4 text-left">
 <div>
 <label className="block text-sm font-medium text-ink mb-1">รหัส 6 หลัก</label>
 <input
 type="text" required value={code} onChange={(e) => setCode(e.target.value.trim())}
 className="w-full px-4 py-2 text-center tracking-widest text-lg bg-canvas border border-outline rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-ink "
 />
 </div>
 <button type="submit" className="w-full bg-primary hover:bg-primary-active text-white font-semibold py-2.5 rounded-lg transition-colors">
 ยืนยัน
 </button>
 </form>
 
 {msg && <p className="mt-4 text-sm text-red-600 ">{msg}</p>}
 </div>
 );
};

export default CheckCodePage;