import { test, expect } from '@playwright/test';

test.describe('Protected Routing', () => {
  test('เข้า /admin โดยไม่ได้ล็อกอิน โดนเตะกลับไปหน้าเข้าสู่ระบบ', async ({ page }) => {
    await page.route('**/api/auth/status', route => {
      // Backend จริงคืนค่า 200 พร้อม authenticated: false
      route.fulfill({ status: 200, json: { authenticated: false } });
    });
    
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});