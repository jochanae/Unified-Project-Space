/**
 * RefinementLinearFlow — Mirrors the cinematic linear creation flow but for editing existing companions.
 * Uses the same pip-based progress, scroll-synced sections, and blur-in headers.
 *
 * Steps: 0 = Visuals (style + wardrobe), 1 = Vibe (energy + personality), 2 = Identity (name + role + backstory)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Check, Palette, Crown, Gift, Upload, Wand2 } from 'lucide-react';
import BackstoryAssistSheet, { BackstoryQualityWhisper } from '@/components/studio/BackstoryAssistSheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { STUDIO_IMAGES } from '@/lib/studioImages';
import { treatAsMinor } from '@/lib/ageUtils';
import StudioSectionRenderer from '@/components/studio/StudioSectionRenderer';
import type { StudioSection } from '@/lib/studioData';
import { Button } from '@/components/ui/button';
import type { ShopItem } from '@/lib/giftInventory';

const REFINE_STEPS = [
  {
    header: (name: string) => `Refining ${name}'s Presence.`,
    whisper: 'Shape their visual identity — style, appearance, wardrobe.',
  },
  {
    header: (name: string) => `Tuning ${name}'s Frequency.`,
    whisper: 'Their energy, personality, and the warmth they carry…',
  },
  {
    header: (name: string) => `${name}'s Identity.`,
    whisper: 'Name, role, and the story behind them.',
  },
];

const ROLES = [
  { value: 'friend', label: 'Friend', emoji: '💛' },
  { value: 'mentor', label: 'Mentor', emoji: '🌱' },
  { value: 'accountability', label: 'Accountability', emoji: '🎯' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'assistant', label: 'Assistant', emoji: '⚡' },
];


interface RefinementLinearFlowProps {
  companionName: string;
  description: string;
  onDescriptionChange: (desc: string) => void;
  selections: Record<string, string | string[]>;
  onSelectSingle: (sectionId: string, name: string) => void;
  onSelectMulti: (sectionId: string, name: string, max: number) => void;
  onSelectSkip: (sectionId: string) => void;
  isPremium: boolean;
  isMinor: boolean;
  chosenPathType: string | null;
  lookSections: StudioSection[];
  characterSections: StudioSection[];
  currentPath: StudioSection[];
  onExpandImage: (url: string) => void;
  onGenerate: () => void;
  onUploadPhoto: () => void;
  generating: boolean;
  // Wardrobe
  ownedGifts: ShopItem[];
  equippedGiftIds: Set<string>;
  onToggleGiftEquip: (id: string) => void;
  // Role
  currentRole: string;
  onRoleChange: (role: string) => void;
  // Backstory
  backstory: string;
  onBackstoryChange: (text: string) => void;
  // Name
  onNameSave: (name: string) => void;
  // Presence drawer
  onShowPresenceDrawer: (show: boolean) => void;
  // Teleport — jump to a specific step from the bottom sheet
  initialStep?: number | null;
  teleportTrigger?: number;
  onStepChange?: (step: number) => void;
  sfx: { sparkle: () => void; tapSelect: () => void };
}

export default function RefinementLinearFlow({
  companionName,
  description,
  onDescriptionChange,
  selections,
  onSelectSingle,
  onSelectMulti,
  onSelectSkip,
  isPremium,
  isMinor,
  chosenPathType,
  lookSections,
  characterSections,
  currentPath,
  onExpandImage,
  onGenerate,
  onUploadPhoto,
  generating,
  ownedGifts,
  equippedGiftIds,
  onToggleGiftEquip,
  currentRole,
  onRoleChange,
  backstory,
  onBackstoryChange,
  onNameSave,
  onShowPresenceDrawer,
  initialStep,
  teleportTrigger,
  onStepChange,
  sfx,
}: RefinementLinearFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);
  const [editName, setEditName] = useState(companionName);
  const [backstoryDraft, setBackstoryDraft] = useState(backstory);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [assistOpen, setAssistOpen] = useState(false);

  // Sync name when companion changes
  useEffect(() => { setEditName(companionName); }, [companionName]);
  useEffect(() => { setBackstoryDraft(backstory); }, [backstory]);

  // Teleport: jump to step when trigger fires
  useEffect(() => {
    if (initialStep != null && teleportTrigger != null && teleportTrigger > 0) {
      setCurrentStep(initialStep);
      // Use DOM id-based scrolling as primary, ref-based as fallback
      setTimeout(() => {
        const el = document.getElementById(`refine-step-section-${initialStep}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          scrollToStep(initialStep);
        }
      }, 200);
    }
  }, [teleportTrigger]);

  const scrollToStep = useCallback((step: number) => {
    const el = sectionRefs.current[step];
    if (el && scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop + (elRect.top - containerRect.top) - 20;
      scrollContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, []);

  // Scroll-position-based focus detection — finds section closest to viewport center
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const center = containerRect.top + containerRect.height / 2;
        let closestIdx = 0;
        let closestDist = Infinity;
        sectionRefs.current.forEach((el, idx) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height / 2;
          const dist = Math.abs(elCenter - center);
          if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
        });
        setCurrentStep(prev => {
          if (prev !== closestIdx) { onStepChange?.(closestIdx); return closestIdx; }
          return prev;
        });
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => { container.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [onStepChange]);

  // Style options (same as creation)
  const styleOptions = [
    { name: 'Photorealistic', key: 'photorealistic', imgKey: 'photorealistic', premium: false },
    { name: 'Painterly', key: 'painterly', imgKey: 'painterly', premium: false },
    { name: 'Illustrated', key: 'Illustrated', imgKey: 'artistic', premium: false },
    { name: 'Moody Portrait', key: 'Moody Portrait', imgKey: 'moody-portrait', premium: false },
    { name: 'Digital Art', key: 'Digital Art', imgKey: 'digital-art', premium: false },
    { name: 'Anime', key: 'anime', imgKey: 'anime', premium: true },
    { name: 'Comic', key: 'comic', imgKey: 'comic', premium: true },
    { name: 'Watercolor', key: 'watercolor', imgKey: 'watercolor', premium: true },
    { name: 'Cyberpunk', key: 'cyberpunk', imgKey: 'cyberpunk', premium: true },
    { name: '3D Render', key: '3d render', imgKey: '3d-render', premium: true },
    { name: 'Pop Art', key: 'pop art', imgKey: 'pop-art', premium: true },
    { name: 'Cosmic Portrait', key: 'cosmic portrait', imgKey: 'cosmic-portrait', premium: true },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Progress Pips ── */}
      <div className="flex items-center justify-center gap-3 py-4 shrink-0">
        {REFINE_STEPS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => { setCurrentStep(idx); setTimeout(() => scrollToStep(idx), 100); }}
            className="relative"
          >
            <motion.div
              animate={{
                scale: idx === currentStep ? 1.3 : 1,
                opacity: idx <= currentStep ? 1 : 0.25,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-colors',
                idx <= currentStep ? 'bg-primary' : 'bg-white/20',
              )}
            />
            {idx === currentStep && (
              <motion.div
                layoutId="refine-pip-glow"
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.5)',
                  margin: '-2px',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Scrollable narrative sections ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-5 pb-32"
      >
        {REFINE_STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isPast = idx < currentStep;
          const isFuture = idx > currentStep;

          return (
            <motion.div
              key={idx}
              id={`refine-step-section-${idx}`}
              ref={el => { sectionRefs.current[idx] = el; }}
              animate={{
                opacity: isActive ? 1 : isPast ? 0.25 : 0.15,
                scale: isActive ? 1 : 0.96,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={cn(
                'mb-10 transition-all rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-4',
                isFuture && 'pointer-events-none',
              )}
              onClick={() => {
                if (isPast) { setCurrentStep(idx); setTimeout(() => scrollToStep(idx), 100); }
              }}
            >
              {/* Cinematic header */}
              <AnimatePresence mode="wait">
                {(isActive || isPast) && (
                  <motion.div
                    key={`header-${idx}-${isActive}`}
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="mb-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-2">
                      {String(idx + 1).padStart(2, '0')}
                    </p>
                    <h2 className="text-xl font-light text-white leading-tight tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      {step.header(companionName)}
                    </h2>
                    <p className="text-xs text-white/40 mt-1.5 italic font-light">
                      {step.whisper}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Step 0: Visuals ── */}
              {idx === 0 && (
                <div className="space-y-5">
                  {/* Style carousel */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">Style</p>
                    <div className="relative">
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                        {styleOptions.map((style) => {
                          const locked = style.premium && !isPremium;
                          const isSelected = typeof selections.style === 'string' && selections.style === style.key;
                          return (
                            <button
                              key={style.key}
                              onClick={() => {
                                if (locked) { toast.info('Unlock with Premium ✨'); return; }
                                onSelectSingle('style', style.key);
                              }}
                              className={cn(
                                'relative shrink-0 flex flex-col items-center rounded-xl overflow-hidden border transition-all active:scale-95',
                                isSelected ? 'border-primary/60 ring-1 ring-primary/30' : 'border-white/10',
                                locked && 'opacity-60',
                              )}
                              style={{ width: 72, background: 'rgba(255,255,255,0.04)' }}
                            >
                              {locked && (
                                <div className="absolute top-1 right-1 z-10 text-[8px] bg-black/60 rounded px-1 py-0.5 text-yellow-400 leading-none">✦</div>
                              )}
                              <div className="w-full aspect-square overflow-hidden">
                                {STUDIO_IMAGES[style.imgKey] ? (
                                  <img src={STUDIO_IMAGES[style.imgKey]} alt={style.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                    <Palette className="w-4 h-4 text-white/20" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-white/60 py-1 px-1 text-center leading-tight">{style.name}</p>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.6))' }} />
                    </div>
                  </div>

                  {/* Wardrobe carousel — always visible if owned gifts exist */}
                  {ownedGifts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2 flex items-center gap-1.5">
                        <Gift className="h-3 w-3 text-amber-400/60" /> Wardrobe ({ownedGifts.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {ownedGifts.map(gift => {
                          const equipped = equippedGiftIds.has(gift.id);
                          return (
                            <button
                              key={gift.id}
                              onClick={() => onToggleGiftEquip(gift.id)}
                              className={cn(
                                'shrink-0 flex flex-col items-center rounded-xl overflow-hidden border transition-all active:scale-95',
                                equipped ? 'border-amber-400/50 ring-1 ring-amber-400/30' : 'border-white/10',
                              )}
                              style={{ width: 72, background: equipped ? 'rgba(255,200,50,0.08)' : 'rgba(255,255,255,0.04)' }}
                            >
                              <div className="w-full aspect-square bg-white/5 flex items-center justify-center text-2xl">
                                {gift.emoji || '👕'}
                              </div>
                              <div className="px-1 py-1 w-full text-center">
                                <p className="text-[9px] text-white/60 truncate">{gift.name}</p>
                                {equipped && <Check className="h-2.5 w-2.5 text-amber-400 mx-auto mt-0.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}


                  {/* Fine-tune appearance (collapsible sections) */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/45 transition-colors py-1">
                      <span>Fine-tune appearance</span>
                      <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 space-y-6">
                        {lookSections.map((section) => {
                          const sectionIdx = currentPath.findIndex(s => s.id === section.id);
                          if (section.id !== 'style' && !selections.style) return null;
                          return (
                            <div key={section.id}>
                              <p className="text-sm font-extrabold text-white mb-2">{section.title}</p>
                              <StudioSectionRenderer
                                section={section}
                                sectionIdx={sectionIdx}
                                pathType={chosenPathType || undefined}
                                selections={selections}
                                isPremium={isPremium}
                                onSelectSingle={onSelectSingle}
                                onSelectMulti={onSelectMulti}
                                onExpandImage={onExpandImage}
                                onSelectSkip={onSelectSkip}
                                isCreationMode={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* ── Step 1: Vibe (Energy + Personality) ── */}
              {idx === 1 && (
                <div className="space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Describe their vibe, their look, and the energy they carry…"
                    rows={4}
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 resize-none leading-relaxed transition-colors"
                  />
                  <button
                    onClick={() => onShowPresenceDrawer(true)}
                    className="flex items-center gap-1.5 text-xs text-primary/50 hover:text-primary/70 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    Help me describe the presence I'm looking for
                  </button>

                  {/* Character sections (personality, rhythm) */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/45 transition-colors py-1">
                      <span>Personality traits & communication style</span>
                      <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 space-y-6">
                        {characterSections.map((section) => {
                          const sectionIdx = currentPath.findIndex(s => s.id === section.id);
                          return (
                            <div key={section.id}>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-extrabold text-white">{section.title}</p>
                                {section.multi && (
                                  <p className="text-[11px] font-semibold text-primary">✦ Pick up to {section.maxSelect}</p>
                                )}
                              </div>
                              <StudioSectionRenderer
                                section={section}
                                sectionIdx={sectionIdx}
                                pathType={chosenPathType || undefined}
                                selections={selections}
                                isPremium={isPremium}
                                onSelectSingle={onSelectSingle}
                                onSelectMulti={onSelectMulti}
                                onExpandImage={onExpandImage}
                                onSelectSkip={onSelectSkip}
                                isCreationMode={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* ── Step 2: Identity (Name, Role, Backstory) ── */}
              {idx === 2 && (
                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">Name</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-lg text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors tracking-wide"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      />
                      {editName.trim() !== companionName && editName.trim() && (
                        <button
                          onClick={() => { onNameSave(editName.trim()); sfx.sparkle(); toast.success('Name saved'); }}
                          className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary transition-all hover:bg-primary/30"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">Role</p>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.filter(r => !isMinor || r.value !== 'romantic').map(role => (
                        <button
                          key={role.value}
                          onClick={() => { onRoleChange(role.value); sfx.tapSelect(); }}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all',
                            currentRole === role.value
                              ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-bold shadow-[0_0_16px_rgba(212,175,55,0.4)]'
                              : 'border-white/20 bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white/80',
                          )}
                        >
                          <span>{role.emoji}</span>
                          <span>{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Backstory */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Backstory</p>
                      <button
                        type="button"
                        onClick={() => { setAssistOpen(true); sfx.tapSelect(); }}
                        className="flex items-center gap-1.5 text-[11px] text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors px-2 py-0.5 rounded-md hover:bg-[#D4AF37]/10"
                      >
                        <Wand2 className="h-3 w-3" />
                        <span>Help me write this</span>
                      </button>
                    </div>
                    <textarea
                      value={backstoryDraft}
                      onChange={(e) => setBackstoryDraft(e.target.value)}
                      placeholder="Their origin, how you met, or any lore…"
                      rows={4}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 resize-none leading-relaxed transition-colors"
                    />
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <BackstoryQualityWhisper text={backstoryDraft} />
                      {backstoryDraft.trim() !== backstory && backstoryDraft.trim() && (
                        <button
                          onClick={() => { onBackstoryChange(backstoryDraft.trim()); toast.success('Backstory saved'); }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Check className="h-3 w-3" /> Save backstory
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 bg-black/60 backdrop-blur-md" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 28px)' }}>
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onUploadPhoto}
            className="rounded-xl h-12 px-3 border-white/15 text-white/70 bg-transparent hover:bg-white/10"
            disabled={generating}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <button
            onClick={onGenerate}
            disabled={generating}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-white font-bold text-sm tracking-[0.05em] transition-all',
              !generating ? 'opacity-100' : 'opacity-40',
            )}
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
            }}
          >
            {generating ? (
              <>
                <div className="h-4 w-4 border-2 border-black/30 border-t-transparent rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{currentStep === 0 ? 'Set Appearance' : currentStep === 1 ? 'Refine Essence' : 'Confirm & Generate'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <BackstoryAssistSheet
        open={assistOpen}
        onOpenChange={setAssistOpen}
        companionName={companionName}
        connectionMode={currentRole}
        bio={description}
        currentDraft={backstoryDraft}
        onApply={(text) => { setBackstoryDraft(text); onBackstoryChange(text); }}
      />
    </div>
  );
}
