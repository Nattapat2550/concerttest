// seatMapUtils.ts

export const injectMapStyles = (svgEl: SVGElement, mode: string) => {
  const oldStyle = svgEl.querySelector('#seat-map-styles');
  if (oldStyle) oldStyle.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'seat-map-styles';
  styleEl.innerHTML = `
    .smart-seat { transform-box: fill-box; transform-origin: center; cursor: pointer; }
    .smart-seat { fill: var(--seat-color) !important; stroke: none !important; }
    .smart-seat:hover { filter: brightness(1.5) saturate(2); stroke: white !important; stroke-width: 2px !important; }
    .smart-seat.booked { fill: #475569 !important; opacity: 0.4 !important; pointer-events: none !important; cursor: not-allowed !important; }
    .smart-seat.unconfigured { display: ${mode === 'booking' ? 'none' : 'block'} !important; fill: #cbd5e1 !important; opacity: 0.5 !important; }
    
    .zone-overlay { transition: filter 0.2s ease; cursor: pointer; }
    .zone-sub-rect { pointer-events: auto; }
    .zone-overlay:hover .zone-sub-rect { filter: brightness(1.15); }
    
    .zone-blob-text {
      pointer-events: none; fill: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 32px; font-weight: 900; text-shadow: 0px 4px 6px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5);
    }
    
    /* CULLING */
    svg[data-zoom="low"] .smart-seat { display: none !important; pointer-events: none !important; }
    svg[data-zoom="low"] .zone-overlay { display: block !important; pointer-events: auto !important; }
    
    svg[data-zoom="high"] .smart-seat { display: block !important; pointer-events: auto !important; }
    svg[data-zoom="high"] .zone-overlay { display: none !important; pointer-events: none !important; }
  `;
  svgEl.appendChild(styleEl);
};

export const buildVectorZones = (
  svgEl: SVGElement, 
  seatElementsCache: Map<string, any>, 
  configuredMap: Map<string, any>, 
  bookedSet: Set<string>, 
  mode: string
) => {
  const zoneGroupsMap = new Map<string, any>();

  const oldOverlays = svgEl.querySelectorAll('.zone-overlay');
  oldOverlays.forEach(o => o.remove());

  seatElementsCache.forEach((seatData, seatId) => {
    const seatNode = seatData.node as SVGElement;
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
        zoneGroupsMap.get(parentG.id).seats.push({ box: seatData.box, color: seatColor });
      }
    } else {
      seatNode.classList.add('unconfigured');
    }
  });

  const PADDING = 10; 

  zoneGroupsMap.forEach((zoneData, zoneId) => {
    const overlayG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayG.setAttribute('class', 'zone-overlay');

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let zoneColor = '#3b82f6';

    // คำนวณขอบเขต (Bounding Box) ของทั้งโซน
    zoneData.seats.forEach((s: any) => {
      if (s.box.x < minX) minX = s.box.x;
      if (s.box.y < minY) minY = s.box.y;
      if (s.box.x + s.box.width > maxX) maxX = s.box.x + s.box.width;
      if (s.box.y + s.box.height > maxY) maxY = s.box.y + s.box.height;
      zoneColor = s.color;
    });

    if (minX !== Infinity) {
      // สร้างสี่เหลี่ยม 1 อันครอบทั้งโซน
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(minX - PADDING));
      rect.setAttribute('y', String(minY - PADDING));
      rect.setAttribute('width', String((maxX - minX) + PADDING * 2));
      rect.setAttribute('height', String((maxY - minY) + PADDING * 2));
      rect.setAttribute('rx', '8'); 
      rect.setAttribute('class', 'zone-sub-rect');
      
      rect.style.fill = zoneColor;
      rect.style.opacity = '0.8'; // ปรับให้โปร่งแสงเล็กน้อย
      rect.style.stroke = zoneColor;
      rect.style.strokeWidth = '1px';
      
      overlayG.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = zoneId.replace(/[_-]/g, ' ').toUpperCase();
      text.setAttribute('x', String(minX + (maxX - minX) / 2));
      text.setAttribute('y', String(minY + (maxY - minY) / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'zone-blob-text');
      overlayG.appendChild(text);
    }

    zoneData.groupNode.appendChild(overlayG);
  });
};