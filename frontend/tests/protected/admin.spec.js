import { test, expect } from '@playwright/test';

test.describe('Admin Page Protection', () => {
  test('User ธรรมดาพยายามเข้า /admin จะโดนเตะกลับไปหน้าหลัก (/)', async ({ page }) => {
    // จำลองสถานะว่าล็อกอินแล้ว แต่มี Role เป็นแค่ 'user'
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: true, role: 'user' } });
    });

    await page.goto('/admin');
    
    // คาดหวังว่าจะโดน Redirect กลับมาหน้า Home (/) หรือหน้า Login ขึ้นอยู่กับ ProtectedRoute ของคุณ
    await expect(page).toHaveURL('http://localhost:3000/'); 
  });

  test('Admin เข้า /admin และโหลดข้อมูลสำเร็จ', async ({ page }) => {
    // จำลองสถานะว่าล็อกอินแล้ว และมี Role เป็น 'admin'
    await page.route('**/api/auth/status', route => {
      route.fulfill({ status: 200, json: { authenticated: true, role: 'admin' } });
    });
    
    // จำลองข้อมูล Users ที่จะถูกดึงมาแสดงในหน้า Admin
    await page.route('**/api/admin/users', route => {
      route.fulfill({ 
        status: 200, 
        json: [{ id: 1, email: 'admin@system.com', role: 'admin', username: 'SuperAdmin' }] 
      });
    });
    
    // จำลอง API Carousel (ถ้าในหน้า Admin ของ concerttest มีการเรียกใช้)
    await page.route('**/api/admin/carousel', route => route.fulfill({ status: 200, json: [] }));

    await page.goto('/admin');
    
    // ตรวจสอบว่าหน้า Admin โหลดขึ้นมาจริง (ปรับ Text ให้ตรงกับหน้า Admin ของ concerttest)
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // เช็คว่าตารางหรือฟอร์ม Users มีข้อมูลที่เรา Mock ไว้มาแสดง (ถ้ามี Input email)
    // await expect(page.locator('input[value="admin@system.com"]')).toBeVisible();
  });
});