import { test, expect } from '@playwright/test';

// 🌟 ตัวช่วยจำลอง API พร้อม Headers จัดการ CORS
async function mockApi(page, urlPattern, responseData, status = 200) {
  await page.route(urlPattern, async (route, request) => {
    const origin = request.headers()['origin'] || 'http://localhost:5173';
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      status,
      headers,
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });
}

test.describe('Admin Page Protection & Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // ปิด News Popup ป้องกันการมาบดบัง UI ระหว่างการเทสต์
    await mockApi(page, '**/api/concerts/news/latest', []);
  });

  test('ไม่ได้ล็อกอินพยายามเข้า /admin จะโดนเตะกลับไปหน้า login', async ({ page }) => {
    await mockApi(page, '**/api/auth/status', { authenticated: false }, 401);
    await mockApi(page, '**/api/users/me', { message: "Unauthorized" }, 401);

    await page.goto('/admin');
    
    await expect(page).toHaveURL(/.*\/login/); 
  });

  test('Admin เข้า /admin และโหลดข้อมูล UI ใหม่ (Premium) สำเร็จ', async ({ page }) => {
    // 📌 1. Mock API ข้อมูลต่างๆ
    await mockApi(page, '**/api/auth/login', {
      token: 'fake-admin-token', 
      user: { id: 1, name: 'Super Admin', role: 'admin', email: 'admin@example.com' }
    });

    await mockApi(page, '**/api/auth/status', { authenticated: true, id: 1, role: 'admin' });
    await mockApi(page, '**/api/users/me', { id: 1, role: 'admin', email: 'admin@example.com' });

    await mockApi(page, '**/api/admin/bookings', []);
    await mockApi(page, '**/api/admin/users', []);
    await mockApi(page, '**/api/admin/venues', []);
    await mockApi(page, '**/api/admin/concerts', []);
    await mockApi(page, '**/api/admin/news', []);

    // 📌 2. ล็อกอินผ่าน UI
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/home/);

    // 📌 3. คลิกปุ่มเข้า Admin Workspace ผ่าน Navbar (ใช้ Regex รองรับทั้งคำว่า Workspace และ Panel เก่า)
    await page.locator('a', { hasText: /(Admin Workspace|Admin Panel)/i }).first().click();
    
    await expect(page).toHaveURL(/.*\/admin/);
    
    // 📌 4. ตรวจสอบ UI ด้วย Locator ที่ยืดหยุ่นที่สุด
    // ใช้ hasText รองรับทั้งข้อความใหม่และเก่า ป้องกันปัญหา Cache หรือหา Element ไม่เจอ
    await expect(page.locator('h2', { hasText: /(Administrator Workspace|Admin Dashboard)/i }).first()).toBeVisible({ timeout: 10000 });
    
    // ตรวจสอบ Tab เมนูต่างๆ (Regex จะไม่สนว่ามีไอคอนแทรกอยู่หรือไม่)
    await expect(page.locator('button', { hasText: /จัดการผู้ใช้/i }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: /จัดการคอนเสิร์ต/i }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: /จัดการสถานที่/i }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: /ดูการจองตั๋ว/i }).first()).toBeVisible();
  });
});