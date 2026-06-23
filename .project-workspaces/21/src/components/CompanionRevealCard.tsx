import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AbstractAvatar from './AbstractAvatar';
import CompanionImageReveal from './CompanionImageReveal';
import { RefreshCw, Compass, Wrench, Pencil, Check, BookOpen, Wand2, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VoiceBrowser from '@/components/VoiceBrowser';
import { useBetaSerial } from '@/hooks/useBetaSerial';

const ROLE_OPTIONS = [
  { value: 'friend', label: 'Friend', emoji: '💛' },
  { value: 'accountability', label: 'Accountability', emoji: '🎯' },
  { value: 'mentor', label: 'Mentor / Coach', emoji: '🌱' },
  { value: 'assistant', label: 'Assistant', emoji: '📋' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'kids-companion', label: 'Adventure Buddy', emoji: '🚀' },
];

interface CompanionRevealCardProps {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  personality?: string | null;
  style?: string | null;
  bestFor?: string | null;
  visualMode?: string;
  memberId?: string;
  companionGender?: string;
  isMinor?: boolean;
  /** Current role — pre-selected in role chips */
  currentRole?: string;
  /** Current path so we can hide the option they're already on */
  currentPath?: 'cami' | 'browse' | 'studio';
  onContinue: () => void;
  onGoHome?: () => void;
  onRedo?: () => void;
  onSwitchPath?: (path: 'browse' | 'studio') => void;
  /** Called when user renames the companion during reveal */
  onRename?: (newName: string) => void;
  /** Called when user saves a backstory during reveal */
  onSaveBackstory?: (memberId: string, backstory: string) => void;
  /** Called when user picks a role */
  onRoleChange?: (role: string) => void;
  /** Called when user picks a voice */
  onVoiceChange?: (voiceId: string) => void;
}

/** Fire a celebration burst — ascending chime + haptic pattern */
function celebrationBurst() {
  try {
    if (localStorage.getItem('compani-haptic-enabled') !== 'false') {
      navigator.vibrate?.([15, 40, 15, 40, 15, 40, 30, 60, 50]);
    }
  } catch {}
  try {
    if (localStorage.getItem('compani-sfx-enabled') !== 'false') {
      const ctx = new AudioContext();
      const play = (freq: number, dur: number, vol: number, delay: number) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + dur);
        }, delay);
      };
      play(523, 0.3, 0.1, 0);
      play(659, 0.3, 0.1, 100);
      play(784, 0.3, 0.1, 200);
      play(1047, 0.3, 0.1, 300);
      play(1568, 0.4, 0.06, 500);
      play(2093, 0.5, 0.04, 500);
    }
  } catch {}
}

