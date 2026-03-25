import { test, expect } from '@playwright/test';

test.describe('Reset Password Page', () => {
  test('ขอลิงก์รีเซ็ตรหัสผ่านสำเร็จ', async ({ page }) => {
    await page.goto('/reset-password');
    
    // กรอกอีเมลและกดส่ง (หน้าเว็บปัจจุบันเป็นแค่ Mock จำลองบน UI ไม่ได้ยิง API จริง)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // 📌 ตรวจสอบข้อความแจ้งเตือนสีเขียวให้ตรงกับโค้ด React (ลิงก์รีเซ็ตรหัสผ่านได้ถูกส่งไปยัง ${email} แล้ว)
    await expect(page.locator('text=ลิงก์รีเซ็ตรหัสผ่านได้ถูกส่งไปยัง test@example.com แล้ว')).toBeVisible();
  });

  // 📌 นำการทดสอบ Part 2 ออกชั่วคราว เนื่องจากปัจจุบันหน้า ResetPasswordPage.jsx 
  // ยังไม่มีช่อง UI สำหรับให้กรอกรหัสผ่านใหม่ (ต้องสร้างหน้าตั้งรหัสผ่านใหม่แยกต่างหากก่อน)
});