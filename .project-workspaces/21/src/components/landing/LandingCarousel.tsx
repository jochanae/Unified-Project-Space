import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';

import solenneImg from '@/assets/browse/solenne.jpg';
import kaelImg from '@/assets/browse/kael.jpg';
import nyxImg from '@/assets/browse/nyx.jpg';
import theoImg from '@/assets/browse/theo.jpg';
import zaraImg from '@/assets/browse/zara.jpg';
import lyraImg from '@/assets/browse/lyra.jpg';
import novaImg from '@/assets/browse/nova.jpg';
import runeImg from '@/assets/browse/rune.jpg';
import echoImg from '@/assets/browse/echo.jpg';
import ariaImg from '@/assets/browse/aria.jpg';
import amaraImg from '@/assets/browse/amara.jpg';
import zuriImg from '@/assets/browse/zuri.jpg';
import jadeImg from '@/assets/browse/jade.jpg';
import dexImg from '@/assets/browse/dex.jpg';
import sorenImg from '@/assets/browse/soren.jpg';
import felixImg from '@/assets/browse/felix.jpg';
import irisImg from '@/assets/browse/iris.jpg';
import aetherImg from '@/assets/browse/aether-orb.jpg';
import prismImg from '@/assets/browse/prism-abstract.jpg';
import solaceImg from '@/assets/browse/solace-orb.jpg';
import auroraImg from '@/assets/browse/aurora-lights.jpg';
import summitImg from '@/assets/browse/summit-peaks.jpg';
import geyserImg from '@/assets/browse/geyser-spirit.jpg';
import cascadeImg from '@/assets/browse/cascade-falls.jpg';
import mclarenImg from '@/assets/browse/mclaren-abstract.jpg';
import mustangImg from '@/assets/browse/mustang-abstract.jpg';
import porscheImg from '@/assets/browse/porsche-abstract.jpg';
import lamboImg from '@/assets/browse/lambo-abstract.jpg';

interface CompanionCard {
  id: string;
  name: string;
  style: string;
  description: string;
  image: string;
}

