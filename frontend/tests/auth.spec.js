import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  test('should login successfully with correct credentials', async ({ page }) => {
    // ✅ เพิ่ม Mock ให้ API ตอบกลับถูกต้องเพื่อความเสถียร
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        json: { token: 'fake-token', user: { id: 1, name: 'Test User' } }
      });
    });

    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.check('input#remember');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/home/);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // ✅ เพิ่ม Mock ข้อผิดพลาดให้ตรงกับที่ Backend ปล่อยออกมา
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        json: { error: 'Invalid credentials' }
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('.bg-red-100');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Invalid credentials'); // ✅ ตรวจจับคำว่า Invalid credentials แทน
  });

  test('should redirect to Google Auth on click', async ({ page }) => {
    await page.goto('/login');
    
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('accounts.google.com')),
      page.click('text=เข้าสู่ระบบด้วย Google')
    ]);

    expect(request.url()).toContain('accounts.google.com/o/oauth2/v2/auth');
  });

  test('should fill complete profile page', async ({ page }) => {
    await page.goto('/complete-profile?email=googleuser@gmail.com&name=John%20Doe&oauthId=12345');

    await expect(page.locator('input[type="email"]')).toHaveValue('googleuser@gmail.com');
    await expect(page.locator('input:has-text("ชื่อจริง") + input, input[value="John"]')).toBeVisible();
    
    await page.fill('input:below(:text("ชื่อผู้ใช้"))', 'johndoe99');
    await page.fill('input:below(:text("นามสกุล"))', 'Doe');
    await page.fill('input:below(:text("เบอร์โทรศัพท์"))', '0899999999');
    await page.fill('input:below(:text("รหัสผ่าน"))', 'securepassword');
  });
});