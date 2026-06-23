/**
 * UploadStylePicker — shown when a user taps the upload button in Studio.
 * Lets them choose how their photo gets rendered before it processes.
 *
 * Photorealistic = photo saved as-is (no re-render)
 * Any other style = photo rendered in that style
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { STUDIO_IMAGES } from '@/lib/studioImages';

interface StyleOption {
  name: string;
  key: string;
  description: string;
  premium?: boolean;
}

const KEEP_AS_IS: StyleOption = {
  name: 'Keep as-is', key: 'keep-as-is', description: 'Use your photo exactly as uploaded',
};

const FREE_STYLES: StyleOption[] = [
  { name: 'Photorealistic', key: 'photorealistic', description: 'AI-enhanced realistic portrait' },
  { name: 'Painterly', key: 'painterly', description: 'Soft impressionist painting' },
  { name: 'Artistic', key: 'artistic', description: 'Stylized illustration look' },
  { name: 'Moody Portrait', key: 'moody portrait', description: 'Cinematic dark atmosphere' },
  { name: 'Digital Art', key: 'digital art', description: 'Clean digital illustration' },
];

const PREMIUM_STYLES: StyleOption[] = [
  { name: 'Anime', key: 'anime', description: 'Manga-inspired style', premium: true },
  { name: 'Comic', key: 'comic', description: 'Bold graphic novel look', premium: true },
  { name: 'Watercolor', key: 'watercolor', description: 'Soft flowing watercolor washes', premium: true },
  { name: '3D Render', key: '3d render', description: 'Smooth cinematic 3D', premium: true },
  { name: 'Cyberpunk', key: 'cyberpunk', description: 'Neon-lit night city', premium: true },
  { name: 'Pop Art', key: 'pop art', description: 'Bold colors, graphic pop style', premium: true },
  { name: 'Cosmic Portrait', key: 'cosmic portrait', description: 'Ethereal space-themed portrait', premium: true },
  { name: 'Stylized', key: 'stylized', description: 'Bold concept art style', premium: true },
];

interface UploadStylePickerProps {
  open: boolean;
  isPremium: boolean;
  onSelect: (style: string) => void;
  onClose: () => void;
}

export default function UploadStylePicker({ open, isPremium, onSelect, onClose }: UploadStylePickerProps) {
  const allStyles = isPremium
    ? [...FREE_STYLES, ...PREMIUM_STYLES]
    : FREE_STYLES;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{ background: 'rgba(15,18,33,0.98)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '80vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h3 className="text-white font-semibold text-base">Choose a style</h3>
                <p className="text-white/40 text-xs mt-0.5">How should your photo be rendered?</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Style grid */}
            <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(80vh - 100px)' }}>
              {/* Keep as-is — full-width prominent option */}
              <button
                onClick={() => onSelect(KEEP_AS_IS.key)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 mb-3 border transition-all active:scale-[0.98] hover:border-amber-400/50"
                style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <Upload className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{KEEP_AS_IS.name}</p>
                  <p className="text-white/40 text-xs">{KEEP_AS_IS.description}</p>
                </div>
              </button>

              <p className="text-white/30 text-[10px] uppercase tracking-wider font-medium mb-2 px-1">Or render in a style</p>

              <div className="grid grid-cols-3 gap-3 pb-2">
                {allStyles.map((style) => (
                  <button
                    key={style.key}
                    onClick={() => onSelect(style.key)}
                    className="flex flex-col rounded-2xl overflow-hidden border transition-all active:scale-95 hover:border-amber-400/50"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Style preview image */}
                    <div className="relative w-full aspect-square overflow-hidden">
                      {STUDIO_IMAGES[style.key] ? (
                        <img
                          src={STUDIO_IMAGES[style.key]}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <Upload className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                      {style.premium && (
                        <div className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ background: 'rgba(212,168,75,0.9)', color: '#0f1221' }}>
                          PRO
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="px-2 py-2">
                      <p className="text-white text-[11px] font-medium leading-tight">{style.name}</p>
                      <p className="text-white/35 text-[10px] leading-tight mt-0.5">{style.description}</p>
                    </div>
                  </button>
                ))}

                {/* Upsell tile for free users */}
                {!isPremium && (
                  <button
                    className="flex flex-col rounded-2xl overflow-hidden border items-center justify-center py-4 px-2 text-center"
                    style={{ border: '1px solid rgba(212,168,75,0.2)', background: 'rgba(212,168,75,0.05)' }}
                    onClick={() => onSelect('__upgrade__')}
                  >
                    <span className="text-amber-400/80 text-lg mb-1">✦</span>
                    <p className="text-amber-400/80 text-[11px] font-medium">More styles</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Premium</p>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
