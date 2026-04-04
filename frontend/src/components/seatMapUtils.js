// src/components/seatMapUtils.js

export const injectMapStyles = (svgEl, mode) => {
    const styleId = 'seat-map-dynamic-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .smart-seat { transition: fill 0.2s, stroke 0.2s; cursor: pointer; }
            .smart-seat:hover { filter: brightness(1.2); }
            .zone-overlay { fill: transparent; transition: fill 0.3s; cursor: pointer; pointer-events: all; }
            .zone-overlay:hover { fill: rgba(255,255,255,0.1); }
            [data-zoom="low"] .smart-seat { pointer-events: none; }
            [data-zoom="high"] .zone-overlay { pointer-events: none; display: none; }
        `;
        document.head.appendChild(style);
    }
};

export const buildVectorZones = (svgEl, seatElementsMap, configuredMap, bookedSet, mode) => {
    // 1. จัดการการแสดงผลที่นั่ง
    seatElementsMap.forEach((data, seatId) => {
        const el = data.node;
        const config = configuredMap.get(seatId);

        // --- สำหรับฝั่ง User: ถ้าไม่มี Config (Admin ไม่ได้จัด) ให้ซ่อนแบบเด็ดขาด ---
        if (!config && mode !== 'admin') {
            el.style.display = 'none';
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
            el.setAttribute('data-unconfigured', 'true');
            return;
        }

        // รีเซ็ตค่ากลับมา (กรณีแอดมินเพิ่งบันทึก หรือดึงข้อมูลใหม่)
        el.removeAttribute('data-unconfigured');
        el.style.display = '';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';

        // ตั้งค่าสีตามสถานะ
        if (bookedSet.has(seatId)) {
            el.style.fill = '#4b5563'; // สีเทาเข้ม (จองแล้ว)
            el.style.opacity = '0.4';
            el.style.cursor = 'not-allowed';
        } else if (!config && mode === 'admin') {
            // สำหรับฝั่ง Admin: ที่นั่งที่ยังไม่ได้จัดให้เป็นสีเทาอ่อน จะได้รู้ว่าคลุมได้
            el.style.fill = '#e5e7eb';
            el.style.stroke = '#d1d5db';
            el.style.opacity = '0.7';
        } else {
            el.style.fill = config?.color || '#3b82f6'; // สีตามโซน
            el.style.opacity = '1';
        }
    });

    // 2. สร้าง Zone Overlays สำหรับตอน Zoom Out
    const zones = new Map();
    configuredMap.forEach((conf) => {
        if (!zones.has(conf.zone_name)) zones.set(conf.zone_name, []);
        zones.get(conf.zone_name).push(conf.seat_code);
    });

    svgEl.querySelectorAll('.zone-group').forEach(g => g.remove());

    zones.forEach((seatIds, zoneName) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('class', 'zone-group');
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        seatIds.forEach(id => {
            const seatData = seatElementsMap.get(id);
            if (seatData) {
                const { x, y, width, height } = seatData.box;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            }
        });

        if (minX !== Infinity) {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute('x', minX - 10);
            rect.setAttribute('y', minY - 10);
            rect.setAttribute('width', (maxX - minX) + 20);
            rect.setAttribute('height', (maxY - minY) + 20);
            rect.setAttribute('class', 'zone-overlay');
            group.appendChild(rect);
            svgEl.appendChild(group);
        }
    });
};