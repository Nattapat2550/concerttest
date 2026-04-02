import { test, expect } from '@playwright/test';

test.describe('Reset Password Page', () => {
  test.beforeEach(async ({ page }) => {
    // 🌟 ดักจับ API เพื่อไม่ให้ Popup ข่าวสารเด้งบังจอ
    await page.route('**/api/auth/status', route => route.fulfill({ status: 200, json: { authenticated: false } }));
    await page.route('**/api/concerts/news/latest', route => route.fulfill({ status: 200, json: [] }));
  });

  test('ขอลิงก์รีเซ็ตรหัสผ่านสำเร็จ', async ({ page }) => {
    // 📌 แก้ไข URL ให้ตรงกับที่กำหนดใน App.jsx คือ /reset
    await page.goto('/reset');
    
    // 📌 Mock API ของ forgot-password
    await page.route('**/api/auth/forgot-password', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    // กรอกอีเมลและกดส่ง
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // 📌 ตรวจสอบข้อความแจ้งเตือนให้ตรงกับโค้ด React ปัจจุบัน
    await expect(page.locator('text=If that email exists, a reset link was sent.')).toBeVisible();
  });
});