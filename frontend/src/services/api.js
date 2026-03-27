// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://gtyconcerttestbe.onrender.com', // หรือ URL Backend ของคุณ
});

// ✅ ตัวนี้สำคัญมาก จะคอยแนบ Token ไปกับทุกๆ Request อัตโนมัติ
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;