// seatMapUtils.js

export const injectMapStyles = (svgEl, mode) => {
  const oldStyle = svgEl.querySelector('#seat-map-styles');
  if (oldStyle) oldStyle.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'seat-map-styles';
  styleEl.innerHTML = `
    .smart-seat { transition: opacity 0.2s ease, filter 0.1s ease; transform-box: fill-box; transform-origin: center; cursor: pointer; }
    .smart-seat { fill: var(--seat-color) !important; stroke: none !important; }
    .smart-seat:hover { filter: brightness(1.5) saturate(2); stroke: white !important; stroke-width: 2px !important; }
    .smart-seat.booked { fill: #475569 !important; opacity: 0.4 !important; pointer-events: none !important; cursor: not-allowed !important; }
    .smart-seat.unconfigured { display: ${mode === 'booking' ? 'none' : 'block'} !important; fill: #cbd5e1 !important; opacity: 0.5 !important; }
    
    .zone-overlay { transition: opacity 0.3s ease; cursor: pointer; }
    
    /* สไตล์ของกล่องย่อยที่รวมร่างกันเป็นโซน (ขอบตรง) */
    .zone-sub-rect {
      pointer-events: auto;
      transition: filter 0.2s ease;
    }
    
    /* โฮเวอร์แล้วสว่างขึ้นทั้งโซน */
    .zone-overlay:hover .zone-sub-rect {
      filter: brightness(1.15);
    }
    
    .zone-blob-text {
      pointer-events: none;
      fill: #ffffff;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 32px;
      font-weight: 900;
      text-shadow: 0px 4px 6px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5);
    }
    
    svg[data-zoom="low"] .smart-seat { opacity: 0 !important; pointer-events: none !important; }
    svg[data-zoom="low"] .zone-overlay { opacity: 1 !important; pointer-events: auto !important; }
    
    svg[data-zoom="high"] .smart-seat { opacity: 1 !important; pointer-events: auto !important; }
    svg[data-zoom="high"] .zone-overlay { opacity: 0 !important; pointer-events: none !important; }
  `;
  svgEl.appendChild(styleEl);
};

export const buildVectorZones = (svgEl, seatElementsCache, configuredMap, bookedSet, mode) => {
  const zoneGroupsMap = new Map();

  // ล้าง Overlay เก่าออก
  const oldOverlays = svgEl.querySelectorAll('.zone-overlay');
  oldOverlays.forEach(o => o.remove());

  // 1. ระบายสีเก้าอี้ และจัดกลุ่มเฉพาะที่นั่งที่เปิดขาย
  seatElementsCache.forEach((seatNode, seatId) => {
    seatNode.classList.remove('unconfigured', 'booked');
    
    if (configuredMap.has(seatId)) {
      const config = configuredMap.get(seatId);
      const seatColor = config.color || '#3b82f6';
      seatNode.style.setProperty('--seat-color', seatColor);
      
      if (mode === 'booking' && bookedSet.has(seatId)) {
        seatNode.classList.add('booked');
      }

      const parentG = seatNode.closest('g[id]');
      if (parentG && parentG.id !== 'layer1' && parentG.id !== 'svg-root') {
        if (!zoneGroupsMap.has(parentG.id)) {
          zoneGroupsMap.set(parentG.id, { groupNode: parentG, seats: [] });
        }
        zoneGroupsMap.get(parentG.id).seats.push({ node: seatNode, color: seatColor });
      }
    } else {
      seatNode.classList.add('unconfigured');
    }
  });

  // 2. สร้างกล่องเหลี่ยมรัดรูป (Overlapping Orthogonal Rects)
  const PADDING = 10; // ระยะเหลื่อมที่พอดีๆ (ถ้าเกินระยะนี้ โซนจะถูกตัดขาดจากกันอัตโนมัติ)

  zoneGroupsMap.forEach((zoneData, zoneId) => {
    const overlayG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayG.setAttribute('class', 'zone-overlay');

    let sumX = 0, sumY = 0, count = 0;

    // สร้างกล่องสี่เหลี่ยมคลุมที่นั่งทีละตัวให้มันทับกันจนเกิดเป็นรูปร่างโซน
    zoneData.seats.forEach(s => {
      const box = s.node.getBBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', box.x - PADDING);
      rect.setAttribute('y', box.y - PADDING);
      rect.setAttribute('width', box.width + PADDING * 2);
      rect.setAttribute('height', box.height + PADDING * 2);
      rect.setAttribute('rx', 4); // ทำมุมมนนิดเดียวให้ดูดี แต่ภาพรวมคือขอบตรง
      rect.setAttribute('class', 'zone-sub-rect');
      
      // ให้สีของกล่องเหมือนเก้าอี้เป๊ะๆ (ถ้ามีหลายสีก็จะแบ่งสีตามที่นั่งจริง)
      rect.style.fill = s.color;
      rect.style.stroke = s.color;
      rect.style.strokeWidth = '1px'; // ปิดรอยต่อระหว่างกล่องให้เนียน
      
      overlayG.appendChild(rect);

      sumX += cx;
      sumY += cy;
      count++;
    });

    // วางข้อความชื่อโซนไว้ที่จุดศูนย์กลางมวลรวม
    if (count > 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = zoneId.replace(/[_-]/g, ' ').toUpperCase();
      text.setAttribute('x', sumX / count);
      text.setAttribute('y', sumY / count);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'zone-blob-text');
      overlayG.appendChild(text);
    }

    zoneData.groupNode.appendChild(overlayG);
  });
};