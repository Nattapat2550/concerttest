import { test, expect } from '@playwright/test';

test.describe('Reset Password Page', () => {
  test('Part 1: ขอลิงก์รีเซ็ตรหัสผ่านสำเร็จ', async ({ page }) => {
    // จำลองว่า API ส่งลิงก์เข้าอีเมลสำเร็จ
    await page.route('**/api/auth/forgot-password', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    // 📌 เปลี่ยนจาก /reset เป็น /reset-password ให้ตรงกับ concerttest
    await page.goto('/reset-password');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // ตรวจสอบข้อความแจ้งเตือนเมื่อส่งอีเมลสำเร็จ (ปรับให้ตรงกับข้อความจริงบนหน้าเว็บ)
    // ตัวอย่างเช่น: 'ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่อีเมลแล้ว'
    await expect(page.locator('text=If that email exists, a reset link was sent.')).toBeVisible();
  });

  test('Part 2: เปลี่ยนรหัสผ่านใหม่เมื่อได้รับ Token จาก URL', async ({ page }) => {
    // จำลองว่า API เปลี่ยนรหัสผ่านให้สำเร็จ
    await page.route('**/api/auth/reset-password', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    // 📌 เข้า URL พร้อมแนบ Token
    await page.goto('/reset-password?token=valid-token-from-email');
    await page.fill('input[type="password"]', 'NewPass123!');
    await page.click('button[type="submit"]');

    // ตรวจสอบข้อความหลังเปลี่ยนรหัสเสร็จ
    await expect(page.locator('text=Password set. You can login now.')).toBeVisible();
  });
});