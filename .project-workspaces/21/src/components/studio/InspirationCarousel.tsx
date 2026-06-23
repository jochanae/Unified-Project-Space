import { GALLERY_AVATARS } from '@/lib/galleryAvatars';
import { STUDIO_IMAGES } from '@/lib/studioImages';

interface InspirationCard {
  id: string;
  src: string;
  label: string;
}

const INSPIRATION_CARDS: InspirationCard[] = [
  { id: 'insp-photo', src: STUDIO_IMAGES['photorealistic'] || '', label: 'Photorealistic' },
  { id: 'insp-artistic', src: STUDIO_IMAGES['artistic'] || '', label: 'Artistic' },
  { id: 'insp-anime', src: STUDIO_IMAGES['anime'] || '', label: 'Anime' },
  { id: 'insp-painterly', src: STUDIO_IMAGES['painterly'] || '', label: 'Painterly' },
  { id: 'insp-comic', src: STUDIO_IMAGES['comic'] || '', label: 'Comic' },
  { id: 'insp-watercolor', src: STUDIO_IMAGES['watercolor'] || '', label: 'Watercolor' },
  { id: 'insp-cyberpunk', src: STUDIO_IMAGES['cyberpunk'] || '', label: 'Cyberpunk' },
  { id: 'insp-3d', src: STUDIO_IMAGES['3d-render'] || '', label: '3D Render' },
  ...GALLERY_AVATARS.slice(0, 4).map((a, i) => ({
    id: `insp-gallery-${i}`,
    src: a.src,
    label: a.name,
  })),
];

interface InspirationCarouselProps {
  onSelectStyle: (styleId: string) => void;
}

export default function InspirationCarousel({ onSelectStyle }: InspirationCarouselProps) {
  const styleMap: Record<string, string> = {
    'insp-photo': 'photorealistic',
    'insp-artistic': 'artistic',
    'insp-anime': 'anime',
    'insp-painterly': 'painterly',
    'insp-comic': 'comic',
    'insp-watercolor': 'watercolor',
    'insp-cyberpunk': 'cyberpunk',
    'insp-3d': '3d-render',
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-primary flex items-center gap-1">
        ✨ Browse styles for inspiration
      </p>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {INSPIRATION_CARDS.filter(c => c.src).map((card) => (
          <button
            key={card.id}
            onClick={() => {
              const mapped = styleMap[card.id];
              if (mapped) onSelectStyle(mapped);
            }}
            className="shrink-0 relative overflow-hidden rounded-xl border border-border/30 hover:border-primary/40 transition-all group"
            style={{ width: 140, height: 200 }}
          >
            <img
              src={card.src}
              alt={card.label}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.style.background = 'linear-gradient(135deg, hsl(350 45% 65% / 0.3), hsl(262 55% 62% / 0.3))';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
