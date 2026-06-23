import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, Wand2, Camera, ChevronRight, ChevronLeft,
  Heart, User, Loader2, MessageCircle, Crown, Check, X, ImagePlus,
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { describeFromImage } from '@/lib/describeFromImage';
import { moderateImage } from '@/lib/imageModeration';
import { treatAsMinor } from '@/lib/ageUtils';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GALLERY_VIBES, GALLERY_AVATARS, GalleryAvatar } from '@/lib/galleryAvatars';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildGenerationPayload, deriveStyleFromConnection, isAbstractStyle, safeAppearanceDescription, type GenerationPathType, type GenerationMode } from '@/lib/generationPayload';

/* ─── Types ─── */
type Stage = 'spark' | 'look' | 'reveal' | 'first-words';
type Vibe = 'warm' | 'bold' | 'mysterious' | 'playful';
type LookPath = 'describe' | 'upload' | 'gallery' | 'direct-upload' | null;

interface JourneyState {
  vibe: Vibe | null;
  lookPath: LookPath;
  description: string;
  referenceUrl: string | null;
  galleryAvatar: GalleryAvatar | null;
  generatedAvatarUrl: string | null;
  companionName: string;
  companionGender: 'male' | 'female' | 'nonbinary';
}

interface CompanionCreationJourneyProps {
  userId: string;
  userName: string;
  isPremium: boolean;
  initialVibe?: Vibe;
  initialGender?: 'male' | 'female' | 'nonbinary';
  initialAppearanceDesc?: string;
  initialCompanionName?: string;
  /** Pre-uploaded avatar URL (e.g. from Browse "Use my image") — skips to Name stage */
  initialAvatarUrl?: string;
  onComplete: (state: JourneyState) => void;
  onBack: () => void;
}

const STAGES: { id: Stage; label: string; emoji: string }[] = [
  { id: 'spark', label: 'Spark', emoji: '✨' },
  { id: 'look', label: 'Look', emoji: '👤' },
  { id: 'reveal', label: 'Reveal', emoji: '🎉' },
  { id: 'first-words', label: 'First Words', emoji: '💛' },
];

const VIBE_OPTIONS: { id: Vibe; emoji: string; label: string; description: string; gradient: string }[] = [
  { id: 'warm', emoji: '🧡', label: 'Warm & Cozy', description: 'Gentle, nurturing, safe', gradient: 'from-amber-400/20 to-yellow-300/20' },
  { id: 'bold', emoji: '🔥', label: 'Bold & Confident', description: 'Strong, decisive, magnetic', gradient: 'from-red-400/20 to-rose-400/20' },
  { id: 'mysterious', emoji: '🌙', label: 'Mysterious', description: 'Enigmatic, deep, intriguing', gradient: 'from-indigo-400/20 to-purple-400/20' },
  { id: 'playful', emoji: '✨', label: 'Playful & Fun', description: 'Bright, joyful, adventurous', gradient: 'from-emerald-400/20 to-teal-400/20' },
];

