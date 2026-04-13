package handlers

import "time"

// ===== Models (แชร์กันใช้ใน Package handlers) =====
type News struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Venue struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	SVGContent string `json:"svg_content"`
}

type Concert struct {
	ID             int       `json:"id"`
	AccessCode     string    `json:"access_code"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	ShowDate       time.Time `json:"show_date"`
	Venue          string    `json:"venue"`
	VenueID        *int      `json:"venue_id"`
	VenueName      string    `json:"venue_name"`
	TicketPrice    float64   `json:"ticket_price"`
	LayoutImageURL string    `json:"layout_image_url"`
	IsActive       bool      `json:"is_active"`
	EticketConfig  string    `json:"eticket_config"` // แก้ไขบัค Admin โหลดข้อมูลเก่า
}

type ConcertSeatConfig struct {
	SeatCode string  `json:"seat_code"`
	ZoneName string  `json:"zone_name"`
	Price    float64 `json:"price"`
	Color    string  `json:"color"`
}

type ConcertDetailsResponse struct {
	Concert         Concert             `json:"concert"`
	SVGContent      string              `json:"svg_content"`
	ConfiguredSeats []ConcertSeatConfig `json:"configured_seats"`
	BookedSeats     []string            `json:"booked_seats"`
	WaitSeats       []string            `json:"wait_seats"` // ส่งที่นั่งที่กำลังรอจ่ายเงินไปให้ Frontend
}

type Seat struct {
	ID        int     `json:"id"`
	ConcertID int     `json:"concert_id"`
	SeatCode  string  `json:"seat_code"`
	Price     float64 `json:"price"`
	IsBooked  bool    `json:"is_booked"`
}

type BookSeatRequest struct {
	ConcertID   int     `json:"concert_id"`
	SeatID      int     `json:"seat_id"`   
	SeatCode    string  `json:"seat_code"` 
	Price       float64 `json:"price"`
	QueueTicket int64   `json:"queue_ticket"`
}

type MyBooking struct {
	ID            int       `json:"id"`
	ConcertName   string    `json:"concert_name"`
	SeatCode      string    `json:"seat_code"`
	Price         float64   `json:"price"`
	Status        string    `json:"status"`
	QRToken       string    `json:"qr_token"`
	EticketConfig string    `json:"eticket_config"`
}

// ===== Models สำหรับ GTYCoin =====
type UserWallet struct {
	UserID  string  `json:"user_id"`
	Balance float64 `json:"balance"`
}

type TopupWalletRequest struct {
	Amount float64 `json:"amount"`
}

type Carousel struct {
	ID        int       `json:"id"`
	ImageURL  string    `json:"image_url"`
	LinkURL   string    `json:"link_url"`
	IsActive  bool      `json:"is_active"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type Document struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CoverImage  string    `json:"cover_image"`
	GalleryURLs string    `json:"gallery_urls"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}