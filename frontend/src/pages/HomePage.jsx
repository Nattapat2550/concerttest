// src/pages/HomePage.jsx
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
        ยินดีต้อนรับสู่ <span className="text-blue-600">Concert</span>
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl">
        แพลตฟอร์มสำหรับการจัดการและจองบัตรคอนเสิร์ตที่ดีที่สุดของคุณ 
        เริ่มต้นประสบการณ์ดนตรีสุดพิเศษได้ที่นี่
      </p>
      <div className="flex space-x-4">
        <Link 
          to="/register" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-transform hover:-translate-y-1"
        >
          สมัครสมาชิกเลย
        </Link>
        <Link 
          to="/login" 
          className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold shadow transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
};

export default HomePage;