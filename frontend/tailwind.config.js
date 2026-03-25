/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // คุณสามารถกำหนดสีหลักของ Concert โปรเจกต์ได้ที่นี่
      colors: {
        primary: "#1D4ED8", // สีน้ำเงินหลัก
        secondary: "#9333EA", // สีรอง
      },
    },
  },
  plugins: [],
}