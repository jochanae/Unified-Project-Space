import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

/**
 * Lightweight square-crop dialog. No extra deps — drag to pan, slider to zoom,
 * outputs a 512x512 JPEG File ready for upload.
 */
type Props = {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (cropped: File) => void | Promise<void>;
  busy?: boolean;
};

const BOX = 280; // viewport size in px

export function AvatarCropDialog({ file, open, onCancel, onConfirm, busy }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      setImg(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const image = new Image();
    image.onload = () => {
      // Cover the box at minimum zoom
      const baseScale = BOX / Math.min(image.width, image.height);
      setImg(image);
      setMinZoom(baseScale);
      setZoom(baseScale);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampOffset = (next: { x: number; y: number }, z: number) => {
    if (!img) return next;
    const w = img.width * z;
    const h = img.height * z;
    const maxX = Math.max(0, (w - BOX) / 2);
    const maxY = Math.max(0, (h - BOX) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, zoom));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleZoom = (val: number) => {
    setZoom(val);
    setOffset((o) => clampOffset(o, val));
  };

  const handleConfirm = async () => {
    if (!img) return;
    const out = 512;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, out, out);
    // Map current view (BOX-sized) -> output (out-sized)
    const scale = out / BOX;
    const w = img.width * zoom * scale;
    const h = img.height * zoom * scale;
    const cx = out / 2 + offset.x * scale;
    const cy = out / 2 + offset.y * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (!blob) return;
    const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    await onConfirm(cropped);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">Position your photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="relative overflow-hidden rounded-full border border-gold/30 bg-obsidian touch-none select-none"
            style={{ width: BOX, height: BOX }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img && imgUrl ? (
              <img
                src={imgUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: img.width * zoom,
                  height: img.height * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/60 text-xs">
                Loading…
              </div>
            )}
          </div>

          <div className="w-full px-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 text-center">
              Zoom
            </p>
            <Slider
              value={[zoom]}
              min={minZoom}
              max={minZoom * 4}
              step={0.01}
              onValueChange={(v) => handleZoom(v[0] ?? minZoom)}
              disabled={!img}
            />
          </div>
          <p className="text-xs text-muted-foreground/60 text-center">
            Drag the photo to reposition · pinch or use the slider to zoom
          </p>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-gold/25 px-4 py-2 text-sm text-foreground hover:bg-obsidian-elevated transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !img}
            className="rounded-md bg-gold/90 hover:bg-gold text-obsidian px-4 py-2 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save photo
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
