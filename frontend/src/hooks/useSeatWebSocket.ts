// frontend/src/hooks/useSeatWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface WsMessage {
  action: 'init' | 'locked' | 'unlocked';
  seat_code?: string;
  locked_seats?: string[];
}

export function useSeatWebSocket(concertId?: string) {
  const [lockedSeats, setLockedSeats] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!concertId) return;

    const wsUrl = `wss://gtyconcerttestbe.onrender.com/api/concerts/${concertId}/ws`;
    
    // 🌟 เพิ่มบรรทัดนี้เพื่อจับผิด React
    console.log("React กำลังพยายามต่อ WebSocket ไปที่:", wsUrl);
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data: WsMessage = JSON.parse(event.data);
          if (data.action === 'init' && data.locked_seats) {
            setLockedSeats(new Set(data.locked_seats));
          } else if (data.action === 'locked' && data.seat_code) {
            setLockedSeats((prev) => {
              const next = new Set(prev);
              next.add(data.seat_code!);
              return next;
            });
          } else if (data.action === 'unlocked' && data.seat_code) {
            setLockedSeats((prev) => {
              const next = new Set(prev);
              next.delete(data.seat_code!);
              return next;
            });
          }
        } catch (err) {
          console.error("WS Parse error", err);
        }
      };

      ws.onclose = () => {
        // Reconnect เบาๆ ถ้าเกิดหลุด
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; 
        wsRef.current.close();
      }
    };
  }, [concertId]);

  const lockSeat = useCallback((seatCode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'lock', seat_code: seatCode }));
    }
  }, []);

  return { lockedSeats: Array.from(lockedSeats), lockSeat };
}