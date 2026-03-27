-- concert.sql

-- 1. ตารางข่าวสาร (News) สำหรับแสดง Popup หน้าแรก
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางคอนเสิร์ต
CREATE TABLE concerts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    show_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    layout_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางที่นั่ง (ผูกกับคอนเสิร์ต)
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_code VARCHAR(10) NOT NULL, -- เช่น A1, A2, B1
    price DECIMAL(10, 2) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    UNIQUE(concert_id, seat_code)
);

-- 4. ตารางการจอง (ผูกกับ user_id จากระบบ Auth)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- อ้างอิง UUID จากระบบ Backend Rust
    concert_id INT REFERENCES concerts(id) ON DELETE CASCADE,
    seat_id INT REFERENCES seats(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(concert_id, seat_id) -- 1 ที่นั่งจองได้แค่ 1 ครั้งต่อคอนเสิร์ต
);

-- ข้อมูลจำลอง (Mock Data)
INSERT INTO news (title, content) VALUES ('ยินดีต้อนรับสู่ ConcertTick!', 'เปิดระบบจองตั๋วคอนเสิร์ตออนไลน์รูปแบบใหม่ พร้อมโปรโมชั่นพิเศษมากมาย');
INSERT INTO concerts (name, description, show_date, venue) VALUES ('Rock The Night 2026', 'คอนเสิร์ตร็อคสุดมันส์แห่งปี', '2026-12-01 19:00:00', 'Impact Arena');
-- จำลองที่นั่ง
INSERT INTO seats (concert_id, seat_code, price) VALUES (1, 'A1', 2500.00), (1, 'A2', 2500.00), (1, 'B1', 1500.00), (1, 'B2', 1500.00);