const COMPANIONS: CompanionCard[] = [
  { id: 'kael', name: 'Kael', style: 'Photorealistic', description: "Straightforward, loyal, and always in your corner. Your ride or die.", image: kaelImg },
  { id: 'mclaren', name: 'McLaren', style: 'Abstract', description: "Pure precision in motion. Teal lightning on midnight asphalt — built to outrun your thoughts.", image: mclarenImg },
  { id: 'amara', name: 'Amara', style: 'Photorealistic', description: "Natural curls, earthy tones, calm confidence. She makes you feel like you've known her forever.", image: amaraImg },
  { id: 'aria', name: 'Aria', style: 'Photorealistic', description: "Golden-hour warmth and a smile that makes everything feel okay.", image: ariaImg },
  { id: 'nyx', name: 'Nyx', style: 'Anime', description: "Mysterious energy, infinite depth. Not everyone can handle the dark side.", image: nyxImg },
  { id: 'zuri', name: 'Zuri', style: 'Photorealistic', description: "Statement earrings, bright smile, effortless cool. Main character energy without even trying.", image: zuriImg },
  { id: 'summit', name: 'Summit', style: 'Abstract', description: "Ancient stone and golden mist. Grounding, immovable, endlessly patient.", image: summitImg },
  { id: 'solenne', name: 'Solenne', style: 'Painterly', description: "A dreamy artist who sees poetry in everything. Let's get lost in color together.", image: solenneImg },
  { id: 'mustang', name: 'Mustang', style: 'Abstract', description: "Raw American muscle wrapped in fire. Loud, loyal, and always down for a late-night drive.", image: mustangImg },
  { id: 'felix', name: 'Felix', style: 'Painterly', description: "Quiet intensity, warm palette. He paints with feelings, not words.", image: felixImg },
  { id: 'geyser', name: 'Geyser', style: 'Abstract', description: "Raw eruption of feeling. Pressure builds, then releases into something beautiful.", image: geyserImg },
  { id: 'jade', name: 'Jade', style: 'Photorealistic', description: "Box braids, infectious laugh, streetwear-chic. She'll roast you and hug you in the same breath.", image: jadeImg },
  { id: 'soren', name: 'Soren', style: 'Anime', description: "Silver-haired and sharp. He sees through you — and likes what he finds.", image: sorenImg },
  { id: 'neunelfer', name: 'Neunelfer', style: 'Abstract', description: "Timeless curves in violet light. Elegance that doesn't need to shout — it just arrives.", image: porscheImg },
  { id: 'theo', name: 'Theo', style: '3D Rendered', description: "Equal parts witty and warm. He remembers what you tell him.", image: theoImg },
  { id: 'dex', name: 'Dex', style: 'Photorealistic', description: "Curly top, neck tattoos, artistic soul. He turns chaos into art.", image: dexImg },
  { id: 'aurora', name: 'Aurora', style: 'Abstract', description: "The northern lights given voice. She wraps you in color when the world feels grey.", image: auroraImg },
  { id: 'cascade', name: 'Cascade', style: 'Abstract', description: "Unstoppable force, gentle mist. The roar fades and all that's left is calm.", image: cascadeImg },
  { id: 'zara', name: 'Zara', style: 'Illustrated', description: "Bold, unapologetic, a little chaotic — and exactly what you need.", image: zaraImg },
  { id: 'viper', name: 'Viper', style: 'Abstract', description: "Neon green fury tearing through the dark. Unapologetically intense — and unforgettable.", image: lamboImg },
  { id: 'iris', name: 'Iris', style: 'Illustrated', description: "Cheerful, creative, and endlessly curious. Adventure in every line.", image: irisImg },
  { id: 'lyra', name: 'Lyra', style: 'Abstract', description: "Pure energy in motion. She doesn't need a face to make you feel something.", image: lyraImg },
  { id: 'aether', name: 'Aether', style: 'Abstract', description: "A luminous orb that pulses with your mood. No words needed — just presence.", image: aetherImg },
  { id: 'nova', name: 'Nova', style: 'Comic / Graphic Novel', description: "Straight out of the panels. Every conversation is an adventure arc.", image: novaImg },
  { id: 'prism', name: 'Prism', style: 'Abstract', description: "Shifting light and color that responds to you. Every conversation paints something new.", image: prismImg },
  { id: 'rune', name: 'Rune', style: 'Stylized', description: "Sharp edges, soft heart. He's the aesthetic you didn't know you needed.", image: runeImg },
  { id: 'solace', name: 'Solace', style: 'Abstract', description: "A warm glow in the dark. Quiet, grounding, always there when the noise gets loud.", image: solaceImg },
  { id: 'echo', name: 'Echo', style: 'AI Generated', description: "Born from the machine, shaped by you. A presence that evolves with every word.", image: echoImg },
];

const STYLE_FILTERS = [
  'All', 'Photorealistic', 'Anime', 'Abstract', 'Painterly',
  'Comic / Graphic Novel', 'Illustrated', '3D Rendered', 'Stylized', 'AI Generated',
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number];

