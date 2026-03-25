// src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// 📌 ดึง token จาก LocalStorage ตอนที่เว็บโหลดครั้งแรก
const token = localStorage.getItem('token');

const initialState = {
  user: null,
  // 📌 ถ้ามี token อยู่ในเครื่อง ให้ถือว่า isAuthenticated เป็น true ตั้งแต่เริ่ม
  isAuthenticated: !!token, 
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload; // เก็บข้อมูล user จาก backend
    },
    loginFailure: (state) => {
      state.loading = false;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token'); // ลบ token ออกเมื่อล็อกเอาท์
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;