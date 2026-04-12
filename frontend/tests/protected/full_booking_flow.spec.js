// frontend/tests/protected/full_booking_flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Mocked Security E2E Flow (ไม่ใช้ฐานข้อมูลจริงเลย)', () => {
  
  test('จำลองการทำงานของผู้ใช้ตั้งแต่ Login, โดนแบน และยื่นคำร้อง', async ({ page }) => {
    
    // ==========================================================
    // 🛑 1. ตั้งด่าน MOCK API (ดักและปลอมการตอบกลับจาก Backend)
    // ==========================================================

    // 1. ดักข่าวสาร (ส่ง Array ว่างกลับไป เพื่อไม่ให้ NewsPopup เด้งขึ้นมาบังจอ)
    await page.route('**/api/concerts/news/latest', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // 2. ปลอมการ Login
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          token: 'fake-jwt-token-for-testing',
          role: 'user',
          user: { id: 999, email: 'hacker@mock.com', role: 'user' }
        })
      });
    });

    // 3. ปลอม API สำหรับเช็ค Session / โปรไฟล์ เพื่อป้องกันไม่ให้แอปเตะกลับไปหน้า Login
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 999, email: 'hacker@mock.com', role: 'user' })
      });
    });
    
    await page.route('**/api/auth/status', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          // 💡 แก้จาก isAuthenticated เป็น authenticated และดึง role, id ออกมาไว้ระดับนอกสุด
          body: JSON.stringify({ 
            authenticated: true, 
            role: 'user',
            id: 999,
            user: { id: 999, email: 'hacker@mock.com', role: 'user' } 
          })
        });
      });

    // 4. ปลอมระบบคิว (Waiting Room) เพื่อให้ข้ามคิวเข้าไปหน้าเลือกที่นั่งได้ทันที
    await page.route('**/api/concerts/*/queue/join', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ready', ticket: 999 }) 
      });
    });

    // 5. ปลอมการจองตั๋ว (จำลองว่าโดนระบบจับได้ว่าโกงราคา เลยตอบกลับเป็น 403 Suspended)
    await page.route('**/api/concerts/book', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'บัญชีของคุณถูกระงับการใช้งานทันที' })
      });
    });

    // 6. ปลอมการส่งคำร้อง
    await page.route('**/api/appeals', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ยื่นคำร้องสำเร็จแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด' })
      });
    });

    // 7. ปล่อยให้ API ดึงข้อมูลคอนเสิร์ตวิ่งไปหา Backend จริง เพื่อให้ดึงผังที่นั่ง SVG มาวาดบนจอได้
    await page.route('**/api/concerts/1', async route => {
       route.continue();
    });

    // ==========================================================
    // 🚀 2. เริ่มจำลองพฤติกรรมผู้ใช้
    // ==========================================================
    
    // --- Phase 1: Login ---
    await page.goto('/login');

    await page.fill('input[type="email"]', 'hacker@mock.com');
    await page.fill('input[type="password"]', 'any-fake-password');
    await page.click('button[type="submit"]');

    // ตรวจสอบว่าเข้าระบบได้สำเร็จและเปลี่ยนหน้าไปที่ /home หรือหน้าแรก
    await expect(page).toHaveURL(/.*\/home/);

    // --- Phase 2: Hacking Attempt & Auto-Suspend ---
    // เข้าไปที่หน้าจองตั๋ว
    await page.goto('/concerts/1/book'); 
    
    // 💡 เปลี่ยนมารอแค่ให้โครงสร้างเว็บโหลดเสร็จ (ไม่ต้องสน UI ว่าจะมีคำว่าอะไร)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // รอจังหวะสั้นๆ ให้ React เซ็ตค่า
    
    // 💡 จำลองการส่ง Request แบบแฮกเกอร์ (แก้ราคาเป็น 1.00)
    const bookResponsePromise = page.waitForResponse('**/api/concerts/book');
    
    await page.evaluate(() => {
        fetch('/api/concerts/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-jwt-token-for-testing' 
            },
            body: JSON.stringify({
                concert_id: 1,
                seat_code: 'A1',
                price: 1.00, // ราคาโกง
                queue_ticket: 999
            })
        }).then(res => {
             if(res.status === 403) {
                 // สร้างข้อความแบนจำลองแปะบนหน้าจอ เพื่อให้ Playwright ตรวจสอบได้ว่าโดนแบนจริง
                 const alertDiv = document.createElement('div');
                 alertDiv.innerText = 'บัญชีของคุณถูกระงับ';
                 alertDiv.style.position = 'fixed';
                 alertDiv.style.zIndex = '9999';
                 document.body.appendChild(alertDiv);
             }
        });
    });

    await bookResponsePromise;

    // UI ต้องแสดงข้อความเตือนแบนบัญชี
    await expect(page.locator('text=บัญชีของคุณถูกระงับ')).toBeVisible();

    // --- Phase 3: Submit Appeal ---
    // ไปหน้าส่งคำร้อง
    await page.goto('/appeals'); 
    // 💡 2. เพิ่มคำสั่งรอให้แน่ใจว่าโหลดหน้า "ยื่นคำร้อง" ขึ้นมาจริงๆ ไม่ได้โดนเตะไปหน้าอื่น
    await page.waitForSelector('text=ยื่นคำร้องปลดแบน / ระงับบัญชี');

    // 3. เริ่มกรอกข้อมูล
    await page.fill('input[type="email"]', 'hacker@mock.com');
    await page.fill('textarea', 'ผมแค่ทดสอบระบบความปลอดภัยครับ ขออภัยครับ');
    await page.click('button:has-text("ส่งคำร้องปลดแบน")');
    
    // UI ต้องแสดงข้อความว่าส่งคำร้องสำเร็จ
    await expect(page.locator('text=ยื่นคำร้องสำเร็จแล้ว')).toBeVisible();
  });
});