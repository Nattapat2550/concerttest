import React, { useState } from 'react';
import { Concert } from './types';

import MapBuilder from './MapBuilder';
import VenuesTab from './tabs/VenuesTab';
import ConcertsTab from './tabs/ConcertsTab';
import BookingsTab from './tabs/BookingsTab';
import UsersTab from './tabs/UsersTab';
import NewsTab from './tabs/NewsTab';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('bookings'); 
  const [mapConcert, setMapConcert] = useState<Concert | null>(null);

  if (mapConcert) {
    return <MapBuilder mapConcert={mapConcert} onBack={() => setMapConcert(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 min-h-[70vh]">
      <h2 className="text-3xl font-bold mb-6 dark:text-white border-b dark:border-gray-700 pb-4">Admin Dashboard</h2>
      
      <div className="flex flex-wrap gap-4 mb-8 border-b dark:border-gray-700 pb-4">
        <TabButton id="venues" label="1. จัดการสถานที่ (SVG Map)" active={activeTab} onClick={setActiveTab} />
        <TabButton id="concerts" label="2. จัดการคอนเสิร์ต/ผังที่นั่ง" active={activeTab} onClick={setActiveTab} />
        <TabButton id="bookings" label="3. ดูการจองตั๋ว" active={activeTab} onClick={setActiveTab} />
        <TabButton id="users" label="จัดการผู้ใช้" active={activeTab} onClick={setActiveTab} />
        <TabButton id="news" label="จัดการข่าวสาร" active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="animate-fade-in">
        {activeTab === 'venues' && <VenuesTab />}
        {activeTab === 'concerts' && <ConcertsTab onOpenMapBuilder={setMapConcert} />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'news' && <NewsTab />}
      </div>
    </div>
  );
}

function TabButton({ id, label, active, onClick }: { id: string, label: string, active: string, onClick: (id: string) => void }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`px-4 py-2 rounded-lg font-bold transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
    >
      {label}
    </button>
  );
}