import { useLayoutEffect, useRef } from 'react';

// FLIP (First-Last-Invert-Play): animeaza cardurile cand isi schimba pozitia
// in container. Cardurile trebuie sa aiba `data-flip-id="<id>"`.
// Apeleaza hook-ul cu un array de dependinte care se schimba la sort/filter.
export function useFlipAnimation(deps) {
  const containerRef = useRef(null);
  const positionsRef = useRef(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('[data-flip-id]');

    items.forEach(item => {
      const id = item.dataset.flipId;
      const newRect = item.getBoundingClientRect();
      const oldRect = positionsRef.current.get(id);

      if (oldRect && (oldRect.left !== newRect.left || oldRect.top !== newRect.top)) {
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;

        // Sari instant la pozitia veche (Invert)
        item.style.transform = `translate(${dx}px, ${dy}px)`;
        item.style.transition = 'none';

        // Force reflow apoi animeaza inapoi spre 0,0 (Play)
        requestAnimationFrame(() => {
          item.style.transform = '';
          item.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
        });
      }
    });

    // Salveaza pozitiile curente pentru urmatoarea schimbare
    const newPositions = new Map();
    items.forEach(item => {
      newPositions.set(item.dataset.flipId, item.getBoundingClientRect());
    });
    positionsRef.current = newPositions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
