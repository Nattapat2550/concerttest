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
    
    // หน่วงเวลาจำลองความล่าช้าของ Network
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

// 🛠️ ตัวช่วยจำลองการคลิกที่นั่งใน SVG พร้อมส่งพิกัด X, Y ป้องกันบัค PointerEvent
async function simulateSeatClick(page, seatId) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX, clientY }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX, clientY }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
    }
  }, seatId);
}

test.describe('Concerts Booking & Queue Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 🌟 ดัก API Auth แบบครอบจักรวาล ป้องกันแอปเด้งกลับไปหน้า Login แบบไม่ตั้งใจ
    await mockApi(page, '**/api/auth/**', { authenticated: true, id: 1, role: 'user', user: { id: 1, role: 'user' } });
    await mockApi(page, '**/api/concerts/news/latest', []);

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

    await page.check('input[type="checkbox"]'); 
    await page.click('button:has-text("เข้าสู่เว็บไซต์")');

    await expect(popupTitle).not.toBeVisible();
    const latestSeenId = await page.evaluate(() => localStorage.getItem('latestSeenNewsId'));
    expect(latestSeenId).toBe('99');
  });

});