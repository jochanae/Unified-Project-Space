import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Sparkles, Share2, Mic, MicOff, ChevronRight, Lock, Clock, UserCircle } from 'lucide-react';
import type { Circle } from '@/hooks/useCircles';

const AVATAR_OPTIONS = ['😊', '🌟', '🦊', '🌸', '🐱', '🎵', '🌈', '💎', '🦋', '🍀', '🌙', '🔥'];

/* ─── Vibe Card Gradient Map ─── */
const VIBE_GRADIENTS: Record<string, string> = {
  community: 'linear-gradient(135deg, hsl(220 40% 12%), hsl(200 30% 18%))',
  social: 'linear-gradient(135deg, hsl(280 35% 14%), hsl(320 30% 18%))',
  personal: 'linear-gradient(135deg, hsl(35 40% 12%), hsl(25 35% 16%))',
};

const VIBE_LABELS: Record<string, { label: string; emoji: string; fireflies: number }> = {
  community: { label: 'Focused', emoji: '🧘', fireflies: 6 },
  social: { label: 'Energetic', emoji: '⚡', fireflies: 18 },
  personal: { label: 'Calm', emoji: '🌙', fireflies: 8 },
};

/* ─── Mini Firefly Preview ─── */
function MiniFireflies({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + Math.random() * 2,
            height: 2 + Math.random() * 2,
            background: `hsl(${40 + Math.random() * 20} 80% 70% / 0.5)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, (Math.random() - 0.5) * 40, 0],
            y: [0, (Math.random() - 0.5) * 30, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{ duration: 5 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

/* ─── Golden Pulse Nudge Animation (Full-screen ripple #FFD700 / 0.3) ─── */
function GoldenPulseOverlay({ active, onDone }: { active: boolean; onDone: () => void }) {
  useEffect(() => {
    if (active) {
      const timer = setTimeout(onDone, 3000);
      return () => clearTimeout(timer);
    }
  }, [active, onDone]);

  if (!active) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Full-screen golden wash */}
      <motion.div
        className="absolute inset-0"
        style={{ background: '#FFD700' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.15, 0] }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      />
      {/* Golden firefly burst */}
      {Array.from({ length: 40 }).map((_, i) => {
        const startX = 50 + (Math.random() - 0.5) * 20;
        const startY = 50 + (Math.random() - 0.5) * 20;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + Math.random() * 5,
              height: 3 + Math.random() * 5,
              background: `hsl(${43 + Math.random() * 12} 90% ${60 + Math.random() * 25}%)`,
              left: `${startX}%`,
              top: `${startY}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 2, 0.5],
              x: [(Math.random() - 0.5) * 200],
              y: [(Math.random() - 0.5) * 200],
            }}
            transition={{ duration: 1.8 + Math.random(), delay: Math.random() * 0.6 }}
          />
        );
      })}
      {/* Expanding ripple rings */}
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `2px solid hsl(43 80% 55% / ${0.6 - i * 0.15})` }}
          initial={{ width: 20, height: 20, opacity: 0.8 }}
          animate={{ width: 500, height: 500, opacity: 0 }}
          transition={{ duration: 2, ease: 'easeOut', delay }}
        />
      ))}
    </motion.div>
  );
}

