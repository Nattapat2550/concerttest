import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('ล็อกอินสำเร็จพากลับไปหน้าแรก (/)', async ({ page }) => {
    // ✅ เปลี่ยนจาก **/api/login เป็น **/api/auth/login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-token', user: { id: 1, name: 'Test User' } }
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('ล็อกอินไม่สำเร็จแสดงข้อความ Error', async ({ page }) => {
    // ✅ เปลี่ยนให้ตรงกับ Backend ใหม่
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        json: { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'WrongPass!');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await expect(errorMsg).toBeVisible();
  });
});