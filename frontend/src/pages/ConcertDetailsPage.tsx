import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import DOMPurify from 'dompurify';

interface ConcertDetail {
  id: number;
  name: string;
  description: string;
  image_url: string;
}

export default function ConcertDetailsPage() {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcert = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${accessCode}`);
        setConcert(data);
      } catch (err) {
        console.error("Failed to fetch concert details");
        alert("ไม่พบข้อมูลคอนเสิร์ตนี้");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchConcert();
  }, [accessCode, navigate]);

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]">กำลังโหลดข้อมูล...</div>;
  if (!concert) return null;

  // ล้างโค้ดอันตราย (XSS) อนุญาตให้ใช้แท็ก iframe (YouTube) และใส่สไตล์ได้
  const safeHTML = DOMPurify.sanitize(concert.description || '<p>ยังไม่มีรายละเอียดเพิ่มเติม</p>', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'img', 'iframe', 'br', 'ul', 'ol', 'li', 'span', 'div', 'u', 's', 'blockquote'],
    ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'target', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'rel']
  });

  return (
    <div className="bg-bg-main min-h-screen pb-16">
      {/* ถ้ามีรูปปก ให้แสดงเป็นแบนเนอร์ด้านบน */}
      {concert.image_url && (
         <div className="w-full h-64 md:h-96 bg-gray-900 flex items-center justify-center overflow-hidden">
            <img src={concert.image_url} alt={concert.name} className="w-full h-full object-cover opacity-80" />
         </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-10 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl md:text-5xl font-bold mb-8 text-center text-gray-900 dark:text-white border-b pb-6">
            {concert.name}
          </h1>
          
          {/* ส่วนนี้คือเนื้อหา HTML ที่ Owner สร้างจากหน้า Admin */}
          {/* คลาส prose จาก Tailwind Typography จะช่วยจัด Format ให้สวยงาม */}
          <div 
            className="prose prose-lg max-w-none dark:prose-invert 
                       prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto
                       prose-a:text-blue-600 hover:prose-a:text-blue-500
                       prose-iframe:w-full prose-iframe:aspect-video"
            dangerouslySetInnerHTML={{ __html: safeHTML }} 
          />
        </div>
      </div>
    </div>
  );
}