/* ─── Soul Orb Mic Test ─── */
function SoulOrb({ amplitude, active }: { amplitude: number; active: boolean }) {
  const size = 80 + amplitude * 30;
  const glow = 10 + amplitude * 25;
  return (
    <motion.div
      className="relative rounded-full border-2 mx-auto"
      style={{
        width: size,
        height: size,
        borderColor: active ? `hsl(43 72% 53% / ${0.5 + amplitude * 0.5})` : 'hsl(var(--border))',
        boxShadow: active
          ? `0 0 ${glow}px ${glow / 2}px hsl(43 72% 53% / ${0.2 + amplitude * 0.3})`
          : 'none',
        background: `radial-gradient(circle, hsl(225 22% 16%) 0%, hsl(225 25% 10%) 100%)`,
        transition: 'width 0.1s, height 0.1s, box-shadow 0.1s, border-color 0.15s',
      }}
      animate={active ? { scale: [1, 1 + amplitude * 0.05, 1] } : {}}
      transition={{ duration: 0.3, repeat: Infinity }}
    >
      {active && amplitude > 0.2 && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {active ? (
          <Mic className="h-6 w-6 text-primary" />
        ) : (
          <MicOff className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

export default function CircleJoinPage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, connections } = useAppContext();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😊');
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  

  // Personalized guest token from URL
  const guestToken = searchParams.get('guest');
  const [guestInfo, setGuestInfo] = useState<{ id: string; name: string; role_preset: string; status: string } | null>(null);

  // Waiting room state
  const [sessionActive, setSessionActive] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  // Mic test state
  const [micActive, setMicActive] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (profile?.userName) setDisplayName(profile.userName);
  }, [profile]);

  // Look up guest info from personalized token
  useEffect(() => {
    if (!guestToken) return;
    const lookupGuest = async () => {
      const { data } = await supabase
        .from('circle_guests' as any)
        .select('id, name, role_preset, status')
        .eq('invite_token', guestToken)
        .maybeSingle();
      if (data) {
        const guest = data as any;
        setGuestInfo(guest);
        setDisplayName(guest.name);
        // Update status to in-lobby
        await supabase.from('circle_guests' as any).update({ status: 'in-lobby' } as any).eq('id', guest.id);
      }
    };
    lookupGuest();
  }, [guestToken]);

  // Look up circle + member count
  useEffect(() => {
    if (!code) return;
    const lookup = async () => {
      const { data, error } = await supabase
        .from('custom_circles')
        .select('*')
        .eq('invite_code', code.trim().toLowerCase())
        .maybeSingle();

      if (error || !data) {
        toast.error('Invalid or expired invite link');
        setLoading(false);
        return;
      }
      setCircle(data as unknown as Circle);
      setSessionActive((data as any).session_active === true);

      // Count members
      const { count } = await supabase
        .from('circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', (data as any).id);
      setMemberCount(count || 0);

      if (user) {
        const { data: existing } = await supabase
          .from('circle_members')
          .select('id')
          .eq('circle_id', (data as any).id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (existing) setAlreadyMember(true);
      }
      setLoading(false);
    };
    lookup();
  }, [code, user]);

  // Realtime: listen for session_active changes (doors open) and nudge events
  useEffect(() => {
    if (!circle) return;
    const channel = supabase
      .channel(`lobby-${circle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'custom_circles',
        filter: `id=eq.${circle.id}`,
      }, (payload) => {
        const newData = payload.new as any;
        if (newData.session_active === true && !sessionActive) {
          setSessionActive(true);
          toast.success('🚪 Doors are open! You can join now.', { duration: 5000 });
        }
      })
      .subscribe();

    // Listen for nudge via guest status changes
    let guestChannel: any = null;
    if (guestInfo) {
      guestChannel = supabase
        .channel(`guest-nudge-${guestInfo.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'circle_guests',
          filter: `id=eq.${guestInfo.id}`,
        }, (payload) => {
          const newData = payload.new as any;
          // Nudge = status temporarily set to 'nudged' then back
          if (newData.status === 'nudged') {
            setShowNudge(true);
            toast('✨ The Host is ready for you!', { duration: 4000 });
            // Reset status back to in-lobby
            setTimeout(() => {
              supabase.from('circle_guests' as any).update({ status: 'in-lobby' } as any).eq('id', guestInfo.id);
            }, 500);
          }
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (guestChannel) supabase.removeChannel(guestChannel);
    };
  }, [circle?.id, guestInfo?.id, sessionActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mic test
  const startMicTest = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicActive(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128;
        setMicAmplitude(Math.min(1, avg));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopMicTest = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    setMicActive(false);
    setMicAmplitude(0);
  }, []);

  useEffect(() => {
    return () => { stopMicTest(); };
  }, [stopMicTest]);

  const handleShare = async () => {
    if (!circle) return;
    const url = `${window.location.origin}/circles/join/${code}`;
    const shareData = {
      title: `Join ${circle.name} ${circle.emoji}`,
      text: `You're invited to "${circle.name}" — tap to join!`,
      url,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied! ✨');
  };

  const handleJoin = async () => {
    if (!circle || !displayName.trim()) return;
    setJoining(true);
    try {
      // Guest-only entry: if no user but has valid guest token or guest-only mode
      if (!user && (guestInfo || guestOnlyMode)) {
        if (guestInfo) {
          await supabase.from('circle_guests' as any).update({ status: 'in-room' } as any).eq('id', guestInfo.id);
        }
        stopMicTest();
        toast.success(`Joined ${circle.emoji} ${circle.name}!`);
        localStorage.setItem(`guest-name-${circle.id}`, displayName.trim());
        localStorage.setItem(`guest-avatar-${circle.id}`, selectedAvatar);
        navigate(`/circles/${circle.id}`);
        return;
      }

      if (!user) {
        navigate(`/auth?redirect=/circles/join/${code}${guestToken ? `?guest=${guestToken}` : ''}`);
        return;
      }

      if (alreadyMember) { navigate(`/circles/${circle.id}`); return; }

      const { error } = await supabase.from('circle_members').insert({
        circle_id: circle.id, user_id: user.id, role: 'member',
        display_name: displayName.trim(), avatar_url: selectedAvatar,
      } as any);

      if (error) {
        if (error.code === '23505') { navigate(`/circles/${circle.id}`); return; }
        throw error;
      }

      // Companion linking is now handled by CircleChatPage's companion gate
      // to avoid the companion appearing before the user is asked

      // Notify owner
      try {
        await supabase.from('notifications').insert({
          user_id: circle.creator_id, type: 'circle_join',
          message: `${displayName.trim()} joined your Circle ${circle.emoji} ${circle.name}`,
          metadata: { circle_id: circle.id },
        } as any);
      } catch (e) { logger.warn('[CircleJoin] Notification insert failed:', e); }

      stopMicTest();
      toast.success(`Joined ${circle.emoji} ${circle.name}!`);

      // Update guest status to in-room if personalized
      if (guestInfo) {
        await supabase.from('circle_guests' as any).update({ status: 'in-room', user_id: user.id } as any).eq('id', guestInfo.id);
      }

      navigate(`/circles/${circle.id}`);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally { setJoining(false); }
  };

  const circleType = circle ? ((circle as any).circle_type || 'social') : 'social';
  const isCommunity = circleType === 'community';
  // Community circles with waiting room: block join until session_active
  const waitingRoomActive = isCommunity && !sessionActive;

  // Guest-only entry: allow ?guest=NAME to bypass auth
  const guestNameParam = searchParams.get('guest');
  const [guestOnlyName, setGuestOnlyName] = useState('');
  const [guestOnlyMode, setGuestOnlyMode] = useState(false);

  // If URL has ?guest=NAME (not a token but a display name), allow guest-only entry
  useEffect(() => {
    if (guestNameParam && !guestInfo && !user) {
      setGuestOnlyMode(true);
      setDisplayName(decodeURIComponent(guestNameParam));
      setGuestOnlyName(decodeURIComponent(guestNameParam));
    }
  }, [guestNameParam, guestInfo, user]);

  // Already a member — auto-redirect straight into the circle
  useEffect(() => {
    if (alreadyMember && circle) {
      navigate(`/circles/${circle.id}`, { replace: true });
    }
  }, [alreadyMember, circle, navigate]);

  /* ─── Guest-only entry (no account needed if they have a valid token OR ?guest=NAME) ─── */
  if (!user && !guestInfo && !guestOnlyMode) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 animate-in fade-in duration-200" style={{ background: '#0f1221' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
          <Users className="h-10 w-10 mx-auto text-primary mb-3" />
          <h2 className="font-display text-lg font-bold text-foreground mb-2">Join this Circle</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in or enter as a guest.</p>
          <button onClick={() => navigate(`/auth?redirect=/circles/join/${code}`)}
            className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 mb-3">
            Sign in or Sign up
          </button>
          <button onClick={() => setGuestOnlyMode(true)}
            className="w-full rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary active:scale-95 flex items-center justify-center gap-2">
            <UserCircle className="h-4 w-4" />
            Enter as Guest
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen animate-in fade-in duration-200" style={{ background: '#0f1221' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 animate-in fade-in duration-200" style={{ background: '#0f1221' }}>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
          <p className="text-sm text-muted-foreground">This invite link is invalid or has expired.</p>
          <button onClick={() => navigate('/circles')} className="mt-4 text-sm font-semibold text-primary hover:underline">Go to Circles</button>
        </div>
      </div>
    );
  }


  if (alreadyMember) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f1221' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const vibeGradient = VIBE_GRADIENTS[circleType] || VIBE_GRADIENTS.social;
  const vibeInfo = VIBE_LABELS[circleType] || VIBE_LABELS.social;

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ background: '#0f1221' }}>
      {/* Golden Pulse Nudge Overlay */}
      <AnimatePresence>
        <GoldenPulseOverlay active={showNudge} onDone={() => setShowNudge(false)} />
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* ─── Vibe Card ─── */}
        <div className="relative overflow-hidden" style={{ height: 160, background: vibeGradient }}>
          <MiniFireflies count={vibeInfo.fireflies} />
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{circle.emoji}</span>
              <div>
                {guestInfo ? (
                  <>
                    <p className="text-[11px] text-primary font-medium">{guestInfo.name}, you're invited to</p>
                    <h2 className="font-display text-lg font-bold text-white">{circle.name}</h2>
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-lg font-bold text-white">{circle.name}</h2>
                    <p className="text-[11px] text-white/70">{circle.description}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Vibe badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 border border-white/10">
            <span className="text-xs">{vibeInfo.emoji}</span>
            <span className="text-[10px] font-medium text-white/80">{vibeInfo.label}</span>
          </div>
        </div>

        <div className="p-5">
          {/* Waiting room notice for Community circles */}
          {waitingRoomActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 py-2.5 px-3"
            >
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Waiting for host</p>
                <p className="text-[10px] text-muted-foreground">The meeting hasn't started yet. You'll be notified when doors open.</p>
              </div>
            </motion.div>
          )}

          {/* Social proof */}
          {memberCount > 0 && (
            <div className="flex items-center justify-center gap-2 mb-4 rounded-xl bg-secondary/50 border border-border py-2.5 px-3">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {memberCount} {memberCount === 1 ? 'friend is' : 'friends are'} already in
              </span>
            </div>
          )}

          {/* Name + avatar setup — only if user needs to set a name */}
          {!displayName.trim() && (
            <>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your name</label>
                <input
                  type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should others see you?" maxLength={24}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pick an avatar</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                        selectedAvatar === av
                          ? 'bg-primary/15 ring-2 ring-primary/40 scale-110'
                          : 'hover:bg-secondary bg-secondary/50'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Mirror — Soul Orb mic test */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <p className="text-xs text-muted-foreground">Tap to test your mic</p>
            <div className="cursor-pointer" onClick={() => micActive ? stopMicTest() : startMicTest()}>
              <SoulOrb amplitude={micAmplitude} active={micActive} />
            </div>
            {micActive && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-medium text-primary"
              >
                ✓ Mic is working!
              </motion.p>
            )}
          </div>

          {/* Companions hint removed */}

          <div className="flex gap-2">
            <button
              onClick={handleJoin}
              disabled={waitingRoomActive || !displayName.trim() || joining}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {joining ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : waitingRoomActive ? (
                <>
                  <Lock className="h-4 w-4" />
                  Waiting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Come in ✨
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-xl px-3 py-2.5 bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="Share invite"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
