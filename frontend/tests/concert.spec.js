import { test, expect } from '@playwright/test';

test.describe('Concerts and News Flow', () => {

  test.beforeEach(async ({ page }) => {
    // จำลองการ Login (เซ็ต Token)
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
    });
  });

  test('should display news popup on first load and close it', async ({ page }) => {
    // Mock API ข่าวให้คืนค่าข่าวสมมติ
    await page.route('/api/concerts/news/latest', async route => {
      const json = [{ id: 99, title: 'ข่าวประกาศสำคัญ', content: 'เทสข่าว', image_url: '' }];
      await route.fulfill({ json });
    });

    await page.goto('/home');

    // รอให้ Popup ขึ้นมา
    const popupTitle = page.locator('h2:has-text("ประกาศข่าวสาร")');
    await expect(popupTitle).toBeVisible();

    // เช็คหัวข้อข่าว
    await expect(page.locator('h3:has-text("ข่าวประกาศสำคัญ")')).toBeVisible();

    // กดยอมรับและปิด
    await page.check('input[type="checkbox"]'); // รับทราบและไม่แสดงอีก
    await page.click('button:has-text("เข้าสู่เว็บไซต์")');

    // ตรวจสอบว่า Popup หายไป
    await expect(popupTitle).not.toBeVisible();

    // ตรวจสอบ Storage ว่าจำรหัสข่าวล่าสุดหรือยัง
    const latestSeenId = await page.evaluate(() => localStorage.getItem('latestSeenNewsId'));
    expect(latestSeenId).toBe('99');
  });

  test('should not show news popup if no new news', async ({ page }) => {
    // เซ็ตว่าเคยดูข่าว ID 99 ไปแล้ว
    await page.addInitScript(() => {
      localStorage.setItem('latestSeenNewsId', '99');
    });

    await page.route('/api/concerts/news/latest', async route => {
      // API ส่งข่าวเก่า (ID 99) กลับมา
      const json = [{ id: 99, title: 'ข่าวเก่า', content: 'เนื้อหา' }];
      await route.fulfill({ json });
    });

    await page.goto('/home');

    // Popup ต้องไม่แสดง
    const popupTitle = page.locator('h2:has-text("ประกาศข่าวสาร")');
    await expect(popupTitle).not.toBeVisible();
  });
});