export interface User { id: string; email: string; role: string; status: string; }
export interface Booking { id: string; user_id: string; concert_name: string; seat_code: string; price: number; status: string; }
export interface Concert { 
  id: string; 
  access_code: string; 
  name: string; 
  description: string; 
  show_date: string; 
  venue_id?: string; 
  ticket_price: number; 
  layout_image_url?: string; 
  is_active: boolean; 
  venue_name?: string; 
  eticket_config?: string; 
}
export interface Venue { id: string; name: string; }
export interface News { id: string; title: string; content: string; is_active: boolean; created_at: string; image_url?: string; }
export interface SeatConfig { seat_code: string; zone_name: string; price: number; color: string; }
export interface Channel { id: string; name: string; price: number | string; color: string; }