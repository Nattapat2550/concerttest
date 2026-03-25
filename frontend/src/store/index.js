import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice'; // ตัวอย่าง reducer ของคุณ

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export default store;