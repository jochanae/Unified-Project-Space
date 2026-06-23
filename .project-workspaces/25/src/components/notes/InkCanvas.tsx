// Pressure-aware ink canvas using Pointer Events.
// - Real stylus (Apple Pencil, S-Pen, Wacom) reports variable `pressure` → variable stroke width.
// - Finger touch reports a constant 0.5 → uniform stroke (correct behavior).
// - Strokes are stored as compact JSON: { color, points: [{x, y, p}] }
//   ~10× smaller than a Base64 PNG and remains editable later.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export type InkPoint = { x: number; y: number; p: number };
export type InkStroke = { color: string; width: number; points: InkPoint[] };

export type InkCanvasHandle = {
  getStrokes: () => InkStroke[];
  setStrokes: (strokes: InkStroke[]) => void;
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
};

type Props = {
  className?: string;
  color?: string;
  baseWidth?: number;
  /** When true, pointer drags erase intersecting strokes instead of drawing. */
  eraseMode?: boolean;
  /** Erase hit radius in CSS pixels. */
  eraseRadius?: number;
  onChange?: (strokes: InkStroke[]) => void;
};

export const InkCanvas = forwardRef<InkCanvasHandle, Props>(function InkCanvas(
  { className, color = "#c9a84c", baseWidth = 2, eraseMode = false, eraseRadius = 14, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const dprRef = useRef(1);

  // Resize canvas to its container at correct DPR; redraw existing strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      redrawAll();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width / dprRef.current;
    const h = canvas.height / dprRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s);
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, s: InkStroke) => {
    if (s.points.length === 0) return;
    ctx.strokeStyle = s.color;
    if (s.points.length === 1) {
      const p = s.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, s.width * p.p) / 2, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      return;
    }
    // Variable-width stroke: draw segments with averaged pressure.
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1];
      const b = s.points[i];
      const avgP = (a.p + b.p) / 2;
      ctx.lineWidth = Math.max(0.5, s.width * avgP * 1.6);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };

  // Erase any stroke whose path passes within `eraseRadius` of (x, y).
  // Returns true if the stroke list changed.
  const eraseAt = (x: number, y: number): boolean => {
    const r = eraseRadius;
    const r2 = r * r;
    const before = strokesRef.current.length;
    strokesRef.current = strokesRef.current.filter((s) => !strokeHits(s, x, y, r2));
    return strokesRef.current.length !== before;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (eraseMode) {
      // Begin erasing — wipe any stroke under the initial point.
      activeStrokeRef.current = null;
      if (eraseAt(x, y)) {
        redrawAll();
        onChange?.(strokesRef.current);
      }
      return;
    }

    const p = pressureFor(e);
    activeStrokeRef.current = {
      color,
      width: baseWidth,
      points: [{ x, y, p }],
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Only act when a pointer button is pressed (drag, not hover).
    if (e.buttons === 0 && !canvas.hasPointerCapture(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();

    // Coalesced events for smoother input on devices that batch.
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents
      ? (e.nativeEvent as PointerEvent).getCoalescedEvents()
      : [e.nativeEvent as PointerEvent];

    if (eraseMode) {
      let changed = false;
      for (const ev of events) {
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        if (eraseAt(x, y)) changed = true;
      }
      if (changed) {
        redrawAll();
        onChange?.(strokesRef.current);
      }
      return;
    }

    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (const ev of events) {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const p = pressureFor(ev);
      const last = stroke.points[stroke.points.length - 1];
      // Draw incremental segment for instant feedback.
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(0.5, stroke.width * ((last.p + p) / 2) * 1.6);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      stroke.points.push({ x, y, p });
    }
  };

  const finishStroke = () => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    activeStrokeRef.current = null;
    if (stroke.points.length > 0) {
      strokesRef.current.push(stroke);
      onChange?.(strokesRef.current);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (eraseMode) return; // nothing to commit
    finishStroke();
  };

  useImperativeHandle(ref, () => ({
    getStrokes: () => strokesRef.current,
    setStrokes: (strokes) => {
      strokesRef.current = strokes ?? [];
      redrawAll();
    },
    clear: () => {
      strokesRef.current = [];
      redrawAll();
      onChange?.(strokesRef.current);
    },
    undo: () => {
      strokesRef.current.pop();
      redrawAll();
      onChange?.(strokesRef.current);
    },
    isEmpty: () => strokesRef.current.length === 0,
  }));

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={(e) => {
        if (activeStrokeRef.current) finishStroke();
        const canvas = canvasRef.current;
        if (canvas?.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      }}
      className={cn("touch-none block h-full w-full bg-transparent", className)}
      style={{ touchAction: "none" }}
    />
  );
});

function pressureFor(e: PointerEvent | React.PointerEvent<HTMLCanvasElement>): number {
  const native = "nativeEvent" in e ? (e.nativeEvent as PointerEvent) : e;
  // Pen with no pressure data sometimes reports 0 — clamp to a sensible default.
  if (native.pointerType === "pen") {
    return native.pressure > 0 ? native.pressure : 0.5;
  }
  // Touch / mouse: uniform stroke.
  return 0.5;
}

// True if any segment of `s` (or its single point) is within sqrt(r2) of (x, y).
// Uses point-to-segment distance squared so we never need a sqrt per check.
function strokeHits(s: InkStroke, x: number, y: number, r2: number): boolean {
  const pts = s.points;
  if (pts.length === 0) return false;
  if (pts.length === 1) {
    const dx = pts[0].x - x;
    const dy = pts[0].y - y;
    return dx * dx + dy * dy <= r2;
  }
  for (let i = 1; i < pts.length; i++) {
    if (segDist2(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, x, y) <= r2) return true;
  }
  return false;
}

function segDist2(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}
