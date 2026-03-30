import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  test('should login successfully with correct credentials', async ({ page }) => {
    await page.goto('/login');
    
    // กรอกข้อมูล
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.check('input#remember');
    
    // กดปุ่มเข้าสู่ระบบ
    await page.click('button[type="submit"]');

    // ตรวจสอบว่าถูกพากลับไปหน้า Home
    await expect(page).toHaveURL(/\/home/);
    
    // ตรวจสอบว่ามี Token ใน LocalStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // ตรวจสอบว่ามีข้อความ Error โผล่ขึ้นมา (สมมติว่าเป็นสีแดง .bg-red-100)
    const errorMsg = page.locator('.bg-red-100');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('เข้าสู่ระบบล้มเหลว'); // หรือข้อความจาก API
  });

  test('should redirect to Google Auth on click', async ({ page }) => {
    await page.goto('/login');
    
    // ดักจับการเปลี่ยนหน้า
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('accounts.google.com')),
      page.click('text=เข้าสู่ระบบด้วย Google')
    ]);

    expect(request.url()).toContain('accounts.google.com/o/oauth2/v2/auth');
  });

  test('should fill complete profile page', async ({ page }) => {
    // จำลองการถูก Redirect กลับมาจาก Google Callback
    await page.goto('/complete-profile?email=googleuser@gmail.com&name=John%20Doe&oauthId=12345');

    // ตรวจสอบว่าช่องอีเมลถูกเติมอัตโนมัติและแก้ไขไม่ได้
    await expect(page.locator('input[type="email"]')).toHaveValue('googleuser@gmail.com');
    await expect(page.locator('input[type="email"]')).toHaveAttribute('readonly', '');

    // ชื่อกับนามสกุลต้องถูกแยกให้
    await expect(page.locator('input:has-text("ชื่อจริง") + input, input[value="John"]')).toBeVisible();
    
    // กรอกข้อมูลที่เหลือ
    await page.fill('input:below(:text("ชื่อผู้ใช้"))', 'johndoe99');
    await page.fill('input:below(:text("นามสกุล"))', 'Doe');
    await page.fill('input:below(:text("เบอร์โทรศัพท์"))', '0899999999');
    await page.fill('input:below(:text("รหัสผ่าน"))', 'securepassword');

    // กดบันทึก (ระวัง! ในเทสจริงควรดัก API ไม่ให้ยิงเข้า DB จริงๆ หรือใช้ Test DB)
    // await page.click('button[type="submit"]');
  });
});