import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('ล็อกอินสำเร็จพากลับไปหน้าแรก (/home)', async ({ page }) => {
    // 📌 จำลอง API ให้ตรงกับที่ LoginPage.jsx เรียกใช้งาน
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-token', user: { id: 1, name: 'Test User', role: 'user' } }
      });
    });

    // 📌 จำลอง Auth Status เพื่อไม่ให้ ProtectedRoute เตะกลับ
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: true, id: 1, role: 'user' } });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 📌 ล็อกอินสำเร็จ ต้องกลับมาที่หน้า /home
    await expect(page).toHaveURL(/\/home/);
  });

  test('ล็อกอินไม่สำเร็จแสดงข้อความ Error', async ({ page }) => {
    // 📌 จำลอง API กรณีล้มเหลว
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        json: { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } // Backend ส่งมาเป็น field `error`
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'WrongPass!');
    await page.click('button[type="submit"]');

    // ตรวจสอบข้อความแจ้งเตือนสีแดง
    const errorMsg = page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await expect(errorMsg).toBeVisible();
  });
});