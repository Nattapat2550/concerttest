import { test, expect } from '@playwright/test';

test.describe('Concerts and News Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
    });
  });

  test('should display news popup on first load and close it', async ({ page }) => {
    // ✅ เพิ่ม ** นำหน้าเพื่อให้ดัก URL เต็มๆ ได้ถูกต้อง
    await page.route('**/api/concerts/news/latest', async route => {
      const json = [{ id: 99, title: 'ข่าวประกาศสำคัญ', content: 'เทสข่าว', image_url: '' }];
      await route.fulfill({ json });
    });

    await page.goto('/home');

    const popupTitle = page.locator('h2:has-text("ประกาศข่าวสาร")');
    await expect(popupTitle).toBeVisible();

    await expect(page.locator('h3:has-text("ข่าวประกาศสำคัญ")')).toBeVisible();

    await page.check('input[type="checkbox"]'); 
    await page.click('button:has-text("เข้าสู่เว็บไซต์")');

    await expect(popupTitle).not.toBeVisible();

    const latestSeenId = await page.evaluate(() => localStorage.getItem('latestSeenNewsId'));
    expect(latestSeenId).toBe('99');
  });

  test('should not show news popup if no new news', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('latestSeenNewsId', '99');
    });

    // ✅ เพิ่ม ** นำหน้า
    await page.route('**/api/concerts/news/latest', async route => {
      const json = [{ id: 99, title: 'ข่าวเก่า', content: 'เนื้อหา' }];
      await route.fulfill({ json });
    });

    await page.goto('/home');

    const popupTitle = page.locator('h2:has-text("ประกาศข่าวสาร")');
    await expect(popupTitle).not.toBeVisible();
  });
});