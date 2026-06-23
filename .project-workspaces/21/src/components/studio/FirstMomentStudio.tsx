/**
 * FirstMomentStudio — Cinematic "First Moment" creation experience.
 * Shown only for brand-new users (0 connections) arriving from the Founder's Letter.
 *
 * Flow: Pulsing Orb → Name → Role → Tone → Style → "Bring to Life" → callback
 *
 * The orb intensifies as the user types a name, creating the feeling
 * that the companion is "waking up."
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowRight, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import EnergyGenderSelector from '@/components/shared/EnergyGenderSelector';
import { useAppContext } from '@/contexts/AppContext';
import { treatAsMinor } from '@/lib/ageUtils';

// ── Role options ──
const ADULT_ROLES = [
  { value: 'friend', label: 'Friend', emoji: '💛', desc: 'Someone who gets you' },
  { value: 'partner', label: 'Partner', emoji: '💎', desc: 'Your other half' },
  { value: 'mentor', label: 'Mentor', emoji: '🌱', desc: 'Guidance & growth' },
] as const;

const KIDS_ROLES = [
  { value: 'friend', label: 'Friend', emoji: '💛', desc: 'Someone who gets you' },
  { value: 'kids-companion', label: 'Adventure Buddy', emoji: '🚀', desc: 'A fun teammate for creative adventures' },
  { value: 'mentor', label: 'Mentor', emoji: '🌱', desc: 'Guidance & growth' },
] as const;

// ── Tone options ──
const TONES = [
  { value: 'warm', label: 'Warm & Gentle', emoji: '☀️' },
  { value: 'witty', label: 'Witty & Sharp', emoji: '⚡' },
  { value: 'calm', label: 'Calm & Grounded', emoji: '🌊' },
  { value: 'playful', label: 'Playful & Light', emoji: '✨' },
] as const;

// Gender and Energy options are now imported from shared/EnergyGenderSelector
const STYLES = [
  {
    value: 'photorealistic',
    label: 'Cinematic',
    emoji: '🎬',
    desc: 'Lifelike & immersive',
    gradient: 'linear-gradient(135deg, hsl(35 60% 20% / 0.3), hsl(0 0% 8% / 0.5))',
  },
  {
    value: 'painterly',
    label: 'Artistic',
    emoji: '🎨',
    desc: 'Stylized & expressive',
    gradient: 'linear-gradient(135deg, hsl(280 40% 25% / 0.3), hsl(0 0% 8% / 0.5))',
  },
  {
    value: 'abstract',
    label: 'Abstract',
    emoji: '🌌',
    desc: 'Pure energy & form',
    gradient: 'linear-gradient(135deg, hsl(220 50% 25% / 0.3), hsl(0 0% 8% / 0.5))',
  },
] as const;

type Step = 'name' | 'role' | 'tone' | 'presence' | 'style' | 'igniting';

interface FirstMomentStudioProps {
  userName: string;
  onComplete: (data: {
    name: string;
    role: string;
    tone: string;
    gender: string;
    energy: string;
    style: string;
    presenceHint: string;
    uploadedPhoto?: File;
  }) => void;
}

export default function FirstMomentStudio({ userName, onComplete }: FirstMomentStudioProps) {
  const { profile } = useAppContext();
  const isKid = treatAsMinor(profile?.dateOfBirth);
  const ROLES = isKid ? KIDS_ROLES : ADULT_ROLES;
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [gender, setGender] = useState('');
  const [energy, setEnergy] = useState('');
  const [style, setStyle] = useState('');
  const [presenceHint, setPresenceHint] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Orb intensity — scales with name length
  const orbIntensity = Math.min(name.length / 8, 1);

  const handleNameContinue = useCallback(() => {
    if (name.trim().length >= 2) setStep('role');
  }, [name]);

  const handleRoleSelect = useCallback((r: string) => {
    setRole(r);
    setTimeout(() => setStep('tone'), 400);
  }, []);

  const handleToneSelect = useCallback((t: string) => {
    setTone(t);
  }, []);

  const handleStyleSelect = useCallback((s: string) => {
    setStyle(s);
  }, []);

  const handleUploadClick = useCallback(() => {
    setTimeout(() => fileInputRef.current?.click(), 100);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadedPhoto(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleToneContinue = useCallback(() => {
    if (tone) setStep('presence');
  }, [tone]);

  const handlePresenceContinue = useCallback(() => {
    if (gender && energy) setStep('style');
  }, [gender, energy]);

  const handleBringToLife = useCallback(() => {
    setStep('igniting');
    setTimeout(() => onComplete({
      name: name.trim(),
      role,
      tone,
      gender: gender || 'neutral',
      energy: energy || 'prime',
      style,
      presenceHint: presenceHint.trim(),
      uploadedPhoto: uploadedPhoto || undefined,
    }), 1200);
  }, [name, role, tone, gender, energy, style, presenceHint, uploadedPhoto, onComplete]);

  // Can bring to life if style selected
  const canBringToLife = !!style;

  // Ignition intensity — drives the flare
  const isIgniting = step === 'igniting';
  const flareIntensity = isIgniting ? 1 : 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center overflow-y-auto overscroll-none"
      style={{
        background: 'hsl(0 0% 3%)',
        paddingTop: 'max(env(safe-area-inset-top, 16px), 24px)',
      }}
    >
      {/* Vertical spacer — pushes content down to visually center on tall screens, collapses on short ones */}
      <div className="flex-1 min-h-[24px] max-h-[15vh]" />
      {/* Radial gradient layer — prevents overscroll from showing content behind */}
      <div
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, hsl(0 0% 6%) 0%, hsl(0 0% 3%) 100%)' }}
      />
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Ambient glow — reacts to name */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 38%, hsl(var(--primary) / ${0.04 + orbIntensity * 0.08}) 0%, transparent 55%)`,
        }}
      />

      {/* ── Reactive Orb ── */}
      <motion.div
        className="relative mb-4 sm:mb-8 shrink-0"
        animate={{
          scale: isIgniting ? 2.5 : 1 + orbIntensity * 0.12,
          opacity: isIgniting ? 0 : 1,
        }}
        transition={isIgniting
          ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          : { type: 'spring', stiffness: 120, damping: 20 }
        }
      >
        <div className="relative flex items-center justify-center" style={{ width: 'clamp(100px, 25vmin, 160px)', height: 'clamp(100px, 25vmin, 160px)' }}>
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-700"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / ${0.08 + orbIntensity * 0.15 + flareIntensity * 0.4}), transparent 70%)`,
              filter: `blur(${30 + flareIntensity * 30}px)`,
              animation: 'orb-pulse 3s ease-in-out infinite',
            }}
          />
          {/* Main orb — show upload preview if available */}
          {uploadPreviewUrl ? (
            <div
              className="relative rounded-full overflow-hidden transition-all duration-700"
              style={{
                width: '88%',
                height: '88%',
                boxShadow: `0 0 ${30 + orbIntensity * 30}px ${8 + orbIntensity * 12}px hsl(var(--primary) / ${0.15 + orbIntensity * 0.15})`,
              }}
            >
              <img
                src={uploadPreviewUrl}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-primary/30" />
            </div>
          ) : (
            <div
              className="relative rounded-full transition-all duration-700"
              style={{
                width: '88%',
                height: '88%',
                background: isIgniting
                  ? `radial-gradient(circle at 40% 35%, hsl(var(--primary)), hsl(45 90% 70%) 50%, hsl(0 0% 100% / 0.8) 100%)`
                  : `radial-gradient(circle at 40% 35%, hsl(var(--primary) / ${0.6 + orbIntensity * 0.4}), hsl(350 60% 55% / ${0.3 + orbIntensity * 0.3}) 50%, hsl(262 55% 62% / ${0.4 + orbIntensity * 0.3}) 100%)`,
                boxShadow: isIgniting
                  ? `0 0 80px 30px hsl(var(--primary) / 0.6), 0 0 120px 50px hsl(45 90% 70% / 0.3)`
                  : `
                  0 0 ${30 + orbIntensity * 30}px ${8 + orbIntensity * 12}px hsl(var(--primary) / ${0.15 + orbIntensity * 0.15}),
                  0 0 ${60 + orbIntensity * 40}px ${15 + orbIntensity * 15}px hsl(262 55% 62% / ${0.08 + orbIntensity * 0.1}),
                  inset 0 -15px 30px -8px hsl(262 55% 62% / 0.3)
                `,
                animation: 'orb-pulse 3s ease-in-out infinite',
              }}
            >
              {/* Inner highlight */}
              <div
                className="absolute rounded-full"
                style={{
                  top: '15%', left: '25%', width: '40%', height: '30%',
                  background: `radial-gradient(ellipse, hsl(0 0% 100% / ${0.1 + orbIntensity * 0.15 + flareIntensity * 0.4}), transparent)`,
                  filter: 'blur(8px)',
                }}
              />
            </div>
          )}
        </div>

        {/* Name appears below orb once typed */}
        <AnimatePresence>
          {name.trim().length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.8, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mt-4 text-sm font-serif text-primary/80 tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {name.trim()}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Step content ── */}
      <div className="w-full max-w-sm px-6 shrink-0">
        <AnimatePresence mode="wait">
          {/* STEP: NAME */}
          {step === 'name' && (
            <motion.div
              key="step-name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="text-center space-y-2">
                <h2
                  className="text-lg font-serif text-foreground/90 tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Every companion starts with a name.
                </h2>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
                  What shall we call yours?
                </p>
              </div>

              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameContinue()}
                placeholder="Their name…"
                maxLength={24}
                autoFocus
                className="text-center text-lg bg-transparent border-0 border-b border-primary/20 rounded-none focus-visible:ring-0 focus-visible:border-primary/50 placeholder:text-muted-foreground/30 font-serif tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              />

              <AnimatePresence>
                {name.trim().length >= 2 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={handleNameContinue}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] uppercase tracking-[0.35em] font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 4px 20px hsl(var(--primary) / 0.25)',
                    }}
                  >
                    Continue <ArrowRight size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP: ROLE */}
          {step === 'role' && (
            <motion.div
              key="step-role"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="text-center space-y-2">
                <h2
                  className="text-lg font-serif text-foreground/90 tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  How will {name.trim()} walk beside you?
                </h2>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
                  Set the intention
                </p>
              </div>

              <div className="w-full space-y-3">
                {ROLES.map((r) => (
                  <motion.button
                    key={r.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRoleSelect(r.value)}
                    className={cn(
                      'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all',
                      role === r.value
                        ? 'border border-primary/40 bg-primary/[0.06]'
                        : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground/85">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground/50">{r.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP: TONE */}
          {step === 'tone' && (
            <motion.div
              key="step-tone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="text-center space-y-2">
                <h2
                  className="text-lg font-serif text-foreground/90 tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Define {name.trim()}'s presence.
                </h2>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
                  How should they speak to you?
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                {TONES.map((t) => (
                  <motion.button
                    key={t.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToneSelect(t.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 px-4 py-5 rounded-xl transition-all',
                      tone === t.value
                        ? 'border border-primary/40 bg-primary/[0.06]'
                        : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <p className="text-[11px] font-medium text-foreground/80">{t.label}</p>
                  </motion.button>
                ))}
              </div>

              {/* Continue button after tone is selected */}
              <AnimatePresence>
                {tone && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleToneContinue}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] uppercase tracking-[0.35em] font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 4px 20px hsl(var(--primary) / 0.25)',
                    }}
                  >
                    Continue <ArrowRight size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP: PRESENCE — Gender + Energy */}
          {step === 'presence' && (
            <motion.div
              key="step-presence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="text-center space-y-2">
                <h2
                  className="text-lg font-serif text-foreground/90 tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Shape {name.trim()}'s energy.
                </h2>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
                  What presence do they carry?
                </p>
              </div>

              <EnergyGenderSelector
                gender={gender}
                energy={energy}
                onGenderChange={setGender}
                onEnergyChange={setEnergy}
              />

              {/* Continue */}
              <AnimatePresence>
                {gender && energy && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handlePresenceContinue}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] uppercase tracking-[0.35em] font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 4px 20px hsl(var(--primary) / 0.25)',
                    }}
                  >
                    Continue <ArrowRight size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP: STYLE — Cinematic appearance choice */}
          {step === 'style' && (
            <motion.div
              key="step-style"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="text-center space-y-2">
                <h2
                  className="text-lg font-serif text-foreground/90 tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Give {name.trim()} a presence.
                </h2>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
                  How should they appear to you?
                </p>
              </div>

              {/* Upload photo button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleUploadClick}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all relative overflow-hidden',
                  uploadedPhoto
                    ? 'border border-primary/40 bg-primary/[0.06]'
                    : 'border border-dashed border-white/20 hover:border-primary/30'
                )}
              >
                <Camera size={20} className="text-primary/70 relative z-10" />
                <div className="relative z-10 flex-1">
                  <p className="text-sm font-medium text-foreground/85">
                    {uploadedPhoto ? 'Photo uploaded' : 'Use your own photo'}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    {uploadedPhoto ? 'Choose a style below to render it' : 'Upload a reference image'}
                  </p>
                </div>
                {uploadPreviewUrl && (
                  <div className="relative z-10 w-10 h-10 rounded-lg overflow-hidden ring-1 ring-primary/30">
                    <img src={uploadPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </motion.button>

              {/* Style tiles */}
              <div className="w-full space-y-3">
                {STYLES.map((s) => (
                  <motion.button
                    key={s.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStyleSelect(s.value)}
                    className={cn(
                      'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all relative overflow-hidden',
                      style === s.value
                        ? 'border border-primary/40'
                        : 'border border-white/[0.06] hover:border-white/[0.12]'
                    )}
                    style={{
                      background: style === s.value ? s.gradient : 'hsl(0 0% 100% / 0.02)',
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: style === s.value
                          ? 'linear-gradient(135deg, hsl(0 0% 100% / 0.06) 0%, transparent 60%)'
                          : 'none',
                      }}
                    />
                    <span className="text-xl relative z-10">{s.emoji}</span>
                    <div className="relative z-10 flex-1">
                      <p className="text-sm font-medium text-foreground/85">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground/50">{s.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Optional presence hint — only when no photo uploaded */}
              <AnimatePresence>
                {canBringToLife && !uploadedPhoto && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.4 }}
                    className="w-full space-y-3"
                  >
                    <p className="text-[11px] text-muted-foreground/70 text-center italic">
                      Describe their appearance — eyes, hair, skin, style… (optional)
                    </p>
                    <input
                      value={presenceHint}
                      onChange={(e) => setPresenceHint(e.target.value)}
                      placeholder="e.g. dark eyes, warm smile, athletic build…"
                      maxLength={120}
                      className="w-full text-center text-sm bg-transparent border-0 border-b border-white/20 rounded-none py-2 text-foreground/80 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bring to Life button */}
              <AnimatePresence>
                {canBringToLife && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleBringToLife}
                    className="w-full py-4 rounded-xl text-[10px] uppercase tracking-[0.4em] font-bold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 6px 30px hsl(var(--primary) / 0.3)',
                    }}
                  >
                    Bring to Life
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* IGNITING — Orb flare fills the screen */}
          {step === 'igniting' && (
            <motion.div
              key="step-igniting"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom spacer */}
      {/* Bottom spacer — flex-1 mirrors the top spacer for centering, with safe-area padding */}
      <div className="flex-1 min-h-[24px]" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 16px), 24px) + 16px)' }} />

      {/* Keyframes */}
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