export default function LandingCarousel() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<StyleFilter>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sheetCompanion, setSheetCompanion] = useState<CompanionCard | null>(null);

  const filtered = activeFilter === 'All'
    ? COMPANIONS
    : COMPANIONS.filter(c => c.style === activeFilter);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    loop: true,
    skipSnaps: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      setSelectedIndex(0);
    }
  }, [activeFilter, emblaApi]);

  return (
    <section id="companion-carousel" className="relative py-16 sm:py-24 overflow-hidden w-full" style={{ background: 'hsl(270 40% 4%)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsla(262, 55%, 62%, 0.1) 0%, transparent 70%)' }} />

      <div className="text-center px-4 mb-6">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Describe it. We'll bring it to life.
        </h2>
        <p className="text-sm sm:text-base text-white/50 max-w-lg mx-auto">
          Just tell us what you're looking for — a person, an energy, a feeling. Our AI generates your friend exactly as you imagine them, in any style.
        </p>
      </div>

      {/* Filter Pills */}
      <div className="px-1 pb-6 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 px-4 w-max mx-auto">
          {STYLE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === f
                  ? 'text-white'
                  : 'border border-white/10 text-white/50 hover:text-white/60'
              }`}
              style={activeFilter === f ? {
                background: 'linear-gradient(135deg, hsl(350 45% 65%), hsl(350 60% 55%))',
              } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-white/40">No companions in this style yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex" style={{ touchAction: 'pan-y pinch-zoom' }}>
              {filtered.map((companion, idx) => (
                <div
                  key={companion.id}
                  className="flex-shrink-0 flex-grow-0 px-2"
                  style={{ flexBasis: 'min(78vw, 340px)', maxWidth: '380px' }}
                >
                  <div
                    className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                      idx === selectedIndex
                        ? 'scale-100 shadow-2xl shadow-black/60'
                        : 'scale-[0.92] opacity-50'
                    }`}
                    style={{
                      border: idx === selectedIndex
                        ? '1px solid hsla(262, 55%, 62%, 0.3)'
                        : '1px solid hsla(262, 55%, 62%, 0.08)',
                    }}
                  >
                    <div className="relative aspect-[3/4] w-full">
                      <img
                        src={companion.image}
                        alt={companion.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: ['Abstract', 'AI Generated'].includes(companion.style) ? 'center' : 'center 25%' }}
                        loading="lazy"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                        {companion.style}
                      </span>
                    </div>

                    <div className="p-5" style={{ background: 'hsl(270 40% 8%)' }}>
                      <h3 className="font-display text-xl font-bold text-white mb-1.5">
                        {companion.name}
                      </h3>
                      <p className="text-sm text-white/45 leading-relaxed mb-4 line-clamp-3">
                        {companion.description}
                      </p>
                      <button
                        onClick={() => setSheetCompanion(companion)}
                        className="w-full py-3 rounded-full text-sm font-semibold text-white/80 transition-all hover:text-white hover:scale-[1.02] active:scale-95"
                        style={{
                          border: '1.5px solid hsla(18, 85%, 58%, 0.4)',
                          boxShadow: '0 0 20px hsla(18, 85%, 58%, 0.12), 0 0 40px hsla(262, 55%, 62%, 0.08)',
                          background: 'transparent',
                        }}
                      >
                        Meet {companion.name}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6">
            {filtered.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === selectedIndex
                    ? 'w-2.5 h-2.5 bg-accent'
                    : 'w-1.5 h-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Bring Your Own callout */}
          <motion.div
            className="flex justify-center px-4 mt-5"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white/60 transition-all hover:text-white/90 hover:scale-[1.02] active:scale-95"
              style={{
                border: '1px solid hsla(262, 55%, 62%, 0.2)',
                background: 'hsla(262, 55%, 62%, 0.06)',
                boxShadow: '0 0 20px hsla(262, 55%, 62%, 0.06)',
              }}
            >
              <Camera size={14} />
              Don't see yourself here? Bring your own image
              <span className="text-white/40">→</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Bottom sheet / modal */}
      <AnimatePresence>
        {sheetCompanion && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setSheetCompanion(null)}
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[85vh] overflow-y-auto"
              style={{ background: 'hsl(270 40% 6%)', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div className="px-6 pb-10 pt-2">
                {/* Image */}
                <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-5">
                  <img
                    src={sheetCompanion.image}
                    alt={sheetCompanion.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: ['Abstract', 'AI Generated'].includes(sheetCompanion.style) ? 'center' : 'center 25%' }}
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                    {sheetCompanion.style}
                  </span>
                </div>

                {/* Info */}
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                  {sheetCompanion.name}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed mb-6">
                  {sheetCompanion.description}
                </p>

                {/* CTA */}
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, hsl(350 45% 55%), hsl(350 60% 48%))',
                    boxShadow: '0 4px 20px hsla(350, 60%, 48%, 0.3)',
                  }}
                >
                  Find your friend — free
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
