import { useState, useRef } from 'react';
import { Lock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LookbookStyle {
  name: string;
  collection: string;
  persona: string;
  logic: string;
  palette: string[];
  fontPreview: { heading: string; body: string };
  tier: 'signal' | 'identity' | 'innovation';
}

const LOOKBOOK_STYLES: LookbookStyle[] = [
  {
    name: 'Vintage Chanel',
    collection: 'The Legacy',
    persona: 'The Established Authority',
    logic: 'High-contrast typography and cream tones signal heritage and trustworthiness. Ideal for high-ticket consulting.',
    palette: ['#F5F0E0', '#1A1A1A', '#C9A84C', '#2D2D2D', '#E8E4DD'],
    fontPreview: { heading: 'Playfair Display', body: 'Lato' },
    tier: 'identity',
  },
  {
    name: 'Modern Obsidian',
    collection: 'The Stealth',
    persona: 'The Stealth Leader',
    logic: 'Deep shadows and glass layers signal sophistication and tech-forward thinking. Ideal for AI-driven services.',
    palette: ['#0A0A0A', '#1A1A1A', '#2D2D2D', '#C9A84C', '#F0F0F0'],
    fontPreview: { heading: 'Inter', body: 'DM Sans' },
    tier: 'identity',
  },
  {
    name: 'White Linen',
    collection: 'The Clarity',
    persona: 'The Precision Architect',
    logic: 'High whitespace and bold sans-serif signal clinical precision and modern authority.',
    palette: ['#FAFAFA', '#E8E8E8', '#333333', '#0066FF', '#F5F5F5'],
    fontPreview: { heading: 'Space Grotesk', body: 'Work Sans' },
    tier: 'signal',
  },
  {
    name: 'Gold Silk',
    collection: 'The Legacy',
    persona: 'The Luxury Curator',
    logic: 'Warm golds and deep blacks convey opulence. Perfect for high-end real estate or fashion.',
    palette: ['#0D0D0D', '#1A1410', '#C9A84C', '#F0D78C', '#F5F0E0'],
    fontPreview: { heading: 'Cormorant Garamond', body: 'Karla' },
    tier: 'identity',
  },
  {
    name: 'Neon Pulse',
    collection: 'The Kinetic',
    persona: 'The Disruptor',
    logic: 'Dark mode with glowing accent lines. Perfect for tech startups and innovation-focused brands.',
    palette: ['#0A0A1A', '#141432', '#4F46E5', '#2DD4A8', '#F0F0F0'],
    fontPreview: { heading: 'Syne', body: 'Plus Jakarta Sans' },
    tier: 'innovation',
  },
  {
    name: 'Desert Modernism',
    collection: 'The Clarity',
    persona: 'The Grounded Visionary',
    logic: 'Earthy terracotta with clean lines — warmth meets precision for lifestyle and wellness brands.',
    palette: ['#FAF8F5', '#C4654A', '#E8A87C', '#87A878', '#2D2D2D'],
    fontPreview: { heading: 'Outfit', body: 'Figtree' },
    tier: 'signal',
  },
  {
    name: 'Parisian Editorial',
    collection: 'The Legacy',
    persona: 'The Tastemaker',
    logic: 'Refined serif typography with muted tones — the editorial standard for creative professionals.',
    palette: ['#F5F3EE', '#E8E4DD', '#2D2D2D', '#8B7355', '#C9B99A'],
    fontPreview: { heading: 'DM Serif Display', body: 'Fira Sans' },
    tier: 'identity',
  },
  {
    name: 'Cyber Command',
    collection: 'The Kinetic',
    persona: 'The System Architect',
    logic: 'Live pulse backgrounds that react to real-time data. For Innovation-tier users who run on analytics.',
    palette: ['#0C2340', '#1A4A6E', '#2DD4A8', '#4F46E5', '#F0F0F0'],
    fontPreview: { heading: 'JetBrains Mono', body: 'Work Sans' },
    tier: 'innovation',
  },
];

interface LookbookCarouselProps {
  onSelect: (vibe: string) => void;
  currentTier: 'free' | 'signal' | 'identity' | 'innovation';
}

export default function LookbookCarousel({ onSelect, currentTier }: LookbookCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLocked = (style: LookbookStyle) => {
    if (currentTier === 'innovation') return false;
    if (currentTier === 'identity') return style.tier === 'innovation';
    if (currentTier === 'signal') return style.tier !== 'signal';
    return style.tier !== 'signal'; // free
  };

  const scrollTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, LOOKBOOK_STYLES.length - 1));
    setActiveIndex(clamped);
    if (scrollRef.current) {
      const card = scrollRef.current.children[clamped] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const active = LOOKBOOK_STYLES[activeIndex];

  return (
    <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Collection label */}
      <div className="text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/60">
          {active.collection}
        </span>
        <h3
          className="text-xl font-bold text-foreground mt-1"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Visual DNA Lookbook
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Swipe to find your brand's soul. Tap to lock.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Nav arrows */}
        <button
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 border border-border/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex === LOOKBOOK_STYLES.length - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 border border-border/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin px-8 py-2"
          onScroll={() => {
            if (!scrollRef.current) return;
            const container = scrollRef.current;
            const center = container.scrollLeft + container.clientWidth / 2;
            let closest = 0;
            let minDist = Infinity;
            Array.from(container.children).forEach((child, i) => {
              const el = child as HTMLElement;
              const elCenter = el.offsetLeft + el.offsetWidth / 2;
              const dist = Math.abs(center - elCenter);
              if (dist < minDist) {
                minDist = dist;
                closest = i;
              }
            });
            setActiveIndex(closest);
          }}
        >
          {LOOKBOOK_STYLES.map((style, i) => {
            const locked = isLocked(style);
            const isActive = i === activeIndex;
            return (
              <div
                key={style.name}
                className={cn(
                  'shrink-0 w-[260px] snap-center rounded-2xl border overflow-hidden transition-all duration-300 relative',
                  isActive
                    ? 'scale-[1.02] border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.15)]'
                    : 'scale-95 opacity-70 border-border/20',
                )}
              >
                {/* Palette preview */}
                <div className="flex h-20">
                  {style.palette.map((hex, j) => (
                    <div key={j} className="flex-1" style={{ backgroundColor: hex }} />
                  ))}
                </div>

                {/* Content */}
                <div
                  className="p-4 space-y-2"
                  style={{ backgroundColor: 'hsl(var(--card) / 0.8)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">{style.name}</h4>
                    <span className={cn(
                      'text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      style.tier === 'signal' && 'bg-muted text-muted-foreground',
                      style.tier === 'identity' && 'bg-primary/10 text-primary',
                      style.tier === 'innovation' && 'text-yellow-600 bg-yellow-500/10',
                    )}>
                      {style.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 italic">
                    {style.persona}
                  </p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground/50">
                    <span>{style.fontPreview.heading}</span>
                    <span>/</span>
                    <span>{style.fontPreview.body}</span>
                  </div>
                </div>

                {/* Locked overlay */}
                {locked && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
                    style={{
                      backgroundColor: 'hsl(var(--background) / 0.7)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <Lock className="h-5 w-5 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                      {style.tier === 'innovation' ? 'Innovation tier' : 'Identity tier'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active style detail */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{active.name}</span>
          <span className="text-[10px] text-muted-foreground/60">— {active.persona}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          "{active.logic}"
        </p>
      </div>

      {/* Select button */}
      <div className="flex justify-center">
        {isLocked(active) ? (
          <Button variant="outline" size="sm" className="gap-2 opacity-60" disabled>
            <Lock className="h-3.5 w-3.5" />
            Unlock {active.tier === 'innovation' ? 'Innovation' : 'Identity'} to use
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => onSelect(active.name)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Use "{active.name}" as my vibe
          </Button>
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {LOOKBOOK_STYLES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}
