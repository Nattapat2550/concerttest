import { test, expect } from '@playwright/test';

test.describe('Concerts Booking & Queue Flow', () => {

  test.beforeEach(async ({ page }) => {
    // กำหนดสถานะการจำลองการล็อกอิน
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
    });
  });

  test('should display news popup on first load and close it properly', async ({ page }) => {
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

  test('Waiting Room flow: should wait in queue then proceed to map', async ({ page }) => {
    // 1. จำลองการแจกบัตรคิว
    await page.route('**/api/concerts/queue/join', async route => {
      await route.fulfill({ json: { ticket: 105 } });
    });

    // 2. จำลองสถานะคิว (ครั้งแรกจำลองว่าให้รอ)
    await page.route('**/api/concerts/queue/status?ticket=105', async route => {
      await route.fulfill({ json: { status: 'waiting', my_ticket: 105, current_ticket: 100 } });
    });

    await page.goto('/concert/1');

    // ตรวจสอบว่าหน้า Waiting Room ขึ้นมาบล็อกไว้
    await expect(page.locator('h2:has-text("Waiting Room")')).toBeVisible();
    await expect(page.locator('text=105')).toBeVisible(); // คิวของฉัน
    await expect(page.locator('text=รออีก 5 คิว')).toBeVisible(); // รออีก 5 คิว

    // 3. ปรับสถานะเป็น Ready ให้ผ่านเข้าไปหน้าจอง
    await page.route('**/api/concerts/queue/status?ticket=105', async route => {
      await route.fulfill({ json: { status: 'ready', my_ticket: 105, current_ticket: 105 } });
    });

    // จำลองข้อมูลคอนเสิร์ต
    await page.route('**/api/concerts/1', async route => {
      await route.fulfill({ 
        json: { 
          concert: { name: 'Super Concert 2026', venue: 'BKK Arena' },
          svg_content: '<svg><circle id="A1" class="smart-seat" cx="10" cy="10" r="5" /></svg>',
          configured_seats: [{ seat_code: 'A1', zone_name: 'VIP', price: 5000, color: 'gold' }],
          booked_seats: []
        } 
      });
    });

    // รอให้ Polling รอบถัดไปทำงานและพาเข้าหน้าจอง
    await page.waitForTimeout(3100); 
    await expect(page.locator('h2:has-text("Super Concert 2026")')).toBeVisible();
    await expect(page.locator('h2:has-text("Waiting Room")')).not.toBeVisible();
  });

  test('Booking flow: should successfully book a seat', async ({ page }) => {
    // ข้ามระบบคิวเพื่อให้เข้าถึงแผนผังทันที
    await page.route('**/api/concerts/queue/join', async route => route.fulfill({ json: { ticket: 1 } }));
    await page.route('**/api/concerts/queue/status?ticket=1', async route => route.fulfill({ json: { status: 'ready' } }));

    await page.route('**/api/concerts/1', async route => {
      await route.fulfill({ 
        json: { 
          concert: { name: 'Live Event' },
          svg_content: '<svg><circle id="A1" class="smart-seat" cx="10" cy="10" r="5" /></svg>',
          configured_seats: [{ seat_code: 'A1', zone_name: 'A', price: 2000 }],
          booked_seats: []
        } 
      });
    });

    await page.goto('/concert/1');
    
    // จำลอง API การกดจองสำเร็จ
    await page.route('**/api/concerts/book', async route => {
      await route.fulfill({ status: 201, json: { message: 'success' } });
    });

    // สมมติผู้ใช้มี Trigger Event เลือกที่นั่ง (เนื่องจาก InteractiveMap เป็น SVG, เราจึงบังคับ State)
    // จำลองคลิกเลือกที่นั่ง A1
    await page.evaluate(() => {
      const el = document.getElementById('A1');
      if (el) el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    });

    // กดยืนยันการจอง
    const bookButton = page.locator('button:has-text("ยืนยันการจอง 🎟️")');
    await expect(bookButton).toBeEnabled();

    // ดักจับ Alert แจ้งเตือนความสำเร็จ
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('จองที่นั่งสำเร็จ');
      dialog.dismiss();
    });

    await bookButton.click();
    await expect(page).toHaveURL(/.*my-bookings/); // นำทางไปหน้าตั๋วของฉัน
  });

  test('Race Condition: should show error if seat is taken (409 Conflict)', async ({ page }) => {
    await page.route('**/api/concerts/queue/join', async route => route.fulfill({ json: { ticket: 1 } }));
    await page.route('**/api/concerts/queue/status?ticket=1', async route => route.fulfill({ json: { status: 'ready' } }));

    await page.route('**/api/concerts/1', async route => {
      await route.fulfill({ 
        json: { 
          concert: { name: 'Live Event' },
          svg_content: '<svg><circle id="A2" class="smart-seat" cx="10" cy="10" r="5" /></svg>',
          configured_seats: [{ seat_code: 'A2', zone_name: 'B', price: 1000 }],
          booked_seats: []
        } 
      });
    });

    await page.goto('/concert/1');

    // จำลอง API การจองถูกแย่ง (409 Conflict)
    await page.route('**/api/concerts/book', async route => {
      await route.fulfill({ status: 409, json: { message: 'Seat already taken' } });
    });

    await page.evaluate(() => {
      const el = document.getElementById('A2');
      if (el) el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    });

    const bookButton = page.locator('button:has-text("ยืนยันการจอง 🎟️")');

    // ดักจับ Alert แจ้งเตือนข้อผิดพลาด
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('ที่นั่งนี้เพิ่งถูกจองตัดหน้าไป');
      dialog.dismiss();
    });

    await bookButton.click();
    
    // สถานะปุ่มต้องถูกปลดล็อคกลับมาหลังเจอ Error
    await expect(bookButton).toBeEnabled();
  });
});