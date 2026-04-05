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
	Name           string    `json:"name"`
	ShowDate       time.Time `json:"show_date"`
	Venue          string    `json:"venue"`
	VenueID        *int      `json:"venue_id"`
	VenueName      string    `json:"venue_name"`
	TicketPrice    float64   `json:"ticket_price"`
	LayoutImageURL string    `json:"layout_image_url"`
	IsActive       bool      `json:"is_active"`
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
	ID          int       `json:"id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Price       float64   `json:"price"`
	Status      string    `json:"status"`
}