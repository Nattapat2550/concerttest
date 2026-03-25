import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api'; // ✅ แก้ไข Path ให้อ้างอิง api.js ได้ถูกต้อง

const initialState = {
  isAuthenticated: false,
  role: null,
  userId: null,
  status: 'idle',
  error: null
};

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/auth/status');
      return res.data; 
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Session expired');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, remember }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/login', { email, password, remember });
      return res.data; 
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/api/auth/logout');
      return {};
    } catch (err) {
      return rejectWithValue('Logout failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    // ✅ 1. เพิ่ม Reducers สำหรับรองรับ action ที่เรียกจาก LoginPage
    loginStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginSuccess(state, action) {
      state.status = 'succeeded';
      state.isAuthenticated = true;
      state.role = action.payload?.role || null;
      state.userId = action.payload?.id || null;
    },
    loginFailure(state, action) {
      state.status = 'failed';
      state.error = action.payload || 'Login failed';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { authenticated, role, id } = action.payload || {};
        state.isAuthenticated = !!authenticated;
        state.role = authenticated ? role : null;
        state.userId = authenticated ? id : null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.status = 'failed';
        state.isAuthenticated = false;
        state.role = null;
        state.userId = null;
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.ok && action.payload.user) {
          state.status = 'succeeded';
          state.isAuthenticated = true;
          state.role = action.payload.user.role;
          state.userId = action.payload.user.id;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.role = null;
        state.userId = null;
      });
  }
});

// ✅ 2. เพิ่ม Export ออกไปให้ LoginPage.jsx ใช้งานได้
export const { clearAuthError, loginStart, loginSuccess, loginFailure } = authSlice.actions;
export default authSlice.reducer;