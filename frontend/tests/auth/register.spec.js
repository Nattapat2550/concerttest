import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test('สมัครสำเร็จพาไปหน้าเข้าสู่ระบบ', async ({ page }) => {
    // 📌 จำลอง API ให้ตรงกับที่ RegisterPage.jsx เรียกใช้งาน
    await page.route('**/api/register', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    // 📌 ดักจับและกดตกลงหน้าต่าง alert('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ')
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/register');
    
    // 📌 กรอกข้อมูลให้ครบทั้ง 4 ช่อง (ไม่งั้นจะกด submit ไม่ผ่าน)
    await page.fill('input[name="name"]', 'ทดสอบ นามสกุล');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    await page.click('button[type="submit"]');

    // สมัครเสร็จแล้วจะเด้งไปหน้า login
    await expect(page).toHaveURL(/\/login/);
  });
});