const ContactPage = () => {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-10">ติดต่อเรา</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Contact Info */}
        <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6">ช่องทางการติดต่อ</h2>
          <p className="mb-8 text-blue-100">หากคุณมีข้อสงสัยหรือต้องการความช่วยเหลือ สามารถติดต่อทีมงานของเราได้ตลอด 24 ชั่วโมง</p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-xl">📍</span>
              <span>123 ถนนสุขุมวิท กรุงเทพมหานคร 10110</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xl">📞</span>
              <span>02-123-4567</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xl">✉️</span>
              <span>support@concert.com</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <form className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อของคุณ</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ข้อความ</label>
              <textarea rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="พิมพ์ข้อความของคุณที่นี่..."></textarea>
            </div>
            <button type="button" className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-semibold transition">
              ส่งข้อความ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;