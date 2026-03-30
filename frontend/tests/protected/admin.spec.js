import { test, expect } from '@playwright/test';

test.describe('Admin Page Protection', () => {
  test('ไม่ได้ล็อกอินพยายามเข้า /admin จะโดนเตะกลับไปหน้า login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/); 
  });

  test('Admin เข้า /admin และโหลดข้อมูลสำเร็จ', async ({ page }) => {
    // ✅ เปลี่ยนจาก **/api/login เป็น **/api/auth/login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-admin-token', user: { id: 1, name: 'Super Admin', role: 'admin' } }
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3000/');

    await page.goto('/admin');
    
    await expect(page.locator('text=จัดการระบบ (Admin Dashboard)')).toBeVisible();
    await expect(page.locator('text=ผู้ใช้งานทั้งหมด')).toBeVisible();
    await expect(page.locator('text=คอนเสิร์ตที่กำลังจะมาถึง')).toBeVisible();
  });
});