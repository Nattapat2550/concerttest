import { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // จำลองการส่ง API ขอรีเซ็ตรหัสผ่าน
    setMessage(`ลิงก์รีเซ็ตรหัสผ่านได้ถูกส่งไปยัง ${email} แล้ว`);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">ลืมรหัสผ่าน?</h2>
        <p className="text-center text-gray-600 mb-6 text-sm">กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
        
        {message && <div className="bg-green-100 text-green-700 p-3 mb-4 rounded text-sm text-center">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลของคุณ</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="example@email.com" />
          </div>
          <button type="submit" className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition">
            ส่งลิงก์รีเซ็ตรหัสผ่าน
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;