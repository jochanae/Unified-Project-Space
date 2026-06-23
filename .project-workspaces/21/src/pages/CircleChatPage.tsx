import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Share2, Video, VideoOff, Volume2, VolumeX,
  Monitor, Users, X, Plus, Sparkles, Copy, Focus,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useCircleChat, type Circle, type CircleMember } from '@/hooks/useCircles';
import { useCircleCompanions } from '@/hooks/useCircleCompanions';
import { useChatMemories } from '@/hooks/useChatMemories';
import { useCircleLobbyConfig } from '@/hooks/useCircleLobbyConfig';
import { useCirclePresentation } from '@/hooks/useCirclePresentation';
import { useAmbientSoundscape } from '@/hooks/useAmbientSoundscape';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { markCircleRead } from '@/hooks/useCircleUnread';
import { isAdult } from '@/lib/ageUtils';
import { detectPlatformLabel } from '@/lib/presentationUrl';
import { ATMOSPHERE_DECKS, type AtmosphereDeckId } from '@/components/VideoStage';
import AbstractAvatar from '@/components/AbstractAvatar';
import CircleInviteCard from '@/components/CircleInviteCard';
import SpatialRoom from '@/components/circle/SpatialRoom';
import TranscriptSheet from '@/components/circle/TranscriptSheet';
import SessionFocusMode from '@/components/circle/SessionFocusMode';
import HostOverridePanel from '@/components/circle/HostOverridePanel';
import type { CircleType } from '@/components/circle/types';

function buildMemberMap(
  members: CircleMember[],
  currentUserId?: string,
  currentUserName?: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  members.forEach(m => { map[m.user_id] = m.display_name || ''; });
  if (currentUserId && currentUserName) map[currentUserId] = currentUserName;
  return map;
}

export default function CircleChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, connections, subscription, activeConnection } = useAppContext();

  const { messages, members, loading, sendMessage } = useCircleChat(id || '', user?.id);
  const { myCompanions, companions: allCircleCompanions, linkCompanion, unlinkCompanion, setMode } =
    useCircleCompanions(id || '', user?.id);
  const { config: lobbyConfig } = useCircleLobbyConfig(id);
  const { extractMemories } = useChatMemories(profile?.userName || '', user?.id || '', subscription.subscribed);

  const [circle, setCircle] = useState<Circle | null>(null);
  const memberNames = useMemo(
    () => buildMemberMap(members, user?.id, profile?.userName),
    [members, user?.id, profile?.userName],
  );

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddCompanion, setShowAddCompanion] = useState(false);
  const [showInviteCard, setShowInviteCard] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [showCompanionGate, setShowCompanionGate] = useState(false);
  const [atmosphereDeck, setAtmosphereDeck] = useState<AtmosphereDeckId>('none');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Audio state surfaced from SpatialRoom
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioSpeaking, setAudioSpeaking] = useState(false);
  const toggleMuteRef = useRef<(() => void) | null>(null);

  const handleAudioState = useCallback((state: {
    amplitude: number; isMuted: boolean; isSpeaking: boolean; toggleMute: () => void;
  }) => {
    setAudioAmplitude(state.amplitude);
    setAudioMuted(state.isMuted);
    setAudioSpeaking(state.isSpeaking);
    toggleMuteRef.current = state.toggleMute;
  }, []);

  const [circleTypeOverride, setCircleTypeOverride] = useState<CircleType | null>(null);
  const circleType: CircleType = circleTypeOverride || (circle?.circle_type as CircleType) || 'social';

  const handleCircleTypeChange = useCallback(async (type: CircleType) => {
    setCircleTypeOverride(type);
    if (id) {
      await supabase.from('custom_circles').update({ circle_type: type } as any).eq('id', id);
      supabase.channel(`circle-settings-${id}`).send({ type: 'broadcast', event: 'settings:change', payload: { circle_type: type } });
    }
  }, [id]);
  const ambientSound = useAmbientSoundscape(circleType, true);
  const ambientMusic = useAmbientMusic(lobbyConfig?.music_url);

  const localMember = members.find(m => m.user_id === user?.id);
  const localParticipantId = localMember?.id || '';

  const presentation = useCirclePresentation({ circleId: id, localParticipantId, userId: user?.id });
  const {
    isPresentationActive, presenterId, presentationSlides, currentSlide,
    presentationMode, showPresentDialog, presentUrlInput, focusMode,
    setFocusMode, setShowPresentDialog, setPresentUrlInput,
    broadcastSlideChange, stopPresenting, startPresenting, togglePresent,
  } = presentation;

  useEffect(() => {
    if (!id) return;
    localStorage.setItem('last-circle-id', id);
    supabase.from('custom_circles').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { if (data) setCircle(data as unknown as Circle); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`circle-atmosphere-${id}`) as AtmosphereDeckId;
    if (stored) setAtmosphereDeck(stored);
  }, [id]);

  useEffect(() => {
    if (!id || !user?.id || !profile) return;
    const refresh = async () => {
      let avatar: string | null = profile.userReferenceImageUrl || null;
      if (!avatar) {
        const { data: { session } } = await supabase.auth.getSession();
        avatar = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || null;
      }
      if (!avatar) avatar = profile.companionAvatarUrl || null;
      if (!avatar && connections?.length) avatar = connections[0]?.avatarUrl || null;
      if (avatar) {
        await supabase.from('circle_members').update({ avatar_url: avatar }).eq('circle_id', id).eq('user_id', user.id);
      }
    };
    refresh().catch(() => {});
  }, [id, user?.id, profile?.userReferenceImageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id && messages.length > 0) markCircleRead(id);
  }, [id, messages.length]);

  // Pass the Mic — broadcast + sync
  const handlePassMic = useCallback(async (toUserId: string) => {
    setActiveSpeakerId(toUserId);
    if (id) {
      await supabase.from('custom_circles').update({ active_speaker_id: toUserId } as any).eq('id', id);
      supabase.channel(`circle-speaker-${id}`).send({ type: 'broadcast', event: 'speaker:change', payload: { speakerId: toUserId } });
    }
  }, [id]);

  const handleReclaimMic = useCallback(async () => {
    setActiveSpeakerId(user?.id || null);
    if (id) {
      await supabase.from('custom_circles').update({ active_speaker_id: user?.id } as any).eq('id', id);
      supabase.channel(`circle-speaker-${id}`).send({ type: 'broadcast', event: 'speaker:change', payload: { speakerId: user?.id } });
    }
  }, [id, user?.id]);

  const handleOpenFloor = useCallback(async () => {
    setActiveSpeakerId(null);
    if (id) {
      await supabase.from('custom_circles').update({ active_speaker_id: null } as any).eq('id', id);
      supabase.channel(`circle-speaker-${id}`).send({ type: 'broadcast', event: 'speaker:change', payload: { speakerId: null } });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`circle-speaker-${id}`)
      .on('broadcast', { event: 'speaker:change' }, ({ payload }) => setActiveSpeakerId(payload?.speakerId ?? null))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Listen for circle type changes from host
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`circle-settings-${id}`)
      .on('broadcast', { event: 'settings:change' }, ({ payload }) => {
        if (payload?.circle_type) setCircleTypeOverride(payload.circle_type);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Companion gate
  const hasLinkedRef = useRef(false);
  useEffect(() => {
    if (!id || !user || !connections?.length || loading) return;
    if (hasLinkedRef.current) return;
    const chosenIds = localStorage.getItem(`circle-companion-${id}`);
    if (chosenIds !== null) {
      hasLinkedRef.current = true;
      const apply = async () => {
        const ids = chosenIds === 'none' ? [] : chosenIds.split(',').filter(Boolean);
        for (const mc of myCompanions) {
          if (!ids.includes(mc.member_id)) { try { await unlinkCompanion(mc.member_id, mc.companion_name); } catch (e) { logger.warn("[CircleChat] unlinkCompanion failed:", e); } }
        }
        const { data: existing } = await supabase.from('circle_companions').select('member_id').eq('circle_id', id).eq('user_id', user.id);
        const linked = new Set((existing || []).map((r: any) => r.member_id));
        for (const memberId of ids) {
          if (linked.has(memberId)) continue;
          const conn = connections.find(c => c.memberId === memberId);
          if (conn) { try { await linkCompanion(conn.memberId, conn.name, conn.avatarUrl); } catch (e) { logger.warn("[CircleChat] linkCompanion failed:", e); } }
        }
        localStorage.removeItem(`circle-companion-${id}`);
      };
      apply();
      return;
    }
    if (myCompanions.length > 0) { hasLinkedRef.current = true; return; }
    if (activeConnection) setShowCompanionGate(true);
    else hasLinkedRef.current = true;
  }, [id, user, connections?.length, loading, myCompanions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const userMsgCountRef = useRef(0);
  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending || !profile) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(msg, profile.userName, 'human');
      userMsgCountRef.current += 1;
      if (userMsgCountRef.current % 5 === 0 && user?.id) {
        const hist = messages.filter(m => m.user_id === user.id && m.sender_type === 'human')
          .slice(-10).map(m => ({ role: 'user' as const, content: m.content }));
        hist.push({ role: 'user', content: msg });
        if (hist.length >= 3) extractMemories(hist);
      }
    } catch { toast.error('Message failed to send'); }
    finally { setSending(false); }
  };

  const handleDelete = useCallback(async (messageId: string) => {
    if (circle?.creator_id !== user?.id) return;
    await supabase.from('circle_messages').delete().eq('id', messageId);
  }, [circle?.creator_id, user?.id]);

  if (!user || !profile) return null;

  const isOwner = circle?.creator_id === user.id;
  const unlinkedCompanions = connections?.filter(c => !myCompanions.some(mc => mc.member_id === c.memberId)) || [];
  const userIsAdult = isAdult(profile.dateOfBirth);
  const primaryComp = myCompanions[0];
  const isCompanionActive = primaryComp?.mode === 'active';

  const presenceList = [
    ...members.map(m => ({
      id: m.id,
      name: m.display_name || memberNames[m.user_id] || 'Member',
      avatar: m.avatar_url || (m.user_id === user.id ? profile.avatarUrl || null : null),
      type: 'human' as const,
      userId: m.user_id,
    })),
    ...allCircleCompanions.map(cc => ({
      id: cc.id,
      name: cc.companion_name,
      avatar: connections?.find(c => c.memberId === cc.member_id)?.avatarUrl || cc.avatar_url || null,
      type: 'companion' as const,
    })),
  ];

  const speakingIds = audioSpeaking && localParticipantId ? [localParticipantId] : [];

  const atmosphereGradient = atmosphereDeck !== 'none'
    ? (ATMOSPHERE_DECKS.find(d => d.id === atmosphereDeck) || ATMOSPHERE_DECKS[0]).gradient
    : 'linear-gradient(135deg, hsl(225 25% 6%), hsl(262 30% 12%), hsl(225 25% 8%))';

  const handleShareLink = async () => {
    if (!circle?.invite_code) return;
    const url = `${window.location.origin}/circles/join/${circle.invite_code}`;
    const shareData = { title: `Join ${circle.name}`, text: `Join "${circle.name}"`, url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); toast.success('Invite shared! ✨'); return; }
      catch (e: any) { if (e?.name === 'AbortError') return; }
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied! ✨');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">

      {/* ═══ SPATIAL ROOM ═══ */}
      <div data-spatial-room className="absolute inset-0">
        <SpatialRoom
          circleId={id!}
          userId={user.id}
          userName={profile.userName}
          circleType={circleType}
          onLeave={() => navigate('/circles')}
          members={members}
          messages={messages}
          sendMessage={sendMessage}
          connections={connections}
          profile={profile}
          subscription={subscription}
          activeConnection={activeConnection}
          atmosphereGradient={atmosphereGradient}
          camOn={camOn}
          onCamToggle={setCamOn}
          isPresenting={isPresentationActive}
          presenterId={presenterId || undefined}
          slides={presentationSlides}
          currentSlide={currentSlide}
          onSlideChange={broadcastSlideChange}
          presentationMode={presentationMode}
          onStopPresenting={stopPresenting}
          onAudioState={handleAudioState}
        />
      </div>

      {/* ═══ HOST PANEL ═══ */}
      <HostOverridePanel
        isOwner={isOwner}
        circleType={circleType}
        onCircleTypeChange={handleCircleTypeChange}
        activeSoundDeck={ambientSound.activeDeck}
        onSoundDeckChange={ambientSound.switchDeck}
        soundVolume={ambientSound.volume}
        onSoundVolumeChange={ambientSound.setVolume}
        activeAtmosphere={atmosphereDeck}
        onAtmosphereChange={(deck) => {
          setAtmosphereDeck(deck);
          if (id) localStorage.setItem(`circle-atmosphere-${id}`, deck);
        }}
        participants={presenceList}
        activeSpeakerId={activeSpeakerId}
        onPassMic={handlePassMic}
        onReclaimMic={handleReclaimMic}
        onOpenFloor={handleOpenFloor}
      />

      {/* ═══ GLASS HEADER ═══ */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1.5 px-2 py-2 border-b"
        style={{ background: 'hsl(240 20% 5% / 0.75)', borderColor: 'hsl(250 15% 18% / 0.3)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => navigate('/circles')} className="rounded-full p-1.5 hover:bg-white/5 transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{circle?.emoji || '🫧'}</span>
            <h2 className="font-display text-sm font-bold text-foreground truncate">{circle?.name || 'Circle'}</h2>
            {myCompanions.length > 0 && <Sparkles className="h-3 w-3 text-accent shrink-0" />}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {members.length} member{members.length !== 1 ? 's' : ''} · {allCircleCompanions.length} companion{allCircleCompanions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {myCompanions.length > 0 && (
            <button
              onClick={() => setMode(primaryComp.member_id, isCompanionActive ? 'quiet' : 'active')}
              className={`flex items-center gap-1 rounded-full p-1.5 sm:px-2.5 sm:py-1.5 text-[11px] font-semibold transition-all ${isCompanionActive ? 'bg-accent/20 text-accent border border-accent/30' : 'hover:bg-secondary text-muted-foreground border border-transparent'}`}
              title={isCompanionActive ? 'Companion: Active' : 'Companion: Quiet'}
            >
              {isCompanionActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isCompanionActive ? 'Active' : 'Quiet'}</span>
            </button>
          )}
          {circle?.invite_code && (
            <button onClick={handleShareLink} className="flex items-center gap-1 rounded-full p-1.5 sm:px-2.5 sm:py-1.5 text-[11px] font-semibold hover:bg-secondary text-muted-foreground transition-all" title="Invite">
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          )}
          <button onClick={() => setCamOn(v => !v)}
            className={`flex items-center gap-1 rounded-full p-1.5 sm:px-2.5 sm:py-1.5 text-[11px] font-semibold transition-all ${camOn ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-secondary text-muted-foreground'}`}
            title={camOn ? 'Camera off' : 'Camera on'}>
            {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
          </button>
          {isPresentationActive && (
            <button onClick={() => setFocusMode(f => !f)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${focusMode ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-secondary text-muted-foreground'}`}>
              <Focus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{focusMode ? 'Room' : 'Focus'}</span>
            </button>
          )}
          <button onClick={togglePresent}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${isPresentationActive ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'hover:bg-secondary text-muted-foreground'}`}>
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isPresentationActive ? 'Stop' : 'Present'}</span>
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="rounded-full p-1.5 hover:bg-secondary transition-colors" title="Members">
            <Users className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ═══ INFO PANEL ═══ */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="absolute top-[56px] left-0 right-0 z-20 overflow-y-auto max-h-[calc(100dvh-120px)] px-4 py-3 border-b"
            style={{ background: 'hsl(240 20% 5% / 0.9)', borderColor: 'hsl(250 15% 18% / 0.3)', backdropFilter: 'blur(16px)' }}>
            <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10">
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs text-muted-foreground mb-3 pr-8">{circle?.description}</p>
            {circle?.invite_code && (
              <div className="flex items-center gap-2 mb-3">
                <button onClick={handleShareLink} className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  <Share2 className="h-3.5 w-3.5" /> Share invite
                </button>
                {isOwner && (
                  <button onClick={() => { navigator.clipboard.writeText(circle.invite_code); toast.success('Code copied!'); }}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-colors">
                    <Copy className="h-3.5 w-3.5" /> {circle.invite_code}
                  </button>
                )}
              </div>
            )}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Companions</p>
              {myCompanions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 mb-2">No companions linked.</p>
              ) : (
                <div className="flex flex-col gap-1.5 mb-2">
                  {myCompanions.map(cc => {
                    const conn = connections?.find(c => c.memberId === cc.member_id);
                    return (
                      <div key={cc.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary/60 border border-border/50">
                        {cc.avatar_url ? <img src={cc.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                          : conn ? <AbstractAvatar memberId={conn.memberId} size="sm" />
                            : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20"><Sparkles className="h-3 w-3 text-accent" /></div>}
                        <span className="text-xs font-medium text-foreground flex-1">{cc.companion_name}</span>
                        <button onClick={() => setMode(cc.member_id, cc.mode === 'active' ? 'quiet' : 'active')}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${cc.mode === 'active' ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground border border-border'}`}>
                          {cc.mode === 'active' ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                          {cc.mode === 'active' ? 'Active' : 'Quiet'}
                        </button>
                        <button onClick={() => unlinkCompanion(cc.member_id, cc.companion_name)} className="rounded-full p-1 hover:bg-destructive/10 transition-colors">
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {unlinkedCompanions.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowAddCompanion(!showAddCompanion)} className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add companion
                  </button>
                  {showAddCompanion && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-10 overflow-hidden max-h-40 overflow-y-auto bg-popover border border-border">
                      {unlinkedCompanions.map(conn => (
                        <button key={conn.memberId} onClick={async () => { await linkCompanion(conn.memberId, conn.name, conn.avatarUrl); setShowAddCompanion(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors">
                          {conn.avatarUrl ? <img src={conn.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : <AbstractAvatar memberId={conn.memberId} size="sm" />}
                          <span className="text-foreground">{conn.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Members</p>
              <div className="flex flex-col gap-1.5">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary/40 border border-border/30">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">{(m.display_name || 'M').charAt(0).toUpperCase()}</div>}
                    <span className="text-xs text-foreground flex-1">{m.display_name || memberNames[m.user_id] || 'Member'}</span>
                    {m.user_id === user.id && <span className="text-[9px] text-muted-foreground/60">you</span>}
                    {m.role === 'owner' && <span className="text-[9px] font-semibold text-primary/70">owner</span>}
                  </div>
                ))}
              </div>
            </div>
            {lobbyConfig?.music_url && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">🎵 Background Music</p>
                <button onClick={ambientMusic.toggle}
                  className={`flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-xs transition-colors ${ambientMusic.playing ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-secondary/30 text-muted-foreground'}`}>
                  <span className="flex-1 text-left">{ambientMusic.playing ? 'Music Playing' : 'Music Paused'}</span>
                  <span>{ambientMusic.playing ? '🔊' : '🔇'}</span>
                </button>
              </div>
            )}
            {!isOwner && (
              <button onClick={async () => {
                if (!confirm('Leave this Circle?')) return;
                await supabase.from('circle_members' as any).delete().eq('circle_id', id).eq('user_id', user.id);
                toast.success('Left the Circle'); navigate('/circles');
              }} className="flex items-center gap-1 text-xs text-destructive hover:underline mt-2">Leave Circle</button>
            )}
            {isOwner && (
              <button onClick={async () => {
                if (!confirm('Clear all messages?')) return;
                await supabase.from('circle_messages' as any).delete().eq('circle_id', id);
                toast.success('Chat cleared');
              }} className="flex items-center gap-1 text-xs text-destructive hover:underline mt-2">Clear all messages</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ COLLAPSIBLE MESSAGE DRAWER ═══ */}
      <TranscriptSheet
        messages={messages}
        currentUserId={user.id}
        isOwner={isOwner}
        onDeleteMessage={handleDelete}
        circleEmoji={circle?.emoji}
        input={input}
        onInputChange={setInput}
        onSend={() => handleSend()}
        sending={sending}
        participantCount={presenceList.length}
        amplitude={audioAmplitude}
        isMuted={audioMuted}
        isSpeaking={audioSpeaking}
        onToggleMute={() => toggleMuteRef.current?.()}
        isPresenting={isPresentationActive}
        onTogglePresent={togglePresent}
        onInvite={circle?.invite_code ? handleShareLink : undefined}
      />

      {/* ═══ FOCUS / LECTURE MODE ═══ */}
      <AnimatePresence>
        {focusMode && isPresentationActive && (
          <SessionFocusMode
            slides={presentationSlides}
            currentSlide={currentSlide}
            onSlideChange={broadcastSlideChange}
            mode={presentationMode}
            isSpeaker={presenterId === localParticipantId}
            onExit={() => setFocusMode(false)}
            onStopPresenting={stopPresenting}
            messages={messages}
            currentUserId={user.id}
            isOwner={isOwner}
            onDeleteMessage={handleDelete}
            input={input}
            onInputChange={setInput}
            onSend={() => handleSend()}
            sending={sending}
            participants={presenceList}
            speakingIds={speakingIds}
            presenterId={presenterId || undefined}
          />
        )}
      </AnimatePresence>

      {/* ═══ PRESENT DIALOG ═══ */}
      <AnimatePresence>
        {showPresentDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => setShowPresentDialog(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5 bg-card border border-border shadow-2xl">
              <h3 className="text-base font-bold text-foreground mb-1">Start Presenting</h3>
              <p className="text-xs text-muted-foreground mb-2">Paste a URL — Google Slides, YouTube, Canva, Figma, or any link.</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {['Google Slides', 'YouTube', 'Canva', 'Figma', 'Loom', 'Miro'].map(p => (
                  <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{p}</span>
                ))}
              </div>
              <input value={presentUrlInput} onChange={e => setPresentUrlInput(e.target.value)}
                placeholder="Paste URL…"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border" />
              {presentUrlInput.trim() && (() => {
                const label = detectPlatformLabel(presentUrlInput.trim());
                return <p className={`text-[10px] mt-1.5 mb-2 ${label ? 'text-primary' : 'text-muted-foreground/70'}`}>{label ? `✓ ${label}` : 'Generic URL'}</p>;
              })()}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowPresentDialog(false)} className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors">Cancel</button>
                <button onClick={startPresenting} disabled={!presentUrlInput.trim()} className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground gradient-primary disabled:opacity-50 transition-all">Present</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ INVITE CARD ═══ */}
      <AnimatePresence>
        {showInviteCard && circle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => setShowInviteCard(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <CircleInviteCard
                circleName={circle.name} circleEmoji={circle.emoji} circleDescription={circle.description}
                inviteCode={circle.invite_code} memberCount={members.length}
                variant={userIsAdult ? 'adult' : 'kid'}
                onCopyLink={() => { handleShareLink(); setShowInviteCard(false); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ COMPANION ENTRY BANNER ═══ */}
      <AnimatePresence>
        {showCompanionGate && activeConnection && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-14 left-2 right-2 z-[25] flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'hsl(var(--card) / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid hsl(var(--border) / 0.3)' }}>
            {activeConnection.avatarUrl
              ? <img src={activeConnection.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/30 shrink-0" />
              : <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground text-xs font-bold shrink-0">{activeConnection.name.charAt(0)}</div>}
            <span className="text-xs text-foreground truncate flex-1">Bring <strong>{activeConnection.name}</strong> along?</span>
            <button onClick={() => { hasLinkedRef.current = true; setShowCompanionGate(false); }}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors shrink-0">Skip</button>
            <button onClick={async () => {
              hasLinkedRef.current = true; setShowCompanionGate(false);
              await linkCompanion(activeConnection.memberId, activeConnection.name, activeConnection.avatarUrl).catch(() => {});
            }} className="text-[11px] font-semibold text-primary-foreground px-3 py-1 rounded-lg gradient-primary hover:opacity-90 transition-all shrink-0">Yes ✨</button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