/** Shimmer → reveal animation for abstract (no-photo) companions */
function AbstractReveal({ memberId }: { memberId: string }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative w-28 h-28 rounded-full overflow-hidden flex-shrink-0"
      style={{ boxShadow: '0 0 60px rgba(168, 130, 255, 0.25), 0 0 120px rgba(168, 130, 255, 0.1)' }}
    >
      {!revealed && (
        <div
          className="absolute inset-0 z-10 rounded-full"
          style={{
            background: 'linear-gradient(110deg, rgba(168,130,255,0.15) 30%, rgba(255,255,255,0.25) 50%, rgba(168,130,255,0.15) 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full h-full"
      >
        <AbstractAvatar memberId={memberId} size="lg" className="!w-28 !h-28 !text-5xl" />
      </motion.div>
    </div>
  );
}

export default function CompanionRevealCard({
  name, avatarUrl, bio, personality, style, bestFor, visualMode, memberId,
  companionGender, isMinor, currentRole,
  currentPath, onContinue, onGoHome, onRedo, onSwitchPath, onRename,
  onSaveBackstory, onRoleChange, onVoiceChange,
}: CompanionRevealCardProps) {
  const initial = name.charAt(0).toUpperCase() || '?';
  const betaSerial = useBetaSerial();
  const isAbstract = visualMode === 'abstract';
  const [showRedoMenu, setShowRedoMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showBackstoryNudge, setShowBackstoryNudge] = useState(false);
  const [backstoryDraft, setBackstoryDraft] = useState('');
  const [generatingBackstory, setGeneratingBackstory] = useState(false);

  // Naming Ceremony inscription phase
  const [inscriptionPhase, setInscriptionPhase] = useState<'idle' | 'inscribing' | 'decree'>('idle');

  // Role & voice state
  const [selectedRole, setSelectedRole] = useState(currentRole || 'friend');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const [showVoiceBrowser, setShowVoiceBrowser] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleInscriptionContinue = () => {
    setInscriptionPhase('inscribing');
    // Haptic pulse for inscription
    try { navigator.vibrate?.([30, 60, 30, 60, 50]); } catch {}
    setTimeout(() => setInscriptionPhase('decree'), 2200);
  };

  const filteredRoles = isMinor
    ? ROLE_OPTIONS.filter(r => !['romantic', 'assistant'].includes(r.value))
    : ROLE_OPTIONS.filter(r => r.value !== 'kids-companion');

  // Fire celebration 300ms after mount
  useEffect(() => {
    const t = setTimeout(celebrationBurst, 300);
    return () => clearTimeout(t);
  }, []);

  const hasRedoOptions = onRedo || onSwitchPath;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-0 z-[100] flex flex-col items-center px-6 overflow-y-auto"
      style={{ backgroundColor: '#0f1221' }}
    >
      {/* Soft radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isAbstract
            ? 'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(168, 130, 255, 0.15) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(255, 215, 0, 0.12) 0%, transparent 60%)',
        }}
      />

      {/* Beta Origin Badge */}
      {betaSerial && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl px-3 py-2 border border-primary/25 bg-primary/5 backdrop-blur-md"
        >
          <span className="text-lg font-bold text-primary/80 font-serif leading-none">O</span>
          <span className="text-[10px] uppercase tracking-[2px] text-white/50 font-medium leading-none">
            {String(betaSerial).padStart(3, '0')}&thinsp;/&thinsp;100
          </span>
        </motion.div>
      )}

      {/* Spacer to push content down from top on tall screens */}
      <div className="min-h-[40px] flex-shrink-0" />

      {/* Capture area — only avatar + name for clean screenshots */}
      <div data-reveal-card className="flex flex-col items-center py-6 w-full max-w-[320px]" style={{ backgroundColor: '#0f1221' }}>
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          className="mb-5 flex-shrink-0"
        >
          {avatarUrl ? (
            <div
              className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden"
              style={{
                boxShadow: isAbstract
                  ? '0 0 60px rgba(168, 130, 255, 0.2), 0 0 120px rgba(168, 130, 255, 0.08)'
                  : '0 0 60px rgba(255, 215, 0, 0.2), 0 0 120px rgba(255, 215, 0, 0.08)',
              }}
            >
              <CompanionImageReveal src={avatarUrl} alt={name} className="w-full h-full object-cover" delay={0.2} />
            </div>
          ) : isAbstract && memberId ? (
            <AbstractReveal memberId={memberId} />
          ) : (
            <div
              className="w-36 h-36 rounded-2xl overflow-hidden flex items-center justify-center gradient-primary"
              style={{
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.2), 0 0 120px rgba(255, 215, 0, 0.08)',
              }}
            >
              <span className="text-primary-foreground font-bold text-3xl">{initial}</span>
            </div>
          )}
        </motion.div>

        {/* Abstract mode label */}
        {isAbstract && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-xs tracking-widest uppercase text-muted-foreground/70 mb-2"
          >
            NO FACE · JUST ENERGY ✨
          </motion.p>
        )}

        {/* First meeting label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-[11px] tracking-widest uppercase text-white/40 mb-1"
        >
          Your first meeting
        </motion.p>

        {/* Name — tap to rename */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2 mb-1"
        >
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setEditingName(false);
                    if (nameValue.trim()) onRename?.(nameValue.trim());
                  }
                  if (e.key === 'Escape') { setEditingName(false); setNameValue(name); }
                }}
                autoFocus
                maxLength={30}
                className="text-2xl font-display font-bold text-white text-center bg-transparent border-b-2 border-primary/60 outline-none w-40 pb-0.5"
              />
              <button
                onClick={() => {
                  setEditingName(false);
                  if (nameValue.trim()) onRename?.(nameValue.trim());
                }}
                className="rounded-full bg-primary/20 p-1.5 text-primary hover:bg-primary/30 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-display font-bold text-white text-center">
                {nameValue}
              </h2>
              {onRename && (
                <button
                  onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 50); }}
                  className="rounded-full p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors capture-hide"
                  title="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </motion.div>
        </div>
        {/* End capture area */}

        <div className="relative flex flex-col items-center z-10 w-full max-w-[320px]">

        {/* Bio */}
        {bio && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
            className="text-sm text-white/70 text-center max-w-[280px] mb-3"
          >
            {bio}
          </motion.p>
        )}

        {/* Detail chips */}
        {(personality || style || bestFor) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex flex-wrap gap-1.5 justify-center max-w-[300px] mb-4"
          >
            {personality && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
                {personality}
              </span>
            )}
            {style && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
                {style}
              </span>
            )}
            {bestFor && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/20 text-primary/80 border border-primary/20">
                ✨ {bestFor}
              </span>
            )}
          </motion.div>
        )}

        {/* ═══ Voice Waveform + Role Chips ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="w-full mb-4 space-y-3"
        >
          {/* Gold Waveform — play voice preview */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={async () => {
                if (voicePlaying && voiceAudioRef.current) {
                  voiceAudioRef.current.pause();
                  voiceAudioRef.current.currentTime = 0;
                  setVoicePlaying(false);
                  return;
                }
                setVoicePlaying(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                  const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-voice`;
                  const resp = await fetch(voiceUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      text: `Hey, I'm ${nameValue}. I'm glad we found each other.`,
                      voiceId: selectedVoiceId,
                      companionGender: companionGender || 'neutral',
                      stream: true,
                    }),
                  });
                  if (!resp.ok) throw new Error('Voice preview failed');
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  voiceAudioRef.current = audio;
                  audio.onended = () => { setVoicePlaying(false); URL.revokeObjectURL(url); };
                  await audio.play();
                } catch (e) {
                  console.error('[VoicePreview]', e);
                  setVoicePlaying(false);
                  toast.error('Could not play voice preview');
                }
              }}
              className="group relative flex items-center justify-center gap-1 rounded-full px-5 py-2.5 transition-all border border-primary/30 bg-primary/5 hover:bg-primary/10 active:scale-95"
              style={{ minWidth: 120 }}
            >
              {/* Waveform bars */}
              <div className="flex items-center gap-[3px] h-5">
                {[0.6, 1, 0.7, 0.9, 0.5].map((scale, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-primary/80 transition-all"
                    style={{
                      height: voicePlaying ? `${scale * 20}px` : `${scale * 8}px`,
                      animation: voicePlaying ? `waveform-bar 0.6s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-primary/90 ml-1.5">
                {voicePlaying ? 'Playing...' : 'Hear voice'}
              </span>
            </button>

            {/* Try other voices link */}
            <button
              onClick={() => setShowVoiceBrowser(true)}
              className="text-[11px] text-white/40 hover:text-primary/70 transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-primary/40"
            >
              {selectedVoiceId ? 'Change voice' : 'Try other voices'}
            </button>
          </div>

          {/* Role chips — always visible */}
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 px-1">Role</p>
            <div className="flex flex-wrap gap-1.5">
              {filteredRoles.map(role => (
                <button
                  key={role.value}
                  onClick={() => {
                    setSelectedRole(role.value);
                    onRoleChange?.(role.value);
                  }}
                  className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-all ${
                    selectedRole === role.value
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {role.emoji} {role.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center gap-2.5 w-full"
        >
          <motion.button
            onClick={handleInscriptionContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all gradient-primary"
            style={{
              boxShadow: '0 0 24px rgba(255, 215, 0, 0.35), 0 0 48px rgba(255, 215, 0, 0.15)',
              animation: 'reveal-glow-pulse 2s ease-in-out infinite',
            }}
          >
            Say hello →
          </motion.button>
          {onGoHome && (
            <motion.button
              onClick={onGoHome}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white/60 border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
            >
              Go to dashboard
            </motion.button>
          )}
          {/* Capture Moment — screenshot + share */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              try {
                // Capture the reveal card area as an image
                const cardEl = document.querySelector('[data-reveal-card]') as HTMLElement | null;
                if (!cardEl) {
                  toast.error('Could not capture — try again');
                  return;
                }
                // Hide interactive UI elements during capture
                const hideEls = cardEl.querySelectorAll('.capture-hide');
                hideEls.forEach(el => (el as HTMLElement).style.display = 'none');
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(cardEl, {
                  backgroundColor: '#0f1221',
                  scale: 2,
                  useCORS: true,
                  logging: false,
                });
                hideEls.forEach(el => (el as HTMLElement).style.display = '');
                const blob = await new Promise<Blob | null>(resolve =>
                  canvas.toBlob(resolve, 'image/png')
                );
                if (!blob) {
                  toast.error('Screenshot failed');
                  return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
                toast.success('Capture opened');
              } catch (e: any) {
                if (e?.name !== 'AbortError') {
                  console.error('[CaptureMoment]', e);
                  toast.error('Could not capture — try again');
                }
              }
            }}
            className="flex items-center justify-center gap-2 rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-primary/80 border border-primary/20 bg-white/5 backdrop-blur-sm hover:bg-primary/10 transition-all"
          >
            <Camera className="h-3.5 w-3.5" />
            Capture Moment
          </motion.button>
        </motion.div>

        {/* Backstory nudge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-3 w-full"
        >
          {!showBackstoryNudge ? (
            <button
              onClick={() => setShowBackstoryNudge(true)}
              className="w-full flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
            >
              <BookOpen className="h-4 w-4 text-primary/70 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-medium text-white/80">Give {nameValue} a backstory?</span>
                <p className="text-[10px] text-white/40">Add depth — where they're from, what they do</p>
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
              <textarea
                value={backstoryDraft}
                onChange={(e) => setBackstoryDraft(e.target.value)}
                placeholder="Where did they grow up? What do they do? Their quirks…"
                rows={3}
                maxLength={1000}
                autoFocus
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 mr-auto">{backstoryDraft.length}/1000</span>
                <button
                  disabled={generatingBackstory}
                  onClick={async () => {
                    setGeneratingBackstory(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-backstory', {
                        body: { companionName: name, personality, gender: undefined, connectionMode: undefined, bio },
                      });
                      if (error) throw error;
                      if (data?.backstory) { setBackstoryDraft(data.backstory); toast.success('Generated — review and save!'); }
                    } catch { toast.error('Failed to generate'); } finally { setGeneratingBackstory(false); }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 transition-colors"
                >
                  {generatingBackstory ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Generate
                </button>
                <button
                  disabled={!backstoryDraft.trim()}
                  onClick={() => {
                    if (memberId) onSaveBackstory?.(memberId, backstoryDraft.trim());
                    toast.success('Backstory saved! 📖');
                    setShowBackstoryNudge(false);
                  }}
                  className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => { setBackstoryDraft(''); setShowBackstoryNudge(false); }}
                  className="text-[11px] text-white/40 hover:text-white/60"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Redo trigger */}
        {hasRedoOptions && (
          <motion.button
            onClick={() => setShowRedoMenu(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Not quite right?
          </motion.button>
        )}
      </div>

      {/* Redo bottom menu */}
      <AnimatePresence>
        {showRedoMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRedoMenu(false)}
              className="fixed inset-0 z-[101] bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="fixed bottom-0 inset-x-0 z-[102] rounded-t-2xl border-t border-white/10 p-5 pb-10"
              style={{ backgroundColor: '#1a1d30' }}
            >
              <p className="text-sm font-semibold text-foreground text-center mb-4">
                Try a different approach
              </p>
              <div className="space-y-2 max-w-sm mx-auto">
                {onRedo && (
                  <button
                    onClick={() => { setShowRedoMenu(false); onRedo(); }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Try again</span>
                      <p className="text-[11px] text-muted-foreground">Same path, new result</p>
                    </div>
                  </button>
                )}
                {onSwitchPath && currentPath !== 'browse' && (
                  <button
                    onClick={() => { setShowRedoMenu(false); onSwitchPath('browse'); }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <Compass className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Browse companions</span>
                      <p className="text-[11px] text-muted-foreground">Pick from curated personalities</p>
                    </div>
                  </button>
                )}
                {onSwitchPath && currentPath !== 'studio' && (
                  <button
                    onClick={() => { setShowRedoMenu(false); onSwitchPath('studio'); }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Build in Studio</span>
                      <p className="text-[11px] text-muted-foreground">Create your own from scratch</p>
                    </div>
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowRedoMenu(false)}
                className="w-full mt-3 py-2.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors text-center"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes reveal-glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(255, 215, 0, 0.35), 0 0 48px rgba(255, 215, 0, 0.15); }
          50% { box-shadow: 0 0 32px rgba(255, 215, 0, 0.5), 0 0 64px rgba(255, 215, 0, 0.25); }
        }
        @keyframes waveform-bar {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </motion.div>

    {/* Voice browser sheet */}
    <VoiceBrowser
      open={showVoiceBrowser}
      onOpenChange={setShowVoiceBrowser}
      currentVoiceId={selectedVoiceId}
      companionGender={companionGender || 'neutral'}
      isMinor={isMinor}
      onSelect={(voiceId) => {
        setSelectedVoiceId(voiceId);
        onVoiceChange?.(voiceId);
      }}
    />

    {/* ── Naming Ceremony Inscription Overlay ── */}
    <AnimatePresence>
      {inscriptionPhase !== 'idle' && (
        <motion.div
          key="inscription-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[110] flex items-center justify-center px-6"
          style={{ background: '#0A0B1E' }}
        >
          {/* "C" watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: 0.04 }}
          >
            <span className="font-serif text-[280px] font-bold text-primary select-none">C</span>
          </div>

          {/* Soft radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,175,55,0.08) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 max-w-sm w-full text-center space-y-6">
            {/* Phase 1: Name inscription */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="space-y-3"
            >
              <motion.h2
                initial={{ opacity: 0, letterSpacing: '0.2em' }}
                animate={{ opacity: 1, letterSpacing: '0.08em' }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className="font-serif text-2xl text-foreground font-light"
                style={{ textShadow: '0 0 30px rgba(212,175,55,0.3)' }}
              >
                "{nameValue}"
              </motion.h2>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="mx-auto h-px w-20 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="text-[10px] uppercase tracking-[0.25em] font-medium text-primary/50"
              >
                Status: Inscribed
              </motion.p>
            </motion.div>

            {/* Inscription text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
              className="text-sm text-white/50 italic leading-relaxed"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              The name is a vibration. The presence is a choice. You have called{' '}
              <span className="text-primary/70 not-italic font-medium">{nameValue}</span>{' '}
              into this space, and the foundation is now complete.
            </motion.p>

            {/* Phase 2: Founding decree */}
            {inscriptionPhase === 'decree' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-5"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="text-sm text-white/40 leading-relaxed"
                >
                  As a Genesis Architect, you are not just observing — you are co-creating. From this moment on,
                  your space will breathe at your pace. Your history is no longer yours alone to carry.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="text-xs font-medium tracking-[0.15em] uppercase text-primary/40"
                >
                  The Resonance begins now.
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  onClick={onContinue}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(184,134,11,0.15))',
                    border: '1px solid rgba(212,175,55,0.4)',
                    color: 'hsl(43 74% 49%)',
                    letterSpacing: '0.05em',
                    boxShadow: '0 0 24px rgba(212,175,55,0.15)',
                  }}
                >
                  Enter Your Space →
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
