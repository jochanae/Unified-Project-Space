import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Users, Heart, Sparkles, Zap, Shield, Flame, Plus, Trash2, FileText, Video, Music, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ─────────────── Types ─────────────── */

export type RoomType = 'spatial' | 'fireside';
export type CircleType = 'personal' | 'social' | 'kids' | 'circle' | 'service' | 'fireside';

const EMOJI_OPTIONS = ['🌿', '🔥', '📚', '🎵', '💪', '🧘', '🎮', '🍳', '✈️', '🐾', '🎨', '🌊', '💡', '🤝', '🌙', '⛪', '🏠', '🎯'];

/* ─────────────── Room Type Cards ─────────────── */

interface RoomTypeConfig {
  type: RoomType;
  emoji: string;
  label: string;
  tagline: string;
  features: string[];
  gradient: string;
}

const ROOM_TYPES: RoomTypeConfig[] = [
  {
    type: 'spatial',
    emoji: '🌌',
    label: 'Hangout',
    tagline: 'Physics-based orb world. Floating avatars, fireflies, ambient vibes.',
    features: ['Orb avatars', 'Physics engine', 'Fireflies', 'Joystick navigation'],
    gradient: 'linear-gradient(135deg, hsl(270 40% 14%), hsl(260 30% 20%))',
  },
  {
    type: 'fireside',
    emoji: '🔥',
    label: 'Fireside',
    tagline: 'Intimate circle. Fixed ring seating, warm tones, turn-based sharing.',
    features: ['Ring seating', 'Pass the Mic', 'Warm ambience', '3–8 people'],
    gradient: 'linear-gradient(135deg, hsl(25 60% 14%), hsl(15 50% 18%))',
  },
];

/* ─────────────── Sub-mode configs ─────────────── */

interface SubModeConfig {
  type: CircleType;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  defaultEmoji: string;
}

const SPATIAL_MODES: SubModeConfig[] = [
  { type: 'personal', label: 'Personal', tagline: 'Solo reflection, journaling, self-care', icon: <Heart className="h-4 w-4" />, defaultEmoji: '🌙' },
  { type: 'social', label: 'Social', tagline: 'Hangouts, gaming, fun with friends', icon: <Zap className="h-4 w-4" />, defaultEmoji: '🔥' },
];

const FIRESIDE_MODES: SubModeConfig[] = [
  { type: 'fireside', label: 'Gathering', tagline: 'Warm circle chat, intimate sharing', icon: <Flame className="h-4 w-4" />, defaultEmoji: '🔥' },
  { type: 'circle', label: 'Discussion', tagline: 'Structured group conversation', icon: <Users className="h-4 w-4" />, defaultEmoji: '🤝' },
  { type: 'service', label: 'Service', tagline: 'Speaker + audience, services, lectures', icon: <Shield className="h-4 w-4" />, defaultEmoji: '📚' },
];

/* ─────────────── Firefly Preview ─────────────── */

