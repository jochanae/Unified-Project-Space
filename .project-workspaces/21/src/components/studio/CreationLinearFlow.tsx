/**
 * CreationLinearFlow — Single-page narrative creation experience.
 * Replaces the tab-based Studio creation with a cinematic 4-step scroll.
 *
 * Steps: 0 = The Look, 1 = The Name, 2 = The Energy, 3 = The Role
 *
 * FIX: Removed IntersectionObserver entirely — it was resetting currentStep
 * back to 0 whenever earlier sections remained visible after scrolling forward.
 * Steps now advance ONLY via the Continue button or pip taps.
 */

import { useState, useCallback } from 'react';
import EnergyGenderSelector from '@/components/shared/EnergyGenderSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Sparkles, Loader2, Crown, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { STUDIO_IMAGES } from '@/lib/studioImages';
import { Palette } from 'lucide-react';
import { treatAsMinor } from '@/lib/ageUtils';
import StudioSectionRenderer from '@/components/studio/StudioSectionRenderer';
import type { StudioSection } from '@/lib/studioData';
import { Button } from '@/components/ui/button';
import PresenceDrawer from '@/components/studio/PresenceDrawer';
import BackstoryAssistSheet, { BackstoryQualityWhisper } from '@/components/studio/BackstoryAssistSheet';
import { Wand2 } from 'lucide-react';

const STEPS = [
  {
    header: 'How should your companion appear?',
    whisper: 'Who are you meeting for the first time?',
  },
  {
    header: 'What shall we call them?',
    whisper: 'A name that carries weight and warmth.',
  },
  {
    header: 'Define who they are.',
    whisper: 'Their energy, their appearance, and how they make you feel…',
  },
  {
    header: 'Set the intention.',
    whisper: 'How will they walk beside you?',
  },
];

const ROLES = [
  { value: 'friend', label: 'Friend', emoji: '💛' },
  { value: 'mentor', label: 'Mentor', emoji: '🌱' },
  { value: 'accountability', label: 'Accountability', emoji: '🎯' },
  { value: 'assistant', label: 'Assistant', emoji: '⚡' },
];


interface CreationLinearFlowProps {
  creationName: string;
  onCreationNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  studioRole: string;
  onStudioRoleChange: (role: string) => void;
  selections: Record<string, string | string[]>;
  onSelectSingle: (sectionId: string, name: string) => void;
  onSelectMulti: (sectionId: string, name: string, max: number) => void;
  onSelectSkip: (sectionId: string) => void;
  isPremium: boolean;
  isMinor: boolean;
  chosenPathType: string | null;
  onChosenPathTypeChange: (type: 'face' | 'abstract') => void;
  lookSections: StudioSection[];
  characterSections: StudioSection[];
  currentPath: StudioSection[];
  onExpandImage: (url: string) => void;
  onBringToLife: () => void;
  onUploadPhoto: () => void;
  creating: boolean;
  heroImage: string | null;
  profileUserName: string;
  onBack: () => void;
  sfx: { sparkle: () => void; tapSelect: () => void };
  showPresenceDrawer: boolean;
  onShowPresenceDrawer: (show: boolean) => void;
  onPresenceFill: (desc: string, style: string) => void;
  backstory: string;
  onBackstoryChange: (text: string) => void;
  creationGender: string | undefined;
  onCreationGenderChange: (value: string) => void;
  creationEnergy: string | undefined;
  onCreationEnergyChange: (value: string) => void;
}

