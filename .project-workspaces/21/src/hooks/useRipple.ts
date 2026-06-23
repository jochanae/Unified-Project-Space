import { useCallback, useRef } from 'react';

/**
 * Adds a Material-style ripple effect on press/click.
 * Usage:
 *   const { containerRef, onPointerDown } = useRipple();
 *   <button ref={containerRef} onPointerDown={onPointerDown} className="ripple-container" />
 */
export function useRipple<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    el.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove());
  }, []);

  return { containerRef, onPointerDown };
}
