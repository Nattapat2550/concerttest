import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // 🌟 1. ดักจับ API ให้อยู่ "ก่อน" page.goto() เสมอ!
    // ถ้าแอพยิง API ไปแล้วไม่มีคนตอบ มันจะค้าง 30 วินาทีจนหน้าเว็บโหลดไม่ขึ้น
    await page.route('**/api/auth/status', route => route.fulfill({ status: 200, json: { authenticated: false } }));
    await page.route('**/api/concerts/news/latest', route => route.fulfill({ status: 200, json: [] }));

    // 🌟 2. เข้าหน้าเว็บหลังจากเตรียม Mock API เสร็จแล้วเท่านั้น
    await page.goto('/login');
  });

  test('ล็อกอินสำเร็จพากลับไปหน้าแรก (/home)', async ({ page }) => {
    await page.route('**/api/auth/login', route => {
      route.fulfill({ status: 200, json: { token: 'fake-token', user: { id: 1, name: 'Test User', role: 'user' } } });
    });
    
    // จำลองเปลี่ยนสถานะ Auth หลังล็อกอิน
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: true, id: 1, role: 'user' } });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/home/);
  });

  test('ล็อกอินไม่สำเร็จแสดงข้อความ Error', async ({ page }) => {
    await page.route('**/api/auth/login', route => {
      route.fulfill({ status: 401, json: { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'WrongPass!');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await expect(errorMsg).toBeVisible();
  });
});