import axios from 'axios';

const ENV_BASE = import.meta?.env?.VITE_API_BASE_URL;

// ตัดเครื่องหมาย / ด้านหลังทิ้งเพื่อป้องกัน URL เบิ้ล //
const normalize = (u) => (u ? u.replace(/\/+$/, '') : u);

// ถ้าไม่ได้รันบนเครื่อง จะชี้ไปที่เซิร์ฟเวอร์ Backend บน Render
const API_BASE_URL = normalize(
  ENV_BASE ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://gtyconcerttestbe.onrender.com') // 👈 เปลี่ยนเป็นโดเมน Render ของคุณถ้ามี
);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ดึง Token แนบไปกับทุก Request อัตโนมัติ
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_BASE_URL };