import React from 'react';
import api from '../services/api';

const DownloadPage = () => {
  const handleDownloadWindows = () => {
    window.location.href = `${api.defaults.baseURL}/api/download/windows`;
  };

  const handleDownloadAndroid = () => {
    window.location.href = `${api.defaults.baseURL}/api/download/android`;
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">ดาวน์โหลดแอปพลิเคชัน</h2>
      
      <div className="flex flex-col sm:flex-row justify-center gap-6">
        <button 
          onClick={handleDownloadWindows} 
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          สำหรับ Windows (.exe)
        </button>

        <button 
          onClick={handleDownloadAndroid} 
          className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          สำหรับ Android (.apk)
        </button>
      </div>
    </div>
  );
};

export default DownloadPage;