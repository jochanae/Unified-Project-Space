import { useEffect, useRef } from 'react';
import type { CollabPeer } from '../hooks/use-collab-presence';

interface Props {
  peers: CollabPeer[];
  onMove: (x: number, y: number) => void;
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Renders live remote cursors inside a relative-positioned container.
 * Coordinates are 0-1 normalized so they survive viewport differences.
 */
export function CursorOverlay({ peers, onMove, containerRef }: Props) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => onMove(x, y));
    };

    el.addEventListener('mousemove', handler);
    return () => {
      el.removeEventListener('mousemove', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onMove, containerRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {peers.map(peer => {
        if (!peer.cursor) return null;
        const left = `${(peer.cursor.x * 100).toFixed(2)}%`;
        const top = `${(peer.cursor.y * 100).toFixed(2)}%`;
        return (
          <div
            key={peer.userId}
            className="absolute transition-transform duration-75 ease-out"
            style={{ left, top, transform: 'translate(-2px, -2px)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ filter: `drop-shadow(0 0 4px ${peer.color})` }}>
              <path d="M3 2L17 9L10 11L7 17L3 2Z" fill={peer.color} stroke="hsl(var(--background))" strokeWidth="1" />
            </svg>
            <div
              className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
              style={{ background: peer.color, color: 'hsl(var(--background))' }}
            >
              {peer.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