export default function CreationLinearFlow({
  creationName,
  onCreationNameChange,
  description,
  onDescriptionChange,
  studioRole,
  onStudioRoleChange,
  selections,
  onSelectSingle,
  onSelectMulti,
  onSelectSkip,
  isPremium,
  isMinor,
  chosenPathType,
  onChosenPathTypeChange,
  lookSections,
  characterSections,
  currentPath,
  onExpandImage,
  onBringToLife,
  onUploadPhoto,
  creating,
  heroImage,
  profileUserName,
  onBack,
  sfx,
  showPresenceDrawer,
  onShowPresenceDrawer,
  onPresenceFill,
  backstory,
  onBackstoryChange,
  creationGender,
  onCreationGenderChange,
  creationEnergy,
  onCreationEnergyChange,
}: CreationLinearFlowProps) {
  // useNavigate kept for potential future use
  const _navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [assistOpen, setAssistOpen] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  const handleContinue = useCallback(() => {
    if (currentStep === 3) {
      // Final step — bring to life
      if (!creationName.trim()) { toast.error('Give your companion a name first'); return; }
      if (!description.trim() && !heroImage) { toast.error('Describe their presence first'); return; }
      onBringToLife();
      return;
    }

    // Validate current step
    if (currentStep === 1 && !creationName.trim()) {
      toast.error('Give them a name to continue');
      return;
    }

    goToStep(currentStep + 1);
  }, [currentStep, creationName, description, heroImage, onBringToLife, goToStep]);

  // Style options for Step 0
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

  const buttonLabel = (() => {
    if (currentStep === 0) return 'Continue';
    if (currentStep === 3) return creationName.trim() ? `Create ${creationName} ✨` : 'Create Companion ✨';
    return 'Continue';
  })();

  const canContinue = (() => {
    if (currentStep === 0) return true; // style is optional
    if (currentStep === 1) return creationName.trim().length > 0;
    if (currentStep === 2) return true; // description can be refined later
    if (currentStep === 3) return creationName.trim().length > 0 && (description.trim().length > 0 || !!heroImage);
    return true;
  })();

  return (
    <div className="flex flex-col h-full min-h-0" style={{ paddingTop: 'env(safe-area-inset-top, 12px)', touchAction: 'manipulation' }}>
      {/* ── Progress Pips ── */}
      <div className="flex items-center justify-center gap-3 py-4 shrink-0">
        {STEPS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (idx <= currentStep) goToStep(idx);
            }}
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
                idx < currentStep ? 'bg-primary' : idx === currentStep ? 'bg-primary' : 'bg-white/20',
              )}
            />
            {idx === currentStep && (
              <motion.div
                layoutId="pip-glow"
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

      {/* ── Single-step display with transitions ── */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="rounded-2xl bg-black/40 backdrop-blur-md p-4"
          >
            {/* Cinematic header */}
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className="mb-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-2">
                {String(currentStep + 1).padStart(2, '0')}
              </p>
              <h2 className="text-xl font-light text-white leading-tight tracking-wide" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {STEPS[currentStep].header}
              </h2>
              <p className="text-xs text-white/40 mt-1.5 italic font-light">
                {STEPS[currentStep].whisper}
              </p>
            </motion.div>

            {/* ── Step 0: The Look ── */}
            {currentStep === 0 && (
              <div className="space-y-5">
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
                            style={{ width: 72, background: 'rgba(255,255,255,0.04)', touchAction: 'manipulation' }}
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(15,18,33,0.9))' }} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { onChosenPathTypeChange('face'); sfx.sparkle(); }}
                    className={cn(
                      'flex-1 flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      chosenPathType === 'face' ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5',
                    )}
                  >
                    <img src={STUDIO_IMAGES.photorealistic} alt="Face" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">A face</p>
                      <p className="text-[10px] text-muted-foreground">Realistic, painted</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { onChosenPathTypeChange('abstract'); sfx.sparkle(); }}
                    className={cn(
                      'flex-1 flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      chosenPathType === 'abstract' ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5',
                    )}
                  >
                    <img src={STUDIO_IMAGES.cosmic} alt="Abstract" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Abstract</p>
                      <p className="text-[10px] text-muted-foreground">Energy, cosmic</p>
                    </div>
                  </button>
                </div>

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
                              isCreationMode
                              creationName={creationName}
                              onCreationNameChange={onCreationNameChange}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* ── Step 1: The Name ── */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={creationName}
                  onChange={(e) => onCreationNameChange(e.target.value)}
                  placeholder="e.g. Noor, Kai, River…"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-lg text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors tracking-wide"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  autoFocus
                />
              </div>
            )}

            {/* ── Step 2: The Energy ── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <EnergyGenderSelector
                  gender={creationGender}
                  energy={creationEnergy}
                  onGenderChange={onCreationGenderChange}
                  onEnergyChange={onCreationEnergyChange}
                  compact
                />
                <textarea
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Describe their vibe, their look, and the energy they carry…"
                  rows={5}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 resize-none leading-relaxed transition-colors"
                />
                <button
                  onClick={() => onShowPresenceDrawer(true)}
                  className="flex items-center gap-1.5 text-xs text-primary/50 hover:text-primary/70 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Help me describe the presence I'm looking for
                </button>

                {characterSections.length > 0 && (
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
                                isCreationMode
                                creationName={creationName}
                                onCreationNameChange={onCreationNameChange}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* ── Step 3: The Role + Backstory ── */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">Role</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {ROLES.filter(r => !isMinor || r.value !== 'romantic').map(role => (
                      <button
                        key={role.value}
                        onClick={() => { onStudioRoleChange(role.value); sfx.tapSelect(); }}
                        className={cn(
                          'flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-medium transition-all',
                          studioRole === role.value
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

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/45 transition-colors py-1">
                    <span>Backstory</span>
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={backstory}
                        onChange={(e) => onBackstoryChange(e.target.value)}
                        placeholder="Their origin, how you met, or any lore…"
                        rows={4}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-primary/30 resize-none leading-relaxed transition-colors"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <BackstoryQualityWhisper text={backstory} />
                        <button
                          type="button"
                          onClick={() => { setAssistOpen(true); sfx.tapSelect(); }}
                          className="flex items-center gap-1.5 text-[11px] text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors px-2 py-1 rounded-md hover:bg-[#D4AF37]/10"
                        >
                          <Wand2 className="h-3 w-3" />
                          <span>Help me write this</span>
                        </button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 bg-black/60 backdrop-blur-md" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 28px)' }}>
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onUploadPhoto}
            className="rounded-xl h-12 px-3 border-white/15 text-white/70 bg-transparent hover:bg-white/10"
            disabled={creating}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <button
            onClick={handleContinue}
            disabled={creating || !canContinue}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-white font-bold text-sm tracking-[0.05em] transition-all',
              canContinue && !creating ? 'opacity-100' : 'opacity-40',
            )}
            style={{
              background: canContinue
                ? 'linear-gradient(135deg, hsl(18 85% 58%), hsl(350 60% 55%), hsl(262 55% 58%))'
                : 'hsla(0,0%,100%,0.08)',
              boxShadow: canContinue ? '0 4px 20px hsl(18 85% 58% / 0.35)' : undefined,
            }}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {buttonLabel}
          </button>
        </div>
      </div>

      {/* Presence Drawer */}
      <PresenceDrawer
        open={showPresenceDrawer}
        userName={profileUserName}
        userIsMinor={isMinor}
        isEditMode={false}
        onClose={() => onShowPresenceDrawer(false)}
        onFill={(desc, style) => {
          onDescriptionChange(desc);
          onSelectSingle('style', style);
          onShowPresenceDrawer(false);
        }}
      />

      <BackstoryAssistSheet
        open={assistOpen}
        onOpenChange={setAssistOpen}
        companionName={creationName}
        gender={creationGender}
        personality={creationEnergy}
        connectionMode={studioRole}
        bio={description}
        currentDraft={backstory}
        onApply={onBackstoryChange}
      />
    </div>
  );
}
