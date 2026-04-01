// seatMapUtils.js

// ฟังก์ชันสร้างสไตล์ CSS สำหรับแผนผัง
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
    
    /* สไตล์ของ Vector Blob ที่หุ้มที่นั่ง */
    .zone-blob-element {
      transition: filter 0.2s ease, stroke-width 0.2s ease;
      paint-order: stroke fill; /* ให้เส้นขยายออกด้านนอก */
      pointer-events: auto;
    }
    
    /* เวลาโฮเวอร์ ให้สว่างขึ้นและขยายขนาดขึ้นนิดหน่อย */
    .zone-overlay:hover .zone-blob-element {
      filter: brightness(1.15);
      stroke-width: 45px !important; 
    }
    
    .zone-blob-text {
      pointer-events: none;
      fill: #ffffff;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 32px;
      font-weight: 900;
      text-shadow: 0px 4px 6px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5);
    }
    
    /* ระบบสลับเลเยอร์ตอนซูม */
    svg[data-zoom="low"] .smart-seat { opacity: 0 !important; pointer-events: none !important; }
    svg[data-zoom="low"] .zone-overlay { opacity: 1 !important; pointer-events: auto !important; }
    
    svg[data-zoom="high"] .smart-seat { opacity: 1 !important; pointer-events: auto !important; }
    svg[data-zoom="high"] .zone-overlay { opacity: 0 !important; pointer-events: none !important; }
  `;
  svgEl.appendChild(styleEl);
};

// ฟังก์ชันสร้างรูปทรงโซนรัดรูป (Vector Blobs)
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

  // 2. สร้าง Vector Blob อิงตามรูปทรงและสีที่นั่งเป๊ะๆ
  zoneGroupsMap.forEach((zoneData, zoneId) => {
    const overlayG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayG.setAttribute('class', 'zone-overlay');

    let sumX = 0, sumY = 0, count = 0;

    // จำลอง (Clone) ที่นั่งทุกตัวในโซน แล้วขยายเส้นขอบให้เชื่อมติดกัน
    zoneData.seats.forEach(s => {
      const clone = s.node.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('class', 'zone-blob-element');
      
      // ดึงสีจากเก้าอี้ตัวนั้นๆ มาทาลงเวกเตอร์เลย
      clone.style.fill = s.color;
      clone.style.stroke = s.color;
      clone.style.strokeWidth = '35px'; // ระดับความหนาที่ทำให้จุดเก้าอี้หลอมรวมกัน
      clone.style.strokeLinejoin = 'round';
      clone.style.strokeLinecap = 'round';
      
      overlayG.appendChild(clone);

      const box = s.node.getBBox();
      sumX += box.x + box.width / 2;
      sumY += box.y + box.height / 2;
      count++;
    });

    // วางข้อความตรงจุดศูนย์กลางของมวลเก้าอี้
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = zoneId.replace(/[_-]/g, ' ').toUpperCase();
    text.setAttribute('x', sumX / count);
    text.setAttribute('y', sumY / count);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'zone-blob-text');

    overlayG.appendChild(text);
    zoneData.groupNode.appendChild(overlayG);
  });
};