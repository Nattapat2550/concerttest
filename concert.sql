-- concert.sql

-- 1. ตารางข่าวสาร (News) [โครงสร้างเดิม]
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางสถานที่ (Venues) สำหรับเก็บ Master SVG Map
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    master_svg TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางโซนย่อย (Venue Zones) สำหรับเก็บ Sub SVG Map ของแต่ละโซน
CREATE TABLE venue_zones (
    id SERIAL PRIMARY KEY,
    venue_id INT REFERENCES venues(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL, 
    sub_svg TEXT NOT NULL,           
    UNIQUE(venue_id, zone_name)
);

-- 4. ตารางคอนเสิร์ต (Concerts) [โครงสร้างเดิม + ผูก Venue]
CREATE TABLE concerts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    show_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255), -- เก็บไว้เผื่อ Backward Compatibility
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL, -- ใช้สำหรับระบบ SVG
    ticket_price DECIMAL(10, 2) DEFAULT 2500.00,
    layout_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางที่นั่ง (Seats) [โครงสร้างเดิม เผื่อระบบเก่าเรียกใช้]
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    UNIQUE(concert_id, seat_code)
);

-- 6. ตารางการจอง (Bookings) [โครงสร้างเดิม + รองรับการเก็บรหัสจาก SVG]
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID VARCHAR(255) NOT NULL,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_id INT REFERENCES seats(id) ON DELETE CASCADE, -- ระบบเก่า
    seat_code VARCHAR(50), -- ระบบใหม่ (SVG) เก็บเป็น A1-AA-01
    price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'confirmed', 
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ป้องกันจองที่นั่งรหัสเดียวกันซ้ำในคอนเสิร์ตเดียวกัน (เฉพาะระบบใหม่ที่ status confirmed)
CREATE UNIQUE INDEX idx_unique_svg_booking ON bookings (concert_id, seat_code) WHERE status = 'confirmed' AND seat_code IS NOT NULL;

-- ข้อมูลจำลอง
INSERT INTO news (title, content) VALUES ('ยินดีต้อนรับสู่ ConcertTick!', 'ระบบจองตั๋วคอนเสิร์ต Interactive Map เปิดให้บริการแล้ว');