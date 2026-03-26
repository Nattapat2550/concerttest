import { test, expect } from '@playwright/test';

test.describe('Protected Routing', () => {
  test('เข้า /admin โดยไม่ได้ล็อกอิน โดนเตะกลับไปหน้าเข้าสู่ระบบ', async ({ page }) => {
    // 1. จำลอง API ด่านตรวจสถานะการล็อกอิน ว่ายังไม่ได้เข้าสู่ระบบ
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: false } });
    });
    
    // 2. จำลอง API ดึงข้อมูล User (ซึ่งทำงานใน Layout.jsx) เพื่อไม่ให้เทสต์พังถ้ามันถูกเรียก
    await page.route('**/api/users/me', route => {
      route.fulfill({ status: 401, json: { message: "Unauthorized" } });
    });
    
    // 3. เข้าสู่หน้า Admin
    await page.goto('/admin');
    
    // 4. รอจนกว่า URL จะถูก Redirect ไปที่ /login (ช่วยป้องกันอาการ Flaky Test)
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // 5. ยืนยันว่าหน้าเว็บปัจจุบันคือหน้าเข้าสู่ระบบ
    await expect(page).toHaveURL(/.*\/login/);
  });
});