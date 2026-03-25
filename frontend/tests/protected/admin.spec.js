import { test, expect } from '@playwright/test';

test.describe('Admin Page Protection', () => {
  test('ไม่ได้ล็อกอินพยายามเข้า /admin จะโดนเตะกลับไปหน้า login', async ({ page }) => {
    // พยายามเข้าหน้า admin ตรงๆ โดยที่ยังไม่มีการล็อกอินใดๆ
    await page.goto('/admin');
    
    // 📌 ระบบ ProtectedRoute ควรจะเตะกลับไปที่หน้า /login
    await expect(page).toHaveURL(/\/login/); 
  });

  test('Admin เข้า /admin และโหลดข้อมูลสำเร็จ', async ({ page }) => {
    // 📌 1. Mock API สำหรับการ Login 
    await page.route('**/api/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-admin-token', user: { id: 1, name: 'Super Admin', role: 'admin' } }
      });
    });

    // 📌 2. จำลองการล็อกอินผ่าน UI เพื่อให้ Redux และ LocalStorage อัปเดตสถานะ (สำคัญมาก)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');

    // ตรวจสอบให้แน่ใจว่าล็อกอินสำเร็จและเด้งไปหน้าแรกแล้ว
    await expect(page).toHaveURL('http://localhost:3000/');

    // 📌 3. เมื่อมี State การล็อกอินแล้ว คราวนี้ให้ลองเข้าหน้า /admin
    await page.goto('/admin');
    
    // 📌 4. ตรวจสอบคำที่มีอยู่จริงใน AdminPage.jsx
    await expect(page.locator('text=จัดการระบบ (Admin Dashboard)')).toBeVisible();
    await expect(page.locator('text=ผู้ใช้งานทั้งหมด')).toBeVisible();
    await expect(page.locator('text=คอนเสิร์ตที่กำลังจะมาถึง')).toBeVisible();
  });
});