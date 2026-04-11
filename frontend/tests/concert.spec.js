import { test, expect } from '@playwright/test';

// 🌟 ตัวช่วยจำลอง API พร้อมฟังก์ชัน Delay ป้องกัน Race Condition
async function mockApi(page, urlPattern, responseData, status = 200, delay = 0) {
  await page.route(urlPattern, async (route, request) => {
    const origin = request.headers()['origin'] || 'http://localhost:5173';
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    await route.fulfill({
      status,
      headers,
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });
}

test.describe('Concerts Display, Booking & Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 🌟 ดัก API Auth 
    await mockApi(page, '**/api/auth/status', { authenticated: true, id: 1, role: 'user', user: { id: 1, role: 'user' } });
    
    // Mock ข้อมูลคอนเสิร์ตจำลอง
    await mockApi(page, '**/api/concerts/list', [
      { id: 1, access_code: 'TEST2026', name: 'Premium Concert Test', show_date: '2026-12-31T20:00:00Z', venue: 'Impact Arena', is_active: true }
    ]);

    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
    });
  });

  test('should display news popup on first load and close it properly', async ({ page }) => {
    await mockApi(page, '**/api/concerts/news/latest', [
      { id: 99, title: 'ข่าวประกาศสำคัญ', content: 'เทสข่าว', image_url: '' }
    ]);

    await page.goto('/home');

    const popupTitle = page.getByText('ประกาศข่าวสาร', { exact: false });
    await expect(popupTitle).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('ข่าวประกาศสำคัญ')).toBeVisible();

    // กดปิดและไม่ต้องแสดงอีก
    await page.check('input[type="checkbox"]'); 
    await page.click('button:has-text("เข้าสู่เว็บไซต์")');

    await expect(popupTitle).not.toBeVisible();
    const latestSeenId = await page.evaluate(() => localStorage.getItem('latestSeenNewsId'));
    expect(latestSeenId).toBe('99');
  });

  test('should display concert list and navigate to details', async ({ page }) => {
    await mockApi(page, '**/api/concerts/news/latest', []); // ไม่มีข่าว
    
    // Mock Concert Details API
    await mockApi(page, '**/api/concerts/TEST2026', {
      concert: { id: 1, access_code: 'TEST2026', name: 'Premium Concert Test', description: '<p>Detail</p>', show_date: '2026-12-31T20:00:00Z', venue_name: 'Impact Arena', ticket_price: 2500, is_active: true }
    });

    await page.goto('/home');

    // ยืนยันว่าหน้า Home โหลดคอนเสิร์ตมาแสดง
    await expect(page.locator('h3', { hasText: 'Premium Concert Test' })).toBeVisible();

    // คลิกปุ่ม "ดูรายละเอียด & จองตั๋ว"
    await page.click('text=ดูรายละเอียด & จองตั๋ว');

    // ตรวจสอบว่าเปลี่ยนหน้ามาที่รายละเอียดแล้ว
    await expect(page).toHaveURL(/\/concerts\/TEST2026/);
    await expect(page.locator('h1:has-text("Premium Concert Test")')).toBeVisible();
    await expect(page.locator('text=จองที่นั่งทันที')).toBeVisible();
  });

});