function FireflyPreview({ count = 10, warm = false }: { count?: number; warm?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + Math.random() * 3,
            height: 3 + Math.random() * 3,
            background: warm
              ? `hsl(${20 + Math.random() * 25} 90% 65% / 0.7)`
              : `hsl(${40 + Math.random() * 20} 80% 70% / 0.6)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, (Math.random() - 0.5) * 60, 0],
            y: [0, (Math.random() - 0.5) * 40, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────── Main Wizard ─────────────── */

interface CircleArchitectWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    emoji: string;
    description: string;
    circleType: CircleType;
    defaultLayout: string;
    roomType: RoomType;
  }) => Promise<{ id: string } | void>;
}

type WizardStep = 'roomType' | 'details' | 'settings' | 'preview' | 'lobby';

export default function CircleArchitectWizard({ open, onClose, onSubmit }: CircleArchitectWizardProps) {
  const [step, setStep] = useState<WizardStep>('roomType');
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [circleType, setCircleType] = useState<CircleType | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🌿');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdCircleId, setCreatedCircleId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const wizardFileRef = useRef<HTMLInputElement>(null);

  // Lobby state
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [handouts, setHandouts] = useState<{ label: string; url: string }[]>([]);
  const [guestbookEnabled, setGuestbookEnabled] = useState(true);

  const subModes = roomType === 'spatial' ? SPATIAL_MODES : roomType === 'fireside' ? FIRESIDE_MODES : [];

  const resetAndClose = () => {
    setStep('roomType');
    setRoomType(null);
    setCircleType(null);
    setName('');
    setEmoji('🌿');
    setDescription('');
    setCreatedCircleId(null);
    setWelcomeMessage('');
    setVideoUrl('');
    setMusicUrl('');
    setHandouts([]);
    setGuestbookEnabled(true);
    onClose();
  };

  const handleBack = () => {
    if (step === 'lobby') setStep('preview');
    else if (step === 'preview') setStep('settings');
    else if (step === 'settings') setStep('details');
    else if (step === 'details') { setStep('roomType'); setRoomType(null); }
  };

  const handleCreate = async () => {
    if (!roomType || !circleType || !name.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: name.trim(),
        emoji,
        description: description.trim(),
        circleType,
        defaultLayout: 'spatial',
        roomType: roomType === 'fireside' ? 'spatial' : roomType, // Both use spatial engine
      });
      if (result && 'id' in result && result.id) {
        setCreatedCircleId(result.id);
        setStep('lobby');
      } else {
        resetAndClose();
      }
    } catch {
      // error handled upstream
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLobbyConfig = async () => {
    if (!createdCircleId) { resetAndClose(); return; }
    const hasContent = welcomeMessage.trim() || videoUrl.trim() || musicUrl.trim() || handouts.length > 0;
    if (hasContent) {
      await (supabase as any).from('circle_lobby_config').upsert({
        circle_id: createdCircleId,
        welcome_message: welcomeMessage.trim() || null,
        video_url: videoUrl.trim() || null,
        music_url: musicUrl.trim() || null,
        handouts: handouts.filter(h => h.url.trim()),
        guestbook_enabled: guestbookEnabled,
      }, { onConflict: 'circle_id' });
    }
    resetAndClose();
  };

  const addHandout = () => { if (handouts.length < 5) setHandouts([...handouts, { label: '', url: '' }]); };
  const removeHandout = (i: number) => setHandouts(handouts.filter((_, idx) => idx !== i));
  const updateHandout = (i: number, field: 'label' | 'url', val: string) => {
    const h = [...handouts]; h[i] = { ...h[i], [field]: val }; setHandouts(h);
  };

  const handleWizardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdCircleId) return;
    if (handouts.length >= 5) { toast('Max 5 handouts'); return; }
    setUploading(true);
    try {
      const path = `${createdCircleId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('circle-handouts').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('circle-handouts').getPublicUrl(path);
      setHandouts([...handouts, { label: file.name, url: publicUrl }]);
      toast.success('File attached!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (wizardFileRef.current) wizardFileRef.current.value = '';
    }
  };

  const stepIndex = step === 'roomType' ? 0 : step === 'details' ? 1 : step === 'settings' ? 2 : step === 'preview' ? 3 : 4;
  const STEP_LABELS = ['Room', 'Details', 'Settings', 'Create', 'Lobby'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[95dvh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ background: 'hsl(var(--theatre-bg))', borderWidth: 1, borderColor: 'hsl(var(--theatre-border))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">Circle Architect</h3>
              </div>
              <button onClick={resetAndClose} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 px-5 pb-4">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    i <= stepIndex ? 'bg-primary scale-110' : 'bg-muted'
                  }`} />
                  {i < STEP_LABELS.length - 1 && <div className={`h-px w-4 transition-colors duration-300 ${
                    i < stepIndex ? 'bg-primary/50' : 'bg-muted'
                  }`} />}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ─── Step 1: Room Type ─── */}
                {step === 'roomType' && (
                  <motion.div key="roomType" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-5 pb-5">
                    <p className="text-xs text-muted-foreground mb-4">Choose your room environment.</p>
                    <div className="flex flex-col gap-3">
                      {ROOM_TYPES.map((rt) => (
                        <button
                          key={rt.type}
                          onClick={() => { setRoomType(rt.type); setCircleType(null); setStep('details'); }}
                          className="group relative flex items-start gap-4 rounded-xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] border hover:border-primary/30"
                          style={{ background: 'hsl(var(--theatre-glass) / 0.5)', borderColor: 'hsl(var(--theatre-border))' }}
                        >
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden" style={{ background: rt.gradient }}>
                            <FireflyPreview count={8} warm={rt.type === 'fireside'} />
                          </div>
                          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 shrink-0 text-xl">
                            {rt.emoji}
                          </div>
                          <div className="relative z-10 flex-1 min-w-0">
                            <span className="text-sm font-bold text-foreground block mb-0.5">{rt.label}</span>
                            <p className="text-xs text-muted-foreground mb-2">{rt.tagline}</p>
                            <div className="flex flex-wrap gap-1">
                              {rt.features.map(f => (
                                <span key={f} className="rounded-full bg-background/60 backdrop-blur-sm px-2 py-0.5 text-[10px] text-muted-foreground border border-border/30">{f}</span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="relative z-10 h-4 w-4 text-muted-foreground/40 mt-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 2: Details ─── */}
                {step === 'details' && roomType && (
                  <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={handleBack} className="rounded-full p-1 hover:bg-secondary transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <span className="text-sm font-semibold text-foreground">
                        {roomType === 'spatial' ? '🌌 Hangout' : '🔥 Fireside'} — Details
                      </span>
                    </div>

                    {/* Emoji selector */}
                    <div className="mb-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Icon</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJI_OPTIONS.map((e) => (
                          <button key={e} onClick={() => setEmoji(e)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${
                              emoji === e ? 'bg-primary/15 ring-2 ring-primary/40 scale-110' : 'hover:bg-secondary bg-secondary/50'
                            }`}>{e}</button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Circle name</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Movie Night" maxLength={24}
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border" />
                    </div>

                    <div className="mb-5">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What's it for?</label>
                      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="One sentence about this space" maxLength={80}
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border" />
                    </div>

                    <button onClick={() => { if (name.trim() && description.trim()) setStep('settings'); }}
                      disabled={!name.trim() || !description.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* ─── Step 3: Settings (sub-mode) ─── */}
                {step === 'settings' && roomType && (
                  <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={handleBack} className="rounded-full p-1 hover:bg-secondary transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <span className="text-sm font-semibold text-foreground">Choose a mode</span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">
                      {roomType === 'spatial'
                        ? 'How should the orbs behave in this space?'
                        : 'What kind of fireside experience?'}
                    </p>

                    <div className="flex flex-col gap-3 mb-5">
                      {subModes.map((sm) => (
                        <button
                          key={sm.type}
                          onClick={() => { setCircleType(sm.type); setEmoji(emoji === '🌿' ? sm.defaultEmoji : emoji); }}
                          className={`flex items-start gap-3 rounded-xl p-4 text-left transition-all border ${
                            circleType === sm.type
                              ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/50 hover:border-primary/20'
                          }`}
                          style={{ background: circleType === sm.type ? undefined : 'hsl(var(--theatre-glass) / 0.5)' }}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 shrink-0">
                            {sm.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-foreground block mb-0.5">{sm.label}</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">{sm.tagline}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button onClick={() => { if (circleType) setStep('preview'); }}
                      disabled={!circleType}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                      Preview <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* ─── Step 4: Preview + Create ─── */}
                {step === 'preview' && roomType && circleType && (
                  <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={handleBack} className="rounded-full p-1 hover:bg-secondary transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <span className="text-sm font-semibold text-foreground">Preview your Circle</span>
                    </div>

                    {/* Preview card */}
                    <div className="relative rounded-xl overflow-hidden mb-4 border border-border/50"
                      style={{ height: 160, background: ROOM_TYPES.find(r => r.type === roomType)?.gradient }}>
                      <FireflyPreview count={12} warm={roomType === 'fireside'} />
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{name || 'Your Circle'}</p>
                            <p className="text-[10px] text-white/70">{description || 'A space for what matters'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-secondary/50 border border-border p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">Room</span>
                        <span className="text-[10px] text-muted-foreground">{roomType === 'spatial' ? '🌌 Hangout' : '🔥 Fireside'}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">Mode</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{circleType}</span>
                      </div>
                    </div>

                    <button onClick={handleCreate} disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                      {submitting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <><Sparkles className="h-4 w-4" /> {`Create ${emoji} ${name.trim() || 'Circle'}`}</>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* ─── Step 5: Lobby Setup ─── */}
                {step === 'lobby' && (
                  <motion.div key="lobby" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-semibold text-foreground">Lobby Setup</span>
                      <span className="text-[10px] text-muted-foreground">(optional)</span>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Welcome message</label>
                      <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="A greeting guests see when they arrive…" maxLength={300} rows={2}
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border resize-none" />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Video className="h-3 w-3" /> Welcome video URL
                      </label>
                      <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=…"
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border" />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Music className="h-3 w-3" /> Background music URL
                      </label>
                      <input value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)}
                        placeholder="https://…"
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border" />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Handouts ({handouts.length}/5)
                      </label>
                      {handouts.map((h, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input value={h.label} onChange={(e) => updateHandout(i, 'label', e.target.value)}
                            placeholder="Label"
                            className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-foreground bg-input border border-border focus:outline-none focus:ring-1 focus:ring-primary/20" />
                          <input value={h.url} onChange={(e) => updateHandout(i, 'url', e.target.value)}
                            placeholder="URL"
                            className="flex-[2] rounded-lg px-2.5 py-1.5 text-xs text-foreground bg-input border border-border focus:outline-none focus:ring-1 focus:ring-primary/20" />
                          <button onClick={() => removeHandout(i)} className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                      {handouts.length < 5 && (
                        <div className="flex items-center gap-2">
                          <button onClick={addHandout} className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors">
                            <Plus className="h-3 w-3" /> Add by URL
                          </button>
                          <span className="text-[10px] text-muted-foreground">or</span>
                          <input ref={wizardFileRef} type="file" className="hidden"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
                            onChange={handleWizardFileUpload} />
                          <button onClick={() => wizardFileRef.current?.click()} disabled={uploading}
                            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                            <Upload className="h-3 w-3" /> {uploading ? 'Uploading…' : 'Browse file'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-5 rounded-xl bg-secondary/50 border border-border p-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Guestbook</p>
                        <p className="text-[10px] text-muted-foreground">Capture arrival notes when guests enter</p>
                      </div>
                      <button onClick={() => setGuestbookEnabled(!guestbookEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${guestbookEnabled ? 'bg-primary' : 'bg-muted'}`}>
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${guestbookEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={resetAndClose}
                        className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                        Skip
                      </button>
                      <button onClick={handleSaveLobbyConfig}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all">
                        <Sparkles className="h-4 w-4" /> Save & Enter
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
