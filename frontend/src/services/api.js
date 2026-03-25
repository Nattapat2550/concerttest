import axios from 'axios';

// ดึง URL จาก .env (ถ้ารันในเครื่องและไม่มี .env จะ fallback ไปที่พอร์ต 5000 ของ Rust)
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;