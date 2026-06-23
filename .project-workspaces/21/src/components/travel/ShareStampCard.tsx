/**
 * ShareStampCard — Premium vertical 9:16 "Digital Stamp" card.
 * Hero photo background, scaled-up gold stamp centerpiece,
 * stats row, and Compani branding. Supports Web Share API + PNG export.
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, X, MapPin, Camera, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ShareStampCardProps {
  cityName: string;
  date: string;
  companionName?: string;
  heroPhotoUrl?: string;
  airportCode?: string;
  entriesCount?: number;
  citiesCount?: number;
  photosCount?: number;
  onClose: () => void;
}

export default function ShareStampCard({
  cityName,
  date,
  companionName,
  heroPhotoUrl,
  airportCode,
  entriesCount = 1,
  citiesCount = 1,
  photosCount = 0,
  onClose,
}: ShareStampCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const generateCanvas = async () => {
    if (!cardRef.current) return null;
    return html2canvas(cardRef.current, {
      backgroundColor: '#05050A',
      scale: 3,
      useCORS: true,
    });
  };

  const handleExport = async () => {
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${cityName.replace(/\s+/g, '-').toLowerCase()}-stamp.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Stamp exported ✈️');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const canvas = await generateCanvas();
        if (canvas) {
          const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (blob) {
            const file = new File([blob], `${cityName}-stamp.png`, { type: 'image/png' });
            const shareData: ShareData = {
              title: 'My Inscribed Journey',
              text: `${cityName} — ${entriesCount} stamps, ${citiesCount} cities. The Inscribed Journey.`,
              files: [file],
            };
            if (navigator.canShare?.(shareData)) {
              await navigator.share(shareData);
              toast.success('Shared ✈️');
              return;
            }
          }
        }
        await navigator.share({
          title: 'My Inscribed Journey',
          text: `Check out my Inscribed Journey — ${cityName}. ${entriesCount} stamps across ${citiesCount} cities.`,
          url: window.location.href,
        });
        toast.success('Shared ✈️');
      } else {
        await navigator.clipboard.writeText(
          `My Inscribed Journey — ${cityName}. ${entriesCount} stamps across ${citiesCount} cities. ${window.location.href}`
        );
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Share failed');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.92 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-[360px] space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* ── The exportable 9:16 card ── */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            width: '360px',
            height: '640px',
            background: '#05050A',
          }}
        >
          {/* Hero background photo — blurred, full coverage */}
          {heroPhotoUrl && (
            <div className="absolute inset-0">
              <img
                src={heroPhotoUrl}
                alt=""
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
                style={{ filter: 'blur(20px) brightness(0.3) saturate(1.4)', transform: 'scale(1.15)' }}
              />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, rgba(5,5,10,0.5) 0%, rgba(5,5,10,0.2) 30%, rgba(5,5,10,0.4) 60%, rgba(5,5,10,0.95) 100%)',
              }} />
            </div>
          )}

          {/* Ambient gold glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-60px',
              left: '-60px',
              width: '280px',
              height: '280px',
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '-40px',
              right: '-40px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Content — positioned within the card */}
          <div className="relative z-10 flex h-full flex-col justify-between p-8">

            {/* ── Header: Journey label ── */}
            <div className="text-center pt-4">
              <p
                className="text-[10px] uppercase tracking-[0.35em] mb-3"
                style={{ color: 'hsl(var(--primary) / 0.55)' }}
              >
                The Inscribed Journey
              </p>
              <h2
                className="text-4xl font-light uppercase italic tracking-tight leading-tight"
                style={{ color: 'hsl(var(--foreground) / 0.95)', fontFamily: "'Playfair Display', serif" }}
              >
                {cityName}
              </h2>
              {airportCode && (
                <p
                  className="text-[11px] font-mono tracking-[0.4em] mt-2"
                  style={{ color: 'hsl(var(--primary) / 0.45)' }}
                >
                  {airportCode}
                </p>
              )}
            </div>

            {/* ── Centerpiece: Scaled-up stamp ── */}
            <div className="flex justify-center py-6">
              <div
                className="relative flex flex-col items-center justify-center rounded-full"
                style={{
                  width: '192px',
                  height: '192px',
                  border: '1.5px solid hsl(var(--primary) / 0.35)',
                }}
              >
                {/* Inner ring */}
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: '8px',
                    border: '0.5px solid hsl(var(--primary) / 0.18)',
                  }}
                />
                {/* Double-ring accent */}
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: '4px',
                    border: '3px double hsl(var(--primary) / 0.12)',
                  }}
                />

                <span
                  className="text-[7px] uppercase tracking-[0.4em] font-medium mb-1"
                  style={{ color: 'hsl(var(--primary) / 0.65)' }}
                >
                  Inscribed Entry
                </span>
                <span
                  className="text-sm font-light uppercase tracking-[0.25em] leading-tight text-center px-6"
                  style={{ color: 'hsl(var(--foreground) / 0.9)' }}
                >
                  {cityName}
                </span>
                <span
                  className="text-[8px] font-mono mt-2 tabular-nums"
                  style={{ color: 'hsl(var(--primary) / 0.4)' }}
                >
                  {date}
                </span>

                {/* Subtle glass sheen */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)',
                  }}
                />
              </div>
            </div>

            {/* ── Stats row ── */}
            <div
              className="py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex justify-center gap-6 mb-6">
                <div className="flex flex-col items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary) / 0.5)' }} />
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {citiesCount} {citiesCount === 1 ? 'City' : 'Cities'}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Camera className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary) / 0.5)' }} />
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {photosCount} {photosCount === 1 ? 'Inspiration' : 'Inspirations'}
                  </span>
                </div>
                {companionName && (
                  <div className="flex flex-col items-center gap-1">
                    <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(var(--primary) / 0.5)' }} />
                    <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {companionName}
                    </span>
                  </div>
                )}
              </div>

              {/* Branding footer */}
              <div className="flex flex-col items-center">
                <h1
                  className="text-lg font-semibold tracking-[0.5em] uppercase"
                  style={{ color: 'hsl(var(--foreground) / 0.7)' }}
                >
                  COMPANI
                </h1>
                <p
                  className="text-[7px] tracking-[0.5em] uppercase mt-1.5"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.3)' }}
                >
                  Your Space · Your Pace
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-border/30 text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-secondary/30 border border-border/30 text-xs text-foreground/70 font-medium flex items-center justify-center gap-1.5 hover:bg-secondary/50 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-3 rounded-xl bg-primary/15 border border-primary/25 text-xs text-primary font-medium flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