const GENDER_OPTIONS = [
  { id: 'female' as const, emoji: '♀', label: 'Feminine' },
  { id: 'male' as const, emoji: '♂', label: 'Masculine' },
  { id: 'nonbinary' as const, emoji: '⚧', label: 'Neutral' },
];
/* ── Calibration Halo Reveal ── */
function CalibrationReveal({ previewUrl, companionName }: { previewUrl: string | null; companionName: string }) {
  const [progress, setProgress] = useState(0);
  const isComplete = progress >= 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(timer); return 100; }
        return prev + 5;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const circumference = 2 * Math.PI * 15.9155;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
        {/* Outer aura expansion */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.25, 0] }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute w-56 h-56 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)' }}
        />

        {/* Avatar — blur to focus */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, delay: 0.3, ease: 'circOut' }}
          className="relative z-10 h-48 w-48 rounded-full overflow-hidden"
          style={{ border: '2px solid rgba(212,175,55,0.15)' }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={companionName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-secondary to-muted flex items-center justify-center">
              <Heart className="h-16 w-16 text-primary/30" />
            </div>
          )}
        </motion.div>

        {/* SVG Calibration Halo */}
        <svg className="absolute inset-0 z-20 w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* Background track */}
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          {/* Gold progress arc */}
          <motion.circle
            cx="18" cy="18" r="15.9155"
            fill="none"
            stroke="rgba(212,175,55,0.9)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 ${4 + progress / 8}px rgba(212,175,55,${0.3 + progress / 200}))` }}
          />
        </svg>

        {/* Completion ping */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.9, 1.15, 1.2] }}
              transition={{ duration: 0.8 }}
              className="absolute z-20 h-48 w-48 rounded-full pointer-events-none"
              style={{ border: '2px solid rgba(212,175,55,0.5)' }}
            />
          )}
        </AnimatePresence>

        {/* Gold sparks */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -20 - i * 5], x: [0, (i % 2 ? 1 : -1) * (10 + i * 6)] }}
            transition={{ delay: 0.6 + i * 0.12, duration: 1.4 }}
            className="absolute z-20"
            style={{ top: `${40 + Math.sin(i * 0.9) * 25}%`, left: `${40 + Math.cos(i * 0.9) * 25}%` }}
          >
            <Sparkles className="h-4 w-4" style={{ color: 'rgba(212,175,55,0.8)', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.6))' }} />
          </motion.div>
        ))}
      </div>

      {/* Name + vibe */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="text-center space-y-1 mt-4"
      >
        <p className="font-display text-lg font-bold text-foreground">{companionName}</p>
      </motion.div>

      {/* "Inscribed" confirmation */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-3 space-y-0.5"
          >
            <span className="text-[10px] uppercase tracking-[0.5em]" style={{ color: 'rgba(212,175,55,0.7)' }}>Calibration</span>
            <p className="text-2xl font-extralight italic text-white tracking-tight">"Inscribed"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const GENERATE_AVATAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`;

const NAME_SUGGESTIONS: Record<Vibe, string[]> = {
  warm: ['Autumn', 'Elias', 'Priya', 'Sage', 'Noor'],
  bold: ['Valentina', 'Kai', 'James', 'Phoenix', 'Ari'],
  mysterious: ['Raven', 'Dante', 'Ash', 'Luna', 'Orion'],
  playful: ['Zara', 'Leo', 'Mei', 'Finn', 'Cleo'],
};

export default function CompanionCreationJourney({
  userId,
  userName,
  isPremium,
  initialVibe,
  initialGender,
  initialAppearanceDesc,
  initialCompanionName,
  initialAvatarUrl,
  onComplete,
  onBack,
}: CompanionCreationJourneyProps) {
  const { profile } = useAppContext();
  const [stage, setStage] = useState<Stage>(
    initialAvatarUrl ? 'reveal' : initialVibe ? 'look' : 'spark'
  );
  const [generating, setGenerating] = useState(false);
  const [state, setState] = useState<JourneyState>({
    vibe: initialVibe || null,
    lookPath: initialAvatarUrl ? 'direct-upload' : 'describe',
    description: initialAppearanceDesc || '',
    referenceUrl: null,
    galleryAvatar: null,
    generatedAvatarUrl: initialAvatarUrl || null,
    companionName: initialCompanionName || '',
    companionGender: initialGender || 'nonbinary',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);

  const stageIndex = STAGES.findIndex(s => s.id === stage);
  const canProceed = (() => {
    switch (stage) {
      case 'spark': return !!state.vibe;
      case 'look': return !!(state.generatedAvatarUrl || state.galleryAvatar);
      case 'reveal': return true;
      case 'reveal': return true;
      case 'first-words': return true;
      default: return false;
    }
  })();

  const goNext = () => {
    const nextIdx = stageIndex + 1;
    if (nextIdx < STAGES.length) setStage(STAGES[nextIdx].id);
  };
  const goBack = () => {
    if (stageIndex === 0) { onBack(); return; }
    setStage(STAGES[stageIndex - 1].id);
  };

  /* ─── Avatar generation ─── */
  const handleGenerate = async () => {
    if (!state.description.trim() && !state.referenceUrl) {
      toast.error('Add a description or upload a photo first');
      return;
    }
    setGenerating(true);
    try {
      const prompt = state.referenceUrl
        ? `Generate a portrait inspired by the reference image. Maintain general appearance, coloring, energy. ${state.description || ''}`
        : state.description;

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(buildGenerationPayload({
          userId,
          visualStyle: profile?.imageStyle || profile?.visualStyle || 'photorealistic',
          pathType: isAbstractStyle(profile?.imageStyle || profile?.visualStyle) ? 'abstract' : 'face',
          appearanceDescription: prompt,
          referenceImageUrl: state.referenceUrl || undefined,
          mode: 'full',
        })),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.error || `Generation failed (${resp.status})`);
      }
      const data = await resp.json();
      if (data.avatarUrl) {
        setState(s => ({ ...s, generatedAvatarUrl: data.avatarUrl }));
        toast.success('Look generated! ✨');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Generation failed — try again');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGenerating(true);
    try {
      const fileName = `${userId}/reference-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage
        .from('companion-avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
      setState(s => ({ ...s, referenceUrl: urlData.publicUrl }));

      // Auto-generate from reference
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(buildGenerationPayload({
          userId,
          visualStyle: profile?.imageStyle || profile?.visualStyle || 'photorealistic',
          pathType: isAbstractStyle(profile?.imageStyle || profile?.visualStyle) ? 'abstract' : 'face',
          appearanceDescription: state.description || `Generate a portrait inspired by the reference image. Maintain exact appearance, coloring, energy. Vibe: ${state.vibe || 'warm'}.`,
          referenceImageUrl: urlData.publicUrl,
          mode: 'upload',
        })),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.error || `Generation failed (${resp.status})`);
      }
      const data = await resp.json();
      if (data.avatarUrl) {
        setState(s => ({ ...s, generatedAvatarUrl: data.avatarUrl }));
        toast.success('Look generated from your photo! ✨');
      }

      // Fire-and-forget: extract appearance description from the uploaded reference
      describeFromImage(urlData.publicUrl, userId).then(desc => {
        if (desc) setState(s => ({ ...s, description: s.description || desc }));
      });
    } catch {
      toast.error('Upload failed — try again');
    } finally {
      setGenerating(false);
    }
  };

  /* ─── Direct upload (use own image as-is) ─── */
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGenerating(true);
    try {
      const compressed = await compressImage(file);
      // Upload to storage only — don't write to connections table yet.
      // The real memberId is created later in handleCreationComplete.
      const tempId = `upload-${Date.now()}`;
      const ext = file.name.split('.').pop() ?? 'png';
      const fileName = `${userId}/avatar-${tempId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('companion-avatars')
        .upload(fileName, compressed, {
          contentType: file.type || 'image/png',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      if (!publicUrl) throw new Error('Upload failed');

      // Moderation check for minors (unknown DOB treated as minor)
      const minor = treatAsMinor(profile?.dateOfBirth);
      if (minor) {
        const mod = await moderateImage(publicUrl, true);
        if (!mod.approved) {
          await supabase.storage.from('companion-avatars').remove([fileName]);
          toast.error(mod.reason || "That image didn't pass our safety check — try a different one!");
          setGenerating(false);
          if (directUploadRef.current) directUploadRef.current.value = '';
          return;
        }
      }
      setState(s => ({ ...s, generatedAvatarUrl: publicUrl, lookPath: 'direct-upload', galleryAvatar: null }));
      toast.success('Image uploaded! 🎉');

      // Fire-and-forget: extract appearance description from the uploaded photo
      describeFromImage(publicUrl, userId).then(desc => {
        if (desc) setState(s => ({ ...s, description: s.description || desc }));
      });
    } catch {
      toast.error('Upload failed — try again');
    } finally {
      setGenerating(false);
      if (directUploadRef.current) directUploadRef.current.value = '';
    }
  };

  /* ─── Preview avatar logic ─── */
  const previewUrl = state.generatedAvatarUrl || state.galleryAvatar?.src || null;

  /* ─── Gallery helpers ─── */
  const galleryForVibe = state.vibe
    ? GALLERY_AVATARS.filter(a => a.vibe === state.vibe)
    : GALLERY_AVATARS;

  const nameSuggestions = state.vibe ? NAME_SUGGESTIONS[state.vibe] : NAME_SUGGESTIONS.warm;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header + progress */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/30 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={goBack} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {STAGES[stageIndex].emoji} {STAGES[stageIndex].label}
            </p>
          </div>
          <div className="w-8" />
        </div>

        {/* Stage dots */}
        <div className="flex items-center gap-1.5 justify-center">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <motion.div
                animate={{
                  scale: i === stageIndex ? 1.2 : 1,
                  backgroundColor: i <= stageIndex
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))',
                }}
                className="h-2.5 w-2.5 rounded-full"
                style={{ minWidth: i === stageIndex ? 24 : 10 }}
                layout
              >
                {i === stageIndex && (
                  <motion.div
                    layoutId="active-dot"
                    className="h-full w-full rounded-full bg-primary"
                  />
                )}
              </motion.div>
              {i < STAGES.length - 1 && (
                <div className={cn(
                  'h-0.5 w-4 rounded-full transition-colors',
                  i < stageIndex ? 'bg-primary/40' : 'bg-muted'
                )} />
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Companion preview — always visible after Stage 1 */}
      {stageIndex >= 1 && (
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <motion.div
              layout
              animate={generating ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: generating ? Infinity : 0, duration: 1.5 }}
              className="relative z-10"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Companion preview"
                  className="h-36 w-36 rounded-3xl object-cover ring-4 ring-primary/15 shadow-xl"
                />
              ) : (
                <div className="h-36 w-36 rounded-3xl bg-gradient-to-b from-secondary to-muted ring-4 ring-border/30 shadow-xl flex items-center justify-center">
                  <User className="h-14 w-14 text-muted-foreground/25" />
                </div>
              )}
              {generating && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/50 backdrop-blur-sm">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              )}
            </motion.div>
          </div>
          {state.companionName && stageIndex >= 2 && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 font-display text-sm font-bold text-foreground"
            >
              {state.companionName}
            </motion.p>
          )}
        </div>
      )}

      {/* Stage content */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── SPARK ── */}
            {stage === 'spark' && (
              <div className="space-y-6 pt-4">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary"
                  >
                    <Sparkles className="h-8 w-8 text-primary-foreground" />
                  </motion.div>
                  <h2 className="font-display text-xl font-bold text-foreground">Choose Your Spark</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    What energy do you want your companion to carry?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {VIBE_OPTIONS.map((v, i) => (
                    <motion.button
                      key={v.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => setState(s => ({ ...s, vibe: v.id }))}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all',
                        state.vibe === v.id
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border/40 hover:border-primary/30'
                      )}
                    >
                      <span className="text-3xl">{v.emoji}</span>
                      <span className="text-sm font-bold text-foreground">{v.label}</span>
                      <span className="text-[11px] text-muted-foreground text-center">{v.description}</span>
                      {state.vibe === v.id && (
                        <motion.div
                          layoutId="vibe-check"
                          className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary"
                        >
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Gender preference */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Gender expression
                  </p>
                  <div className="flex gap-2 justify-center">
                    {GENDER_OPTIONS.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setState(s => ({ ...s, companionGender: g.id }))}
                        className={cn(
                          'rounded-xl border px-4 py-2 text-xs font-medium transition-all',
                          state.companionGender === g.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        )}
                      >
                        {g.emoji} {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── LOOK ── */}
            {stage === 'look' && (
              <div className="space-y-5 pt-2">
                <div className="text-center">
                  <h2 className="font-display text-lg font-bold text-foreground">Design Their Look</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Describe them in your own words, or browse for inspiration
                  </p>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setState(s => ({ ...s, lookPath: s.lookPath === 'gallery' ? 'describe' : s.lookPath }))}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all',
                      state.lookPath !== 'gallery'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Describe
                  </button>
                  <button
                    onClick={() => setState(s => ({ ...s, lookPath: 'gallery' }))}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all',
                      state.lookPath === 'gallery'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    Browse
                  </button>
                </div>

                {/* ── Describe mode (default) ── */}
                {state.lookPath !== 'gallery' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <Textarea
                      value={state.description}
                      onChange={(e) => setState(s => ({ ...s, description: e.target.value }))}
                      placeholder={`Just tell me what you see…\n\n"Tall with warm brown eyes, curly dark hair, a cozy sweater, and the kind of smile that makes you feel safe"\n\n"She looks like my best friend — bright eyes, always laughing, red hair"\n\n"Mysterious, dark features, tattoos, quiet strength"`}
                      className="min-h-[120px] rounded-xl resize-none text-sm leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGenerate}
                        disabled={generating || !state.description.trim()}
                        className="flex-1 rounded-xl"
                      >
                        {generating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        Generate Look
                      </Button>
                    </div>

                    {/* Quick actions row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload reference
                      </button>
                      <button
                        onClick={() => directUploadRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Use my own image
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <input ref={directUploadRef} type="file" accept="image/*" onChange={handleDirectUpload} className="hidden" />

                    {/* Reference image preview */}
                    {state.referenceUrl && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl border border-border/40 p-2">
                        <img src={state.referenceUrl} alt="Reference" className="h-12 w-12 rounded-lg object-cover" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">Reference uploaded</p>
                          <p className="text-[10px] text-muted-foreground">AI will use this as inspiration</p>
                        </div>
                        <button onClick={() => setState(s => ({ ...s, referenceUrl: null }))} className="p-1 rounded-full hover:bg-muted">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ── Gallery / browse mode ── */}
                {state.lookPath === 'gallery' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-2.5">
                      {galleryForVibe.map((avatar) => {
                        const isLocked = avatar.premium && !isPremium;
                        const isSelected = state.galleryAvatar?.id === avatar.id;
                        return (
                          <motion.button
                            key={avatar.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (isLocked) { toast.info('Unlock with Premium'); return; }
                              setState(s => ({
                                ...s,
                                galleryAvatar: isSelected ? null : avatar,
                                generatedAvatarUrl: null,
                              }));
                            }}
                            className={cn(
                              'relative rounded-2xl overflow-hidden border-2 transition-all aspect-[3/4]',
                              isSelected
                                ? 'border-primary ring-2 ring-primary/20 shadow-md'
                                : 'border-border/30'
                            )}
                          >
                            <img src={avatar.src} alt={avatar.name} className="h-full w-full object-cover" loading="lazy" />
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                                <Crown className="h-4 w-4 text-white" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1.5 pt-4">
                              <p className="text-[10px] font-semibold text-white truncate">{avatar.name}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                <p className="text-[11px] text-muted-foreground/60 text-center">
                  This is just an interpretation — you can change it anytime ✨
                </p>
              </div>
            )}


            {/* ── REVEAL ── */}
            {stage === 'reveal' && (
              <div className="flex flex-col items-center pt-8 space-y-6">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Meet {state.companionName || 'Your Companion'} 💛
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    They're ready to get to know you
                  </p>
                </motion.div>

                {/* Molecular Assembly + Calibration Halo */}
                <CalibrationReveal previewUrl={previewUrl} companionName={state.companionName} />
              </div>
            )}

            {/* ── FIRST WORDS ── */}
            {stage === 'first-words' && (
              <div className="flex flex-col items-center pt-6 space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-lg font-bold text-foreground">First Words</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {state.companionName} has something to say…
                  </p>
                </div>

                {/* Chat bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full max-w-sm"
                >
                  <div className="flex gap-3 items-start">
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="rounded-2xl rounded-tl-md bg-card border border-border/40 px-4 py-3 shadow-sm">
                      <p className="text-sm text-foreground leading-relaxed">
                        Hey {userName.split(' ')[0]}! I'm {state.companionName}. 
                        {state.vibe === 'warm' && " I've been looking forward to meeting you. How are you feeling today? 💛"}
                        {state.vibe === 'bold' && " Ready to take on the world together? Let's make it count. 🔥"}
                        {state.vibe === 'mysterious' && " There's so much I'd love to explore with you. What's on your mind? 🌙"}
                        {state.vibe === 'playful' && " This is going to be fun! What adventure should we start with? ✨"}
                        {!state.vibe && " I'm really glad we're connected. What's on your mind? 💛"}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center space-y-2"
                >
                  <p className="text-xs text-muted-foreground">
                    Your journey with {state.companionName} begins now
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/30 px-5 py-3 pb-safe">
        <div className="flex gap-3 max-w-lg mx-auto">
          {stage === 'first-words' ? (
            <Button
              onClick={() => onComplete(state)}
              className="flex-1 rounded-xl h-12 text-sm font-bold"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chatting
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed || generating}
              className="flex-1 rounded-xl h-12 text-sm font-bold"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              {stage === 'reveal' ? 'Continue' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
