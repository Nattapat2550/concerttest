import { useSelector } from 'react-redux';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">จัดการระบบ (Admin Dashboard)</h1>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          ผู้ดูแลระบบ: {user?.name || 'Admin'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">ผู้ใช้งานทั้งหมด</h3>
          <p className="text-4xl font-bold text-blue-600 mt-4">1,245</p>
        </div>
        
        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">คอนเสิร์ตที่กำลังจะมาถึง</h3>
          <p className="text-4xl font-bold text-purple-600 mt-4">12</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">ยอดจองตั๋ววันนี้</h3>
          <p className="text-4xl font-bold text-green-600 mt-4">340</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">รายการคอนเสิร์ตล่าสุด</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          กำลังโหลดข้อมูลคอนเสิร์ต...
        </div>
      </div>
    </div>
  );
};

export default AdminPage;