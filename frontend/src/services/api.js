// src/services/api.js
import axios from 'axios';

// ดึง URL จาก Environment Variable (ค่าเริ่มต้นคือ http://localhost:8080)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // สำคัญมากถ้าใช้ Cookie/Session จาก Go Backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// สามารถใส่ Interceptors เพื่อแนบ Token อัตโนมัติได้ที่นี่ (ถ้ามี)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;