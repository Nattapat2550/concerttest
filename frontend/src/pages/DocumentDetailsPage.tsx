// frontend/src/pages/DocumentDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

interface DocumentDetail {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  gallery_urls: string;
  created_at: string;
}

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const { data } = await api.get(`/api/documents/${id}`);
        setDoc(data);
      } catch (err) {
        console.error("Failed to load document details");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-xl font-bold text-gray-900 dark:text-white">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center flex-col">
        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">ไม่พบข้อมูลที่คุณค้นหา</div>
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">กลับหน้าหลัก</Link>
      </div>
    );
  }

  // แปลง JSON String เป็น Array
  let gallery: string[] = [];
  try {
    gallery = JSON.parse(doc.gallery_urls || '[]');
  } catch (e) {
    gallery = [];
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 pt-24 px-6 md:px-12 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        
        <Link to="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 font-bold hover:underline mb-8 bg-white dark:bg-gray-800 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          &larr; กลับหน้าหลัก
        </Link>

        {/* ภาพปก */}
        {doc.cover_image && (
          <div className="w-full h-75 md:h-125 rounded-3xl overflow-hidden mb-10 shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <img src={doc.cover_image} alt={doc.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* หัวข้อและวันที่ */}
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
          {doc.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-10">
          เผยแพร่เมื่อ: {new Date(doc.created_at).toLocaleString('th-TH')}
        </p>

        {/* เนื้อหา (รองรับ HTML จาก Admin) */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none mb-16 text-gray-800 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm"
          dangerouslySetInnerHTML={{ __html: doc.description }}
        />

        {/* แกลเลอรี */}
        {gallery.length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8">แกลเลอรีรูปภาพ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {gallery.map((url, idx) => (
                <div key={idx} className="group rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-blue-500/30 transition-all cursor-pointer">
                  <img 
                    src={url} 
                    alt={`Gallery ${idx + 1}`} 
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" 
                    onClick={() => window.open(url, '_blank')} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}