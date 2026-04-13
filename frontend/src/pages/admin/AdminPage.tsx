// frontend/src/pages/admin/AdminPage.tsx
import React, { useState } from 'react';
import { Concert } from './types';

import MapBuilder from './MapBuilder';
import VenuesTab from './tabs/VenuesTab';
import ConcertsTab from './tabs/ConcertsTab';
import BookingsTab from './tabs/BookingsTab';
import UsersTab from './tabs/UsersTab';
import NewsTab from './tabs/NewsTab';
import ScanTicketTab from './tabs/ScanTicketTab'; 
import AppealsTab from './tabs/AppealsTab';

// Import Tab ตัวใหม่ที่สร้างขึ้น
import CarouselTab from './tabs/CarouselTab';
import DocumentsTab from './tabs/DocumentsTab';

// นำเข้าไอคอนสำหรับเมนู
import placeImg from '../../assets/place.png';
import ticketImg from '../../assets/ticket.png';
import calendarImg from '../../assets/calendar.png';
import userImg from '../../assets/user.png';
import ideaImg from '../../assets/idea.png';
import settingsImg from '../../assets/settings.png'; 

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [mapConcert, setMapConcert] = useState<Concert | null>(null);

  if (mapConcert) {
    return <MapBuilder mapConcert={mapConcert} onBack={() => setMapConcert(null)} />;
  }

  return (
    // ใช้ w-full แบบไร้ขอบด้านข้าง ประหยัดพื้นที่ขั้นสุด
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <img src={settingsImg} alt="Admin" className="w-8 h-8 dark:invert opacity-80" />
            Admin Dashboard
          </h2>
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 mt-6">
            <TabButton icon={placeImg} id="venues" label="จัดการสถานที่ (SVG Map)" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={ticketImg} id="concerts" label="จัดการคอนเสิร์ต / ผังที่นั่ง" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={calendarImg} id="bookings" label="ดูการจองตั๋ว" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={userImg} id="users" label="จัดการผู้ใช้" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={ideaImg} id="news" label="จัดการข่าวสาร" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={ticketImg} id="scan" label="แสกนบัตรเข้างาน (Scan)" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={userImg} id="appeals" label="คำร้องปลดแบน" active={activeTab} onClick={setActiveTab} />
            
            {/* เพิ่มปุ่มเมนูใหม่ */}
            <TabButton icon={ideaImg} id="carousels" label="จัดการหน้าแรก (Carousel)" active={activeTab} onClick={setActiveTab} />
            <TabButton icon={calendarImg} id="documents" label="จัดการข้อมูล/แกลเลอรี" active={activeTab} onClick={setActiveTab} />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 min-h-[70vh] animate-fade-in">
          {activeTab === 'venues' && <VenuesTab />}
          {activeTab === 'concerts' && <ConcertsTab onOpenMapBuilder={setMapConcert} />}
          {activeTab === 'bookings' && <BookingsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'scan' && <ScanTicketTab />}
          {activeTab === 'appeals' && <AppealsTab />}
          
          {/* แสดง Component ใหม่ตาม Tab */}
          {activeTab === 'carousels' && <CarouselTab />}
          {activeTab === 'documents' && <DocumentsTab />}
        </div>
        
      </div>
    </div>
  );
}

// ใช้งาน Icon ร่วมกับ Tab
function TabButton({ id, label, active, onClick, icon }: { id: string, label: string, active: string, onClick: (id: string) => void, icon: string }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm border ${
        isActive 
          ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 hover:bg-blue-700' 
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
      }`}
    >
      <img 
        src={icon} 
        alt={label} 
        className={`w-5 h-5 object-contain ${isActive ? 'brightness-0 invert' : 'dark:invert opacity-70'}`} 
      />
      {label}
    </button>
  );
}