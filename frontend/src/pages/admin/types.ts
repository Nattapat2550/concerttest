export interface User { id: number; email: string; role: string; status: string; }
export interface Booking { id: number; user_id: number; concert_name: string; seat_code: string; price: number; status: string; }
export interface Concert { 
  id: number; 
  access_code: string; 
  name: string; 
  venue?: string; 
  venue_name?: string; 
  venue_id?: number; 
  ticket_price: number; 
  show_date: string; 
  is_active: boolean; 
  description?: string; 
  eticket_config?: string;
}
export interface Venue { id: number; name: string; }
export interface News { id: number; title: string; content: string; is_active: boolean; created_at: string; image_url?: string; }
export interface SeatConfig { seat_code: string; zone_name: string; price: number; color: string; }
export interface Channel { id: number; name: string; price: number | string; color: string; }