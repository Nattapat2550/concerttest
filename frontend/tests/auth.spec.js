import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 🌟 ใช้การ Mock แบบ json: {} เสมอ
    await page.route('**/api/auth/status', route => route.fulfill({ json: { authenticated: false } }));
    await page.route('**/api/concerts/news/latest', route => route.fulfill({ json: [] }));
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.route('**/api/auth/login', route => route.fulfill({
      json: { token: 'fake-token', user: { id: 1, name: 'Test User', role: 'user' } }
    }));

    await page.route('**/api/auth/status', route => route.fulfill({ 
      json: { authenticated: true, id: 1, role: 'user' } 
    }));

    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.check('input#remember');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/home/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', route => {
      route.fulfill({ status: 401, json: { error: 'Invalid credentials' } });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('.bg-red-100');
    await expect(errorMsg).toBeVisible();
  });

  test('should display Google Auth button', async ({ page }) => {
    await page.goto('/login');
    
    // 🌟 สำหรับ Google Oauth การเช็คว่ามีปุ่มปรากฏอยู่ ก็ถือว่า UI ผ่านแล้วครับ ลดปัญหาการ Time out ข้ามโดเมน
    const googleBtn = page.locator('button', { hasText: /Google/i }).first();
    await expect(googleBtn).toBeVisible();
  });

  test('should fill complete profile page', async ({ page }) => {
    await page.goto('/complete-profile?email=googleuser@gmail.com&name=John%20Doe&oauthId=12345');

    await expect(page.locator('input[type="email"]')).toHaveValue('googleuser@gmail.com');
    await expect(page.locator('input:has-text("ชื่อจริง") + input, input[value="John"]')).toBeVisible();
    
    await page.fill('input:below(:text("ชื่อผู้ใช้"))', 'johndoe99');
    await page.fill('input:below(:text("รหัสผ่าน"))', 'securepassword');
  });
});