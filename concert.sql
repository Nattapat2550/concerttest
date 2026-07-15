-- =======================================================
--  UUIDv7 Generator Function
-- =======================================================
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_unix_t bigint;
  v_rand_a bigint;
  v_rand_b bigint;
  v_rand_c bigint;
BEGIN
  v_unix_t := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_rand_a := (random() * 4095)::bigint;
  v_rand_b := (random() * 4095)::bigint;
  v_rand_c := (random() * 281474976710655)::bigint;
  
  RETURN (
    lpad(to_hex(v_unix_t), 12, '0') ||
    '7' || lpad(to_hex(v_rand_a), 3, '0') ||
    to_hex(8 + (random() * 3)::int) || lpad(to_hex(v_rand_b), 3, '0') ||
    lpad(to_hex(v_rand_c), 12, '0')
  )::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- concert.sql

-- 1. ตารางข่าวสาร (News)
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางสถานที่ (Venues) เก็บไฟล์ SVG ไฟล์เดียวครอบคลุมทั้งฮอลล์
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(255) NOT NULL,
    svg_content TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางคอนเสิร์ต (Concerts)
CREATE TABLE concerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    access_code VARCHAR(50) UNIQUE NOT NULL, -- เพิ่มคอลัมน์รหัสสุ่ม
    name VARCHAR(255) NOT NULL,
    description TEXT,
    show_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255), 
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL, 
    ticket_price DECIMAL(10, 2) DEFAULT 2500.00,
    layout_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    eticket_config TEXT DEFAULT '{}'
);

-- 4. ตารางกำหนดที่นั่งรายคอนเสิร์ต (Concert Seats)
CREATE TABLE concert_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    concert_id UUID REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(50) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    color VARCHAR(20) DEFAULT '#cccccc',
    UNIQUE(concert_id, seat_code)
);

-- 5. ตารางที่นั่ง (Seats) [ระบบเก่า]
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    concert_id UUID REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    UNIQUE(concert_id, seat_code)
);

-- 6. ตารางการจองตั๋ว (Bookings)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL,
    concert_id UUID REFERENCES concerts(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
    seat_code VARCHAR(50), 
    price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'confirmed', 
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. สร้างตารางกระเป๋าเงิน GTYCoin
CREATE TABLE user_wallets (
    user_id UUID PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0.00
);

-- 8. สร้างตารางตรวจสอบ
CREATE TABLE user_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 9. ตาราง Carousel
CREATE TABLE carousels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ตาราง Documents (ข้อมูลและแกลเลอรี)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
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