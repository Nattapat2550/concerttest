import { test, expect } from '@playwright/test';

// 🌟 ตัวช่วยจำลอง API ระดับเทพ: จัดการ CORS และ OPTIONS อัตโนมัติให้ Axios รันผ่านฉลุย 100%
async function mockApi(page, urlPattern, responseData, status = 200) {
  await page.route(urlPattern, async (route, request) => {
    const origin = request.headers()['origin'] || 'http://localhost:5173';
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // จัดการ Preflight ขออนุญาตข้ามโดเมนของเบราว์เซอร์
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    
    await route.fulfill({
      status,
      headers,
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });
}

test.describe('Concerts Booking & Queue Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 🌟 ดัก API สำคัญทั้งหมดด้วย mockApi ป้องกันแอปเตะกลับไปหน้า Login
    await mockApi(page, '**/api/auth/status', { authenticated: true, id: 1, role: 'user' });
    await mockApi(page, '**/api/concerts/news/latest', []);

    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));
    });
  });

  test('should display news popup on first load and close it properly', async ({ page }) => {
    await mockApi(page, '**/api/concerts/news/latest', [
      { id: 99, title: 'ข่าวประกาศสำคัญ', content: 'เทสข่าว', image_url: '' }
    ]);

    await page.goto('/home');

    const popupTitle = page.locator('h2:has-text("ประกาศข่าวสาร")');
    await expect(popupTitle).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h3:has-text("ข่าวประกาศสำคัญ")')).toBeVisible();

    await page.check('input[type="checkbox"]'); 
    await page.click('button:has-text("เข้าสู่เว็บไซต์")');

    await expect(popupTitle).not.toBeVisible();
    const latestSeenId = await page.evaluate(() => localStorage.getItem('latestSeenNewsId'));
    expect(latestSeenId).toBe('99');
  });

  test('Waiting Room flow: should wait in queue then proceed to map', async ({ page }) => {
    await mockApi(page, '**/api/concerts/1', { 
      concert: { name: 'Super Concert 2026', venue: 'BKK Arena' },
      svg_content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle id="A1" class="smart-seat" cx="50" cy="50" r="10" /></svg>',
      configured_seats: [{ seat_code: 'A1', zone_name: 'VIP', price: 5000, color: 'gold' }],
      booked_seats: []
    });

    await mockApi(page, '**/api/concerts/queue/join*', { ticket: 105 });
    
    // 🌟 จำลองการเปลี่ยนสถานะจาก waiting -> ready
    let statusCheckCount = 0;
    await page.route('**/api/concerts/queue/status*', async (route, request) => {
      const origin = request.headers()['origin'] || 'http://localhost:5173';
      const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers });
        return;
      }
      
      statusCheckCount++;
      if (statusCheckCount === 1) {
        await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ status: 'waiting', my_ticket: 105, current_ticket: 100 }) });
      } else {
        await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ status: 'ready', my_ticket: 105, current_ticket: 105 }) });
      }
    });

    await page.goto('/concert/1');

    await expect(page.locator('h2:has-text("Waiting Room")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=105')).toBeVisible(); 
    await expect(page.locator('text=รออีก 5 คิว')).toBeVisible(); 

    // Polling รอบที่ 2 จะดึงข้อมูล Concert มาแสดง
    await expect(page.locator('h2:has-text("Super Concert 2026")')).toBeVisible({ timeout: 15000 });
  });

  test('Booking flow: should successfully book a seat', async ({ page }) => {
    await mockApi(page, '**/api/concerts/1', { 
      concert: { name: 'Live Event' },
      svg_content: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><circle id="A1" class="smart-seat" cx="250" cy="250" r="20" fill="gray" /></svg>',
      configured_seats: [{ seat_code: 'A1', zone_name: 'A', price: 2000 }],
      booked_seats: []
    });

    await mockApi(page, '**/api/concerts/queue/join*', { ticket: 1 });
    await mockApi(page, '**/api/concerts/queue/status*', { status: 'ready' });
    await mockApi(page, '**/api/concerts/book', { message: 'success' }, 201);

    await page.goto('/concert/1');
    
    const seat = page.locator('#A1');
    await expect(seat).toBeVisible({ timeout: 10000 });

    // 🌟 บังคับรัน Event ระดับ DOM เพื่อให้เข้ากันได้กับ React + SVG 100%
    await page.evaluate(() => {
      const el = document.getElementById('A1');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    
    await page.waitForTimeout(500); // รอจังหวะซูม
    
    await page.evaluate(() => {
      const el = document.getElementById('A1');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    const bookButton = page.locator('button', { hasText: 'ยืนยันการจอง' });
    await expect(bookButton).toBeEnabled({ timeout: 5000 });

    page.once('dialog', dialog => dialog.dismiss());
    await bookButton.click();
    await expect(page).toHaveURL(/.*my-bookings/); 
  });

  test('Race Condition: should show error if seat is taken (409 Conflict)', async ({ page }) => {
    await mockApi(page, '**/api/concerts/1', { 
      concert: { name: 'Live Event' },
      svg_content: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><circle id="A2" class="smart-seat" cx="250" cy="250" r="20" fill="gray" /></svg>',
      configured_seats: [{ seat_code: 'A2', zone_name: 'B', price: 1000 }],
      booked_seats: []
    });

    await mockApi(page, '**/api/concerts/queue/join*', { ticket: 1 });
    await mockApi(page, '**/api/concerts/queue/status*', { status: 'ready' });
    await mockApi(page, '**/api/concerts/book', { message: 'Seat already taken' }, 409);

    await page.goto('/concert/1');
    
    const seat = page.locator('#A2');
    await expect(seat).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      const el = document.getElementById('A2');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    
    await page.waitForTimeout(500); 

    await page.evaluate(() => {
      const el = document.getElementById('A2');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    const bookButton = page.locator('button', { hasText: 'ยืนยันการจอง' });
    await expect(bookButton).toBeEnabled({ timeout: 5000 });

    page.once('dialog', dialog => dialog.dismiss());
    await bookButton.click();
    
    // หลังเจอ Error ระบบต้องปลดล็อคให้ปุ่มพร้อมกดที่นั่งอื่นต่อได้
    await expect(bookButton).toBeEnabled({ timeout: 5000 });
  });
});