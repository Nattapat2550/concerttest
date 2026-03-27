// src/pages/ConcertBookPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ConcertBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const { data } = await api.get(`/api/concerts/${id}/seats`);
        setSeats(data || []);
      } catch (err) {
        alert("ไม่สามารถดึงข้อมูลที่นั่งได้");
      }
    };
    fetchSeats();
  }, [id]);

  const handleBook = async () => {
    if (!selectedSeat) return alert("กรุณาเลือกที่นั่ง");
    try {
      await api.post('/api/concerts/book', { concert_id: parseInt(id), seat_id: selectedSeat.id });
      alert("จองที่นั่งสำเร็จ!");
      navigate('/my-bookings');
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการจอง");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 dark:text-white border-b pb-4">ผังที่นั่งคอนเสิร์ต (Concert ID: {id})</h2>
      
      {/* เวที */}
      <div className="w-full bg-gray-300 dark:bg-gray-700 h-16 flex items-center justify-center rounded mb-10 text-xl font-bold dark:text-white shadow-inner">
        STAGE
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {seats.map(seat => (
          <button 
            key={seat.id} 
            disabled={seat.is_booked}
            onClick={() => setSelectedSeat(seat)}
            className={`w-16 h-16 rounded-lg text-sm font-bold flex items-center justify-center transition border-2 
              ${seat.is_booked ? 'bg-gray-400 border-gray-500 cursor-not-allowed text-white' : 
                selectedSeat?.id === seat.id ? 'bg-blue-600 border-blue-800 text-white shadow-lg transform scale-110' : 
                'bg-white dark:bg-gray-700 border-green-500 text-gray-800 dark:text-white hover:bg-green-100 dark:hover:bg-gray-600'}`}
          >
            {seat.seat_code} <br/> ฿{seat.price}
          </button>
        ))}
        {seats.length === 0 && <p className="text-gray-500">ไม่พบข้อมูลที่นั่ง (หรือยังไม่ได้สร้างในระบบ)</p>}
      </div>

      {/* สรุปและยืนยัน */}
      <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-lg flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold dark:text-white">ที่นั่งที่เลือก: <span className="text-blue-600">{selectedSeat ? selectedSeat.seat_code : '-'}</span></h3>
          <p className="text-gray-600 dark:text-gray-400">ราคา: ฿{selectedSeat ? selectedSeat.price : '0.00'}</p>
        </div>
        <button onClick={handleBook} disabled={!selectedSeat} className={`px-6 py-3 rounded-lg font-bold text-white transition ${selectedSeat ? 'bg-green-600 hover:bg-green-700 shadow-lg' : 'bg-gray-400 cursor-not-allowed'}`}>
          ยืนยันการจองที่นั่ง
        </button>
      </div>
    </div>
  );
}