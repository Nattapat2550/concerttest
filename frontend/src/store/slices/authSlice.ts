import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// 1. สร้าง Interface เก็บโครงสร้าง Auth State
interface AuthState {
  isAuthenticated: boolean;
  role: string | null;
  userId: number | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
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
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Session expired');
    }
  }
);

// 2. บอก Redux Thunk ว่าพารามิเตอร์ที่รับเข้ามาเป็น Object ที่มี email, password, remember
interface LoginParams {
  email?: string;
  password?: string;
  remember?: boolean;
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, remember }: LoginParams, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/auth/login', { email, password, remember });
      return res.data;
    } catch (err: any) {
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
    } catch (err: any) {
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
      .addCase(login.rejected, (state, action: PayloadAction<any>) => {
        state.status = 'failed';
        state.error = action.payload as string; // บอกว่าเป็น String
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.role = null;
        state.userId = null;
      });
  }
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;