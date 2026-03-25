const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">เกี่ยวกับ Concert</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          Concert คือแพลตฟอร์มศูนย์รวมสำหรับผู้ที่รักในเสียงดนตรี เรามุ่งมั่นที่จะมอบประสบการณ์การจองบัตรคอนเสิร์ตที่ง่าย รวดเร็ว และปลอดภัยที่สุดให้กับผู้ใช้งานทุกคน
        </p>
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          โปรเจกต์นี้เริ่มต้นขึ้นจากความตั้งใจที่จะแก้ปัญหาความยุ่งยากในการจองบัตร ด้วยเทคโนโลยีที่ทันสมัยและระบบที่มีเสถียรภาพ เราพร้อมเป็นตัวกลางเชื่อมโยงระหว่างศิลปินและแฟนคลับ
        </p>
        <div className="mt-8 pt-8 border-t border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">พันธกิจของเรา</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>มอบประสบการณ์ใช้งานที่ลื่นไหล ไม่มีสะดุด</li>
            <li>รวบรวมคอนเสิร์ตคุณภาพจากทั่วโลกมาไว้ในที่เดียว</li>
            <li>สนับสนุนศิลปินและผู้จัดงานด้วยระบบที่โปร่งใส</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;