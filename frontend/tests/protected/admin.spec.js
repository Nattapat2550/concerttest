import { test, expect } from '@playwright/test';

test.describe('Admin Page Protection & Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // 🌟 ดักปิด News Popup ป้องกันมารบกวนการเทสต์
    await page.route('**/api/concerts/news/latest', route => route.fulfill({ status: 200, json: [] }));
  });

  test('ไม่ได้ล็อกอินพยายามเข้า /admin จะโดนเตะกลับไปหน้า login', async ({ page }) => {
    // 📌 Mock Status ว่ายังไม่ล็อกอิน
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: false } });
    });

    // พยายามเข้าหน้า admin ตรงๆ
    await page.goto('/admin');
    
    // ระบบ ProtectedRoute จะเตะกลับไปที่หน้า /login
    await expect(page).toHaveURL(/\/login/); 
  });

  test('Admin เข้า /admin และโหลดข้อมูล UI ใหม่ (Premium) สำเร็จ', async ({ page }) => {
    // 📌 1. Mock API สำหรับการ Login 
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-admin-token', user: { id: 1, name: 'Super Admin', role: 'admin' } }
      });
    });

    // 📌 2. จำลอง Auth Status เพื่อให้ Redux แจ้งเตือน ProtectedRoute ว่าล็อกอินเป็นแอดมินอยู่
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: true, id: 1, role: 'admin' } });
    });

    // ล็อกอินผ่าน UI
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');

    // 📌 3. ตรวจสอบให้แน่ใจว่าล็อกอินสำเร็จและเด้งไปหน้า /home
    await expect(page).toHaveURL(/\/home/);

    // 📌 4. ลองเข้าหน้า /admin
    await page.goto('/admin');
    
    // 📌 5. ตรวจสอบคำที่มีอยู่จริงใน AdminPage.jsx (Premium UI Version)
    await expect(page.locator('h2:has-text("Administrator Workspace")')).toBeVisible();
    await expect(page.locator('button:has-text("จัดการผู้ใช้")')).toBeVisible();
    await expect(page.locator('button:has-text("จัดการคอนเสิร์ต / ผังที่นั่ง")')).toBeVisible();
    await expect(page.locator('button:has-text("จัดการสถานที่")')).toBeVisible();
    await expect(page.locator('button:has-text("ดูการจองตั๋ว")')).toBeVisible();
  });
});