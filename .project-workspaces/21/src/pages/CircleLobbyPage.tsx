import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Sparkles, Lock, Clock, FileText, ExternalLink, Play } from 'lucide-react';
import type { Circle } from '@/hooks/useCircles';
import { useCircleLobbyConfig } from '@/hooks/useCircleLobbyConfig';
// Guestbook removed in circles refactor
import { MiniFireflies, VIBE_GRADIENTS, VIBE_LABELS } from '@/components/circle/LobbyShared';
import PreJoinDeviceCheck from '@/components/circle/PreJoinDeviceCheck';

/* ─── (Mic test hook removed — replaced by PreJoinDeviceCheck) ─── */

/* ─── Video Thumbnail Helper ─── */
function extractYouTubeId(url: string): string | null {
  // Direct YouTube URLs
  const directMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (directMatch) return directMatch[1];
  // Google redirect URLs containing encoded YouTube watch links
  try {
    const u = new URL(url);
    const inner = u.searchParams.get('url') || u.searchParams.get('q');
    if (inner) {
      const innerMatch = inner.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
      if (innerMatch) return innerMatch[1];
      try {
        const iu = new URL(inner);
        const v = iu.searchParams.get('v');
        if (v && v.length === 11) return v;
      } catch (e) { logger.warn('[CircleLobby] URL parse failed:', e); }
    }
  } catch (e) { logger.warn('[CircleLobby] YouTube ID extraction failed:', e); }
  return null;
}

function InlineVideo({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(url);

  if (playing && videoId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden" style={{ borderColor: 'hsl(250 15% 18% / 0.5)' }}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden cursor-pointer group"
      style={{ borderColor: 'hsl(250 15% 18% / 0.5)' }}
      onClick={() => videoId ? setPlaying(true) : window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="Welcome video" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(225 30% 12%) 0%, hsl(240 25% 16%) 50%, hsl(225 20% 10%) 100%)' }}>
            <Play className="h-8 w-8 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg shadow-black/20 transition-transform group-hover:scale-110">
            <Play className="h-5 w-5 text-white ml-0.5 drop-shadow-md" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CircleLobbyPage — Minimal mode (no config) + Full lobby mode
   ═══════════════════════════════════════════════════════════════ */
export default function CircleLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAppContext();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [arrivalNote, setArrivalNote] = useState('');

  const { config, loading: configLoading } = useCircleLobbyConfig(id);

  // Look up circle
  useEffect(() => {
    if (!id) return;
    const lookup = async () => {
      const { data, error } = await supabase
        .from('custom_circles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        toast.error('Circle not found');
        navigate('/circles', { replace: true });
        setLoading(false);
        return;
      }
      setCircle(data as unknown as Circle);
      setSessionActive((data as any).session_active === true);
      const { count } = await supabase
        .from('circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', id);
      setMemberCount(count || 0);
      setLoading(false);
    };
    lookup();
  }, [id, navigate]);

  // Realtime session_active
  useEffect(() => {
    if (!circle) return;
    const channel = supabase
      .channel(`lobby-id-${circle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'custom_circles',
        filter: `id=eq.${circle.id}`,
      }, (payload) => {
        if ((payload.new as any).session_active === true && !sessionActive) {
          setSessionActive(true);
          toast.success('🚪 Doors are open! You can join now.', { duration: 5000 });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circle?.id, sessionActive]);

  const handleEnter = async () => {
    if (!circle || !user || !profile) return;
    // Device cleanup handled by PreJoinDeviceCheck unmount

    // Guestbook removed in circles refactor

    navigate(`/circles/${circle.id}`);
  };

  if (!user || !profile) return null;
  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(235 22% 8%)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!circle) return null;

  const circleType = (circle as any).circle_type || 'social';
  const isCommunity = circleType === 'community';
  const waitingRoomActive = isCommunity && !sessionActive;
  const vibeGradient = VIBE_GRADIENTS[circleType] || VIBE_GRADIENTS.social;
  const vibeInfo = VIBE_LABELS[circleType] || VIBE_LABELS.social;
  const hasFullLobby = !!config;

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'hsl(235 22% 8%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/[0.1] shadow-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
        style={{ background: 'hsl(245 25% 10%)' }}
      >
        {/* ─── Vibe Hero ─── */}
        <div className="relative overflow-hidden" style={{ height: hasFullLobby ? 180 : 160, background: vibeGradient }}>
          <MiniFireflies count={vibeInfo.fireflies} />
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{circle.emoji}</span>
              <div>
                <h2 className="font-display text-lg font-bold text-white">{circle.name}</h2>
                <p className="text-[11px] text-white/70">{circle.description}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 border" style={{ background: 'hsl(240 20% 5% / 0.6)', borderColor: 'hsl(250 15% 18% / 0.5)', backdropFilter: 'blur(8px)' }}>
            <span className="text-xs">{vibeInfo.emoji}</span>
            <span className="text-[10px] font-medium text-white/80">{vibeInfo.label}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Waiting room notice */}
          {waitingRoomActive && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 py-2.5 px-3">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Waiting for host</p>
                <p className="text-[10px] text-muted-foreground">The meeting hasn't started yet. You'll be notified when doors open.</p>
              </div>
            </motion.div>
          )}

          {/* ─── Full Lobby Content ─── */}
          {hasFullLobby && (
            <>
              {/* Host Welcome Message */}
              {config.welcome_message && (
               <div className="rounded-xl border border-white/[0.1] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" style={{ background: 'hsl(250 20% 14% / 0.5)' }}>
                   <p className="text-xs font-medium text-muted-foreground mb-1">From your host</p>
                   <p className="text-sm text-foreground leading-relaxed">{config.welcome_message}</p>
                 </div>
               )}

              {/* Welcome Video Thumbnail */}
              {config.video_url && <InlineVideo url={config.video_url} />}

              {/* Background Music — host-only preview */}
              {config.music_url && circle.creator_id === user?.id && (
                <a href={config.music_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-foreground hover:bg-white/5 transition-colors"
                  style={{ background: 'hsl(250 20% 14% / 0.5)', borderColor: 'hsl(250 15% 18% / 0.5)' }}>
                  <span className="text-base">🎵</span>
                  <span className="truncate flex-1">Background Music</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </a>
              )}

              {/* Handouts */}
              {config.handouts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Handouts
                  </p>
                  {config.handouts.map((h, i) => (
                    <a key={i} href={h.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-foreground hover:bg-white/5 transition-colors"
                      style={{ background: 'hsl(250 20% 14% / 0.5)', borderColor: 'hsl(250 15% 18% / 0.5)' }}>
                      <FileText className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate flex-1">{h.label || h.url}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Social proof */}
          {memberCount > 1 && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] py-2.5 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" style={{ background: 'hsl(250 20% 14% / 0.5)' }}>
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {memberCount - 1} {memberCount - 1 === 1 ? 'friend is' : 'friends are'} already in
              </span>
            </div>
          )}

          {/* Pre-join device check */}
          <PreJoinDeviceCheck />

          {/* Arrival Note (full lobby only) */}
          {hasFullLobby && config.guestbook_enabled && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Leave an arrival note</p>
              <div className="flex flex-wrap gap-1.5">
                {config.arrival_suggestions.map((s) => (
                  <button key={s} onClick={() => setArrivalNote(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                      arrivalNote === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-white/5'
                    }`}
                    style={arrivalNote !== s ? { borderColor: 'hsl(250 15% 18%)', background: 'hsl(250 20% 14% / 0.5)' } : {}}>
                    {s}
                  </button>
                ))}
              </div>
              <input
                value={arrivalNote}
                onChange={(e) => setArrivalNote(e.target.value)}
                placeholder="Or write your own…"
                maxLength={120}
                className="w-full rounded-lg border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: 'hsl(250 20% 14% / 0.5)', borderColor: 'hsl(250 15% 18%)' }}
              />
            </div>
          )}

          {/* Companions hint removed */}

          {/* Enter button */}
          <button
            onClick={handleEnter}
            disabled={waitingRoomActive}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {waitingRoomActive ? (
              <><Lock className="h-4 w-4" /> Waiting…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {circleType === 'kids' ? "Let's Play! 🎮" : 'Come in ✨'}</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
