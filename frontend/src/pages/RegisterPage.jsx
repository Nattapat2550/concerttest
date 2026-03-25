import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      return setErrorMsg('รหัสผ่านไม่ตรงกัน');
    }

    setLoading(true);
    try {
      // API จะรวมกับ BaseURL กลายเป็น /api/auth/register
      await api.post('/auth/register', { 
        email: formData.email,
        username: formData.name, 
        password: formData.password 
      });
      
      alert('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } catch (error) {
      const serverError = error.response?.data?.error?.message || error.response?.data?.message;
      setErrorMsg(serverError || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">สมัครสมาชิก</h2>
        
        {errorMsg && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded">
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ - นามสกุล</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ชื่อ นามสกุล"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              required
              minLength="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 mt-2 rounded-lg text-white font-semibold transition ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          มีบัญชีอยู่แล้ว? <a href="/login" className="text-blue-600 hover:underline font-medium">เข้าสู่ระบบ</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;