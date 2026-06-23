import { useEffect } from "react";
import { X } from "lucide-react";
import type { VideoProvider } from "@/lib/boards";

interface Props {
  provider: VideoProvider;
  videoId: string;
  title?: string | null;
  accent: string;
  onClose: () => void;
}

/** Cinematic lightbox — dim backdrop, gold hairline, escape-to-close. */
export function VideoLightbox({ provider, videoId, title, accent, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const src =
    provider === "youtube"
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 backdrop-blur-md"
      style={{ background: "rgba(3, 5, 4, 0.86)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Video"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 rounded-full p-2 transition-opacity hover:opacity-80"
        style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${accent}55`, color: accent }}
      >
        <X className="h-4 w-4" />
      </button>
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-xl"
        style={{ border: `1px solid ${accent}33`, boxShadow: `0 0 60px ${accent}22` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aspect-video w-full bg-black">
          <iframe
            src={src}
            title={title ?? "Video"}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
