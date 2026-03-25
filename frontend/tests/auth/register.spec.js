import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test('สมัครสำเร็จพาไปหน้าเข้าสู่ระบบ', async ({ page }) => {
    await page.route('**/api/auth/register', route => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    await page.goto('/register');
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.click('button[type="submit"]');

    // สันนิษฐานว่าสมัครเสร็จจะกลับไปหน้า login ของ concerttest
    await expect(page).toHaveURL(/\/login/);
  });
});