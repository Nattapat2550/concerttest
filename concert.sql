-- concert.sql

-- 1. ตารางข่าวสาร (News)
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางสถานที่ (Venues) เก็บไฟล์ SVG ไฟล์เดียวครอบคลุมทั้งฮอลล์
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    svg_content TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางคอนเสิร์ต (Concerts)
CREATE TABLE concerts (
    id SERIAL PRIMARY KEY,
    access_code VARCHAR(50) UNIQUE NOT NULL, -- เพิ่มคอลัมน์รหัสสุ่ม
    name VARCHAR(255) NOT NULL,
    description TEXT,
    show_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255), 
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL, 
    ticket_price DECIMAL(10, 2) DEFAULT 2500.00,
    layout_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    eticket_config TEXT DEFAULT '{}'
);

-- 4. ตารางกำหนดที่นั่งรายคอนเสิร์ต (Concert Seats)
CREATE TABLE concert_seats (
    id SERIAL PRIMARY KEY,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(50) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    color VARCHAR(20) DEFAULT '#cccccc',
    UNIQUE(concert_id, seat_code)
);

-- 5. ตารางที่นั่ง (Seats) [ระบบเก่า]
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    UNIQUE(concert_id, seat_code)
);

-- 6. ตารางการจองตั๋ว (Bookings)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_id INT REFERENCES seats(id) ON DELETE CASCADE,
    seat_code VARCHAR(50), 
    price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'confirmed', 
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. สร้างตารางกระเป๋าเงิน GTYCoin
CREATE TABLE user_wallets (
    user_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0.00
);

-- 8. สร้างตารางตรวจสอบ
CREATE TABLE user_appeals (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 9. ตาราง Carousel
CREATE TABLE carousels (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ตาราง Documents (ข้อมูลและแกลเลอรี)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    gallery_urls TEXT DEFAULT '[]', -- เก็บเป็น JSON Array ของ URL รูปภาพ ["url1", "url2"]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_unique_svg_booking ON bookings (concert_id, seat_code) 
WHERE status IN ('confirmed', 'used', 'wait') AND seat_code IS NOT NULL;

INSERT INTO news (title, content) VALUES ('ยินดีต้อนรับสู่ ConcertTick!', 'ระบบจองตั๋วคอนเสิร์ต Interactive Map เปิดให้บริการแล้ว');