import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    // 🌟 ดักจับ API เพื่อไม่ให้ Popup ข่าวสารเด้งบังจอ และไม่ให้เด้งหน้าเว็บค้าง
    await page.route('**/api/auth/status', route => route.fulfill({ status: 200, json: { authenticated: false } }));
    await page.route('**/api/concerts/news/latest', route => route.fulfill({ status: 200, json: [] }));
  });

  test('สมัครสำเร็จพาไปหน้ายืนยันรหัส (check)', async ({ page }) => {
    // 📌 จำลอง API ให้ตรงกับ /api/auth/register
    await page.route('**/api/auth/register', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    await page.goto('/register');
    
    // 📌 หน้าเว็บปัจจุบันมีแค่ช่องอีเมลช่องเดียว
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.click('button[type="submit"]');

    // 📌 สมัครเสร็จแล้วจะเด้งไปหน้า /check เพื่อยืนยันรหัส
    await expect(page).toHaveURL(/\/check/);
  });
});