import { useRef, useState, useEffect, RefObject } from 'react';

export function usePanZoom(
  containerRef: RefObject<HTMLDivElement | null>, 
  transformWrapperRef: RefObject<HTMLDivElement | null>, 
  ZOOM_THRESHOLD: number
) {
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const [showZoomHint, setShowZoomHint] = useState(false);
  const rafRef = useRef<number | null>(null);

  const applyTransform = (animate = false) => {
    const svgEl = transformWrapperRef.current?.querySelector('svg');
    if (!svgEl) return;
    
    if (animate) {
      svgEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => { if(svgEl) svgEl.style.transition = 'none'; }, 300);
    } else {
      svgEl.style.transition = 'none';
    }
    
    svgEl.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px) scale(${transform.current.scale})`;
    
    const currentZoom = transform.current.scale < ZOOM_THRESHOLD ? 'low' : 'high';
    if (svgEl.getAttribute('data-zoom') !== currentZoom) {
      svgEl.setAttribute('data-zoom', currentZoom);
    }
  };

  const handleZoom = (factor: number) => { 
    transform.current.scale = Math.max(0.5, Math.min(transform.current.scale + factor, 15)); 
    applyTransform(true); 
  };

  const handleReset = () => { 
    transform.current = { x: 0, y: 0, scale: 1 }; 
    applyTransform(true); 
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        let newScale = Math.max(0.5, Math.min(transform.current.scale + delta, 15));

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / transform.current.scale;
        transform.current.x = mouseX - (mouseX - transform.current.x) * scaleRatio;
        transform.current.y = mouseY - (mouseY - transform.current.y) * scaleRatio;
        transform.current.scale = newScale;
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyTransform());
        setShowZoomHint(false);
      } else {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 2500);
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return { transform, applyTransform, handleZoom, handleReset, showZoomHint, rafRef };
}