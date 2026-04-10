import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import InteractiveSeatMap from '../../components/InteractiveSeatMap';
import { Concert, SeatConfig, Channel } from './types';

import placeImg from '../../assets/place.png';
import paintImg from '../../assets/paint.png';
import eraserImg from '../../assets/eraser.png';
import ideaImg from '../../assets/idea.png';
import settingsImg from '../../assets/settings.png';

interface MapBuilderProps {
  mapConcert: Concert;
  onBack: () => void;
}

export default function MapBuilder({ mapConcert, onBack }: MapBuilderProps) {
  const [mapSvg, setMapSvg] = useState('');
  const [channels, setChannels] = useState<Channel[]>([{ id: 1, name: 'VIP', price: 5000, color: '#ef4444' }]);
  const [activeChannelId, setActiveChannelId] = useState<number>(1);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [seatConfigs, setSeatConfigs] = useState<SeatConfig[]>([]);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${mapConcert.access_code}`);
        setMapSvg(data.svg_content || '');
        
        if (data.configured_seats && data.configured_seats.length > 0) {
          setSeatConfigs(data.configured_seats);
          
          const loadedChannels = new Map();
          data.configured_seats.forEach((s: any) => {
            const chKey = `${s.zone_name}-${s.price}`;
            if (!loadedChannels.has(chKey)) {
              loadedChannels.set(chKey, { id: Date.now() + Math.random(), name: s.zone_name, price: s.price, color: s.color });
            }
          });
          const chArray = Array.from(loadedChannels.values());
          if(chArray.length > 0) {
            setChannels(chArray);
            setActiveChannelId(chArray[0].id);
          }
        }
      } catch (e) { alert("Error loading map"); }
    };
    fetchMapData();
  }, [mapConcert.access_code]);

  const handleAdminSeatSelect = (seats: any) => {
    const seatArray = Array.isArray(seats) ? seats : [seats];
    if (seatArray.length === 0) return;
    
    setSeatConfigs(prevConfigs => {
      const configMap = new Map();
      for (const config of prevConfigs) {
         configMap.set(config.seat_code, config);
      }
      const activeChannel = channels.find(c => c.id === activeChannelId);

      for (const seat of seatArray) {
        if (isEraserMode) {
          configMap.delete(seat.seat_code);
        } else if (activeChannel) {
          if (seatArray.length === 1 && configMap.has(seat.seat_code) && configMap.get(seat.seat_code).zone_name === activeChannel.name) {
             configMap.delete(seat.seat_code);
          } else {
             configMap.set(seat.seat_code, {
               seat_code: seat.seat_code,
               zone_name: activeChannel.name,
               price: Number(activeChannel.price),
               color: activeChannel.color
             });
          }
        }
      }
      return Array.from(configMap.values());
    });
  };

  const handleSaveMap = async () => {
    if (!window.confirm("ยืนยันการตั้งค่าผัง? (ที่นั่งที่ไม่ได้ระบายสีจะไม่ถูกเปิดขาย)")) return;
    try {
      await api.post(`/api/admin/concerts/${mapConcert.id}/seats`, { seats: seatConfigs });
      alert("บันทึกผังสำเร็จ!");
      onBack();
    } catch(e) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
  };

  return (
    <div className="max-w-screen-2xl mx-auto p-4 bg-gray-50 min-h-screen select-none">
      <div className="flex justify-between items-center mb-6 bg-white p-4 shadow rounded border">
        <h2 className="text-2xl font-bold flex items-center">
          <img src={placeImg} alt="Place" className="w-8 h-8 mr-2 object-contain" /> 
          จัดการผังเปิดขาย: {mapConcert.name}
        </h2>
        <div className="space-x-4 flex items-center">
          <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded font-bold">กลับ</button>
          <button onClick={handleSaveMap} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-lg flex items-center">
            <img src={settingsImg} alt="Save" className="w-5 h-5 mr-2 brightness-0 invert object-contain" />
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/4 bg-white p-4 shadow rounded border h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center">
            <img src={paintImg} alt="Paint" className="w-6 h-6 mr-2 object-contain" /> 
            เครื่องมือจัดการโซน
          </h3>
          
          <button 
            onClick={() => setIsEraserMode(true)} 
            className={`w-full py-2 mb-4 font-bold rounded border transition-all flex items-center justify-center ${isEraserMode ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
          >
            <img src={eraserImg} alt="Eraser" className={`w-5 h-5 mr-2 object-contain ${isEraserMode ? 'brightness-0 invert' : ''}`} /> 
            ยางลบ (ใช้ลบที่นั่งที่คลุมผิด)
          </button>

          <div className="space-y-4 mb-6">
            {channels.map((ch, idx) => (
              <div 
                key={ch.id} 
                onClick={() => { setActiveChannelId(ch.id); setIsEraserMode(false); }} 
                className={`p-3 border rounded cursor-pointer transition-all ${!isEraserMode && activeChannelId === ch.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-md bg-blue-50' : 'border-gray-300'}`}
              >
                <div className="flex flex-col space-y-2">
                  <input type="text" value={ch.name} placeholder="ชื่อโซน" onChange={(e) => { const newCh = [...channels]; newCh[idx].name = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full font-bold bg-white" />
                  <div className="flex gap-2">
                    <input type="number" value={ch.price} placeholder="ราคา" onChange={(e) => { const newCh = [...channels]; newCh[idx].price = e.target.value; setChannels(newCh); }} className="p-1 border rounded w-full bg-white" />
                    <input type="color" value={ch.color} onChange={(e) => { const newCh = [...channels]; newCh[idx].color = e.target.value; setChannels(newCh); }} className="h-8 w-12 cursor-pointer bg-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setChannels([...channels, { id: Date.now(), name: 'โซนใหม่', price: 1000, color: '#3b82f6' }])} className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 border border-blue-300 border-dashed">
            + เพิ่มสีโซนใหม่
          </button>
          
          <p className="text-sm text-gray-500 mt-6 bg-gray-100 p-3 rounded">
            <span className="flex items-center font-bold text-gray-700 mb-2">
              <img src={ideaImg} alt="Idea" className="w-5 h-5 mr-2 object-contain" /> 
              ทิปส์การใช้งาน:
            </span>
            • <b>ลากคลุม:</b> กด <kbd className="bg-gray-300 px-1 rounded text-black">Shift</kbd> ค้างไว้แล้วลากเมาส์<br/>
            • <b>เลือกทั้งโซน:</b> คลิกที่กรอบเส้นโซนบนแผนที่<br/>
            • <b>ซูมเข้า/ออก:</b> กด <kbd className="bg-gray-300 px-1 rounded text-black">Ctrl</kbd> ค้าง + เลื่อนลูกกลิ้ง
          </p>
        </div>

        <div className="w-full lg:w-3/4 bg-[#0f172a] shadow rounded border h-175">
          <InteractiveSeatMap 
            svgContent={mapSvg}
            configuredSeats={seatConfigs}
            mode="admin"
            onSeatSelect={handleAdminSeatSelect}
          />
        </div>
      </div>
    </div>
  );
}