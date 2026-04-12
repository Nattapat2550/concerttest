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

    let sumX = 0, sumY = 0, count = 0;

    zoneData.seats.forEach((s: any) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(s.box.x - PADDING));
      rect.setAttribute('y', String(s.box.y - PADDING));
      rect.setAttribute('width', String(s.box.width + PADDING * 2));
      rect.setAttribute('height', String(s.box.height + PADDING * 2));
      rect.setAttribute('rx', '4'); 
      rect.setAttribute('class', 'zone-sub-rect');
      
      rect.style.fill = s.color;
      rect.style.stroke = s.color;
      rect.style.strokeWidth = '1px';
      
      overlayG.appendChild(rect);

      sumX += (s.box.x + s.box.width / 2);
      sumY += (s.box.y + s.box.height / 2);
      count++;
    });

    if (count > 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = zoneId.replace(/[_-]/g, ' ').toUpperCase();
      text.setAttribute('x', String(sumX / count));
      text.setAttribute('y', String(sumY / count));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'zone-blob-text');
      overlayG.appendChild(text);
    }

    zoneData.groupNode.appendChild(overlayG);
  });
};