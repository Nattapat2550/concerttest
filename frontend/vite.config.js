import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // แจ้งเตือนและหยุดทำงานทันทีถ้าพอร์ต 3000 ถูกใช้งานอยู่
  },
  preview: {
    port: 3000,
    strictPort: true,
  }
})