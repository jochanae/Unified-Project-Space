import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import HomeDashboard from '@/components/HomeDashboard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { treatAsMinor } from '@/lib/ageUtils';
import MorningIntentOverlay, { getTodayIntent, fetchIntentHistoryFromDb } from '@/components/MorningIntentOverlay';
import { AnimatePresence } from 'framer-motion';
import AuraBleed, { getCompanionAuraColor } from '@/components/AuraBleed';
import FocusOverlay from '@/components/FocusOverlay';
import { useFocusMode } from '@/hooks/useFocusMode';
import FirstInscriptionOverlay, { hasSeenFirstInscription, hasFirstInscriptionMilestone } from '@/components/dashboard/FirstInscriptionOverlay';
import FirstNightSanctuary, { shouldShowFirstNight } from '@/components/dashboard/FirstNightSanctuary';
import DawnReflection, { shouldShowDawnReflection } from '@/components/dashboard/DawnReflection';
import OriginWeekReflection, { shouldShowOriginWeek, checkOriginWeekMilestone } from '@/components/dashboard/OriginWeekReflection';
import CenturionMilestone from '@/components/dashboard/CenturionMilestone';
import FounderPartnershipLetter, { shouldShowPartnershipLetter } from '@/components/dashboard/FounderPartnershipLetter';
import FirstSanctuaryOverlay, { hasSeenFirstSanctuary } from '@/components/dashboard/FirstSanctuaryOverlay';
import SanctuaryExitReflection from '@/components/dashboard/SanctuaryExitReflection';
import StrategistTile from '@/components/dashboard/StrategistTile';
import MomentumCard from '@/components/dashboard/MomentumCard';
import IntentRibbon from '@/components/dashboard/IntentRibbon';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import PostFocusBridgePill from '@/components/PostFocusBridgePill';
import { showPostFocusBridge } from '@/hooks/usePostFocusBridge';
import { hasPendingInsight } from '@/components/PrivateInsightCard';
import PushPermissionPrompt from '@/components/PushPermissionPrompt';

export default function MyWorldPage() {
  const {
    profile, companionMemberId, activeConnection, connections, favorites,
    badges, depthSignals, subscription, user, removeConnection, addConnection,
    updateConnection, updateProfile, archiveConnection, restoreConnection, fetchArchivedConnections,
    setActiveConnectionIndex,
  } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [archivedConnections, setArchivedConnections] = useState<typeof connections>([]);
  const [auraBleed, setAuraBleed] = useState<{ active: boolean; color: string }>({ active: false, color: '' });
  const focusMode = useFocusMode();
  const dashboardMode = useDashboardMode(user?.id);

  /* ── Instant refresh after a companion is added ──
   * When the user returns from /browse with a new connection, immediately
   * invalidate the favorites + profile caches so the Saved Moments strip
   * and companion list re-render without a manual reload.
   */
  const prevConnCount = useRef(connections.length);
  useEffect(() => {
    if (!user?.id) return;
    if (connections.length > prevConnCount.current) {
      queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    prevConnCount.current = connections.length;
  }, [connections.length, user?.id, queryClient]);

  /* Refresh on tab/window focus — covers cross-tab adds */
  useEffect(() => {
    if (!user?.id) return;
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id, queryClient]);

  /* ── Morning Intent state ── */
  const ceremoniesEnabled = profile?.circadianCeremonies ?? true;
  const currentHour = new Date().getHours();
  // Widened window: 5 AM – 11 AM (was 7–10)
  const isMorningWindow = currentHour >= 5 && currentHour < 11;
  // Start with false — we'll decide after DB hydration whether to show the overlay
  const [showMorningIntent, setShowMorningIntent] = useState(false);
  const [todayIntent, setTodayIntent] = useState<string | null>(() => getTodayIntent(user?.id));
  const [showFirstInscription, setShowFirstInscription] = useState(false);
  const [showFirstNight, setShowFirstNight] = useState(() => shouldShowFirstNight() && connections.length > 0);
  const [showDawnReflection, setShowDawnReflection] = useState(() => ceremoniesEnabled && shouldShowDawnReflection() && connections.length > 0);
  const [showOriginWeek, setShowOriginWeek] = useState(false);
  const [showCenturionMilestone, setShowCenturionMilestone] = useState(false);
  const [showPartnershipLetter, setShowPartnershipLetter] = useState(() => shouldShowPartnershipLetter() && connections.length > 0);
  const [showFirstSanctuary, setShowFirstSanctuary] = useState(false);
  const [showSanctuaryExit, setShowSanctuaryExit] = useState(false);
  

  /* ── Hydrate today's intent from DB, then decide whether to show overlay ── */
  useEffect(() => {
    if (!user?.id) return;
    const localIntent = getTodayIntent(user.id);
    if (localIntent) {
      // Already have it cached — no need to show overlay
      setTodayIntent(localIntent);
      return;
    }
    // Check DB before deciding to show the overlay
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('daily_intents').select('word').eq('user_id', user.id).eq('intent_date', today).maybeSingle()
      .then(({ data }) => {
        if (data?.word) {
          localStorage.setItem(`compani-morning-intent-${user.id}`, JSON.stringify({ word: data.word, date: today }));
          setTodayIntent(data.word);
        } else if (ceremoniesEnabled && isMorningWindow) {
          // No intent in DB either — now safe to show overlay
          setShowMorningIntent(true);
        }
      });
    // Also sync history cache from DB
    fetchIntentHistoryFromDb(user.id);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Origin Week: defer to server-side milestone check ── */
  useEffect(() => {
    if (!user?.id || connections.length === 0) return;
    if (!shouldShowOriginWeek(profile?.createdAt)) return;
    // localStorage says not seen, but verify against server
    checkOriginWeekMilestone(user.id).then((alreadySeen) => {
      if (!alreadySeen) setShowOriginWeek(true);
    });
  }, [user?.id, connections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (connections.length === 0 || hasSeenFirstInscription() || !user) return;
    const memberId = connections[0]?.memberId;
    if (!memberId) return;
    hasFirstInscriptionMilestone(user.id, memberId).then(seen => {
      if (seen) {
        // Already seen on server — sync localStorage
        localStorage.setItem('compani-first-inscription-seen', 'true');
      } else {
        setShowFirstInscription(true);
      }
    });
  }, [connections.length, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.active) {
        // Only show initiation ceremony the first time
        if (!hasSeenFirstSanctuary()) {
          setShowFirstSanctuary(true);
        }
      }
      if (detail?.active === false) {
        // Only show exit reflection for sessions longer than 60 seconds
        const elapsed = focusMode.elapsed;
        if (elapsed >= 60) {
          setShowSanctuaryExit(true);
        }
      }
    };
    window.addEventListener('focus-mode-change', handler);
    return () => window.removeEventListener('focus-mode-change', handler);
  }, [focusMode.elapsed]);

  useEffect(() => {
    fetchArchivedConnections().then(setArchivedConnections);
  }, [fetchArchivedConnections, connections.length]);

  useEffect(() => {
    if (!user?.id || !companionMemberId) { setWardrobeCount(0); return; }
    const fetchCount = async () => {
      const { count } = await supabase
        .from('user_gift_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('member_id', companionMemberId);
      setWardrobeCount(count || 0);
    };
    fetchCount();
  }, [user?.id, companionMemberId]);

  const handleRestoreData = useCallback(async () => {
    if (!user?.id) return;
    toast.loading('Scanning for lost companions…');
    try {
      const [{ data: milestones }, { data: messages }, { data: existingConns }] = await Promise.all([
        supabase.from('companion_milestones').select('member_id').eq('user_id', user.id),
        supabase.from('chat_messages').select('member_id').eq('user_id', user.id),
        supabase.from('connections').select('member_id').eq('user_id', user.id),
      ]);

      const connectedIds = new Set((existingConns || []).map((c: any) => c.member_id));
      const orphanIds = new Set<string>();
      for (const m of (milestones || [])) if (!connectedIds.has(m.member_id)) orphanIds.add(m.member_id);
      for (const m of (messages || [])) if (!connectedIds.has((m as any).member_id)) orphanIds.add((m as any).member_id);

      if (orphanIds.size === 0) {
        toast.dismiss();
        toast.info('No missing companions found. Try starting fresh with Cami!');
        return;
      }

      let restored = 0;
      for (const memberId of orphanIds) {
        const { data: post } = await supabase
          .from('companion_feed_posts')
          .select('member_name, member_handle, member_personality, member_bio, member_age, member_gender, member_avatar_url')
          .eq('user_id', user.id)
          .eq('member_id', memberId)
          .limit(1)
          .maybeSingle();

        await addConnection({
          memberId,
          name: post?.member_name || `Companion`,
          connectedAt: new Date().toISOString(),
          lastMessage: 'Reconnected 💛',
          isCreated: true,
          handle: post?.member_handle || undefined,
          personality: post?.member_personality || undefined,
          bio: post?.member_bio || undefined,
          age: post?.member_age || undefined,
          gender: post?.member_gender || undefined,
          avatarUrl: post?.member_avatar_url || undefined,
        } as any);
        restored++;
      }

      toast.dismiss();
      toast.success(`Restored ${restored} companion${restored > 1 ? 's' : ''}! 💛`);
    } catch (e) {
      toast.dismiss();
      toast.error('Restore failed — please try again');
      console.error('Restore data error:', e);
    }
  }, [user?.id, addConnection]);

  if (!profile) return null;

  const companionName = activeConnection?.name || profile.companionName || null;

  const handleRemoveCompanion = async (memberId: string) => {
    const conn = connections.find(c => c.memberId === memberId);
    if (!conn || !user) return;
    if (!confirm(`Remove ${conn.name}? This will delete your chat history with them.`)) return;
    await removeConnection(memberId, { deleteHistory: true });
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('member_id', memberId);
    toast.success(`${conn.name} has been removed`);
  };

  const handleUploadBackdrop = async (file: File) => {
    if (!user?.id || !companionMemberId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setUploadingBackdrop(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${companionMemberId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('companion-backdrops').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('companion-backdrops').getPublicUrl(path);
      const backgroundUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('connections').update({ background_url: backgroundUrl }).eq('user_id', user.id).eq('member_id', companionMemberId);
      updateConnection(companionMemberId, { backgroundUrl });

      try {
        await supabase.from('companion_media').insert({
          user_id: user.id,
          member_id: companionMemberId,
          media_type: 'backdrop',
          image_url: backgroundUrl,
          caption: 'Custom backdrop',
        });
      } catch {
        // Non-critical
      }

      toast.success('Backdrop updated! ✨');
    } catch (e) {
      console.error('Backdrop upload failed:', e);
      toast.error('Upload failed — try again');
    } finally {
      setUploadingBackdrop(false);
    }
  };

  const handleDeleteBackdrop = async () => {
    if (!user?.id || !companionMemberId) return;
    await supabase.from('connections').update({ background_url: null }).eq('user_id', user.id).eq('member_id', companionMemberId);
    updateConnection(companionMemberId, { backgroundUrl: undefined });
    toast.success('Backdrop removed');
  };

  return (
    <div>
      <PushPermissionPrompt />
      {/* Today's Intent — adaptive ribbon. Layers a mode-aware secondary
          phrase ("Strategic Momentum", etc.) on top of the morning word so
          the dashboard still notices the gear shift even though the
          Strategist tile now lives below the Greeting card. */}
      <IntentRibbon
        todayIntent={todayIntent}
        mode={dashboardMode}
        onSetIntent={user?.id ? () => setShowMorningIntent(true) : undefined}
      />

      <HomeDashboard
        userName={profile.userName}
        companion={{
          memberId: companionMemberId,
          name: companionName || undefined,
          avatarUrl: activeConnection?.avatarUrl,
          visualMode: profile.visualMode,
          lastMessage: activeConnection?.lastMessage,
          backgroundUrl: activeConnection?.backgroundUrl,
          connectionMode: activeConnection?.connectionMode || 'friend',
        }}
        connections={connections}
        favorites={favorites}
        messageCount={badges.messages}
        depthSignals={depthSignals}
        subscribed={subscription.subscribed}
        wardrobeCount={wardrobeCount}
        onOpenCompanion={() => {
          if (companionMemberId) navigate(`/chat/${companionMemberId}`);
          else navigate('/browse');
        }}
        onOpenMessages={() => navigate('/messages')}
        onOpenFavorites={() => navigate('/favorites')}
        onFindCompanion={() => navigate('/browse')}
        onOpenWellness={() => navigate('/wellness')}
        onOpenJournal={() => {
          sessionStorage.setItem('compani-journal-mode', 'write');
          navigate('/wellness?tab=journal');
        }}
        onOpenThinkFreely={() => navigate(activeConnection ? `/chat/${activeConnection.memberId}` : '/my-world')}
        onOpenPlans={() => navigate('/plans')}
        onOpenMoodCheckin={() => navigate('/wellness?tab=mood')}
        onOpenTimeline={() => navigate(activeConnection ? `/story?companion=${activeConnection.memberId}` : '/story')}
        onOpenThreads={() => navigate('/threads')}
        onOpenChat={(memberId) => navigate(`/chat/${memberId}`)}
        onUpgrade={() => navigate('/settings')}
        onRemoveCompanion={handleRemoveCompanion}
        onArchiveCompanion={(memberId) => archiveConnection(memberId)}
        onRestoreCompanion={async (memberId) => {
          await restoreConnection(memberId);
          const updated = await fetchArchivedConnections();
          setArchivedConnections(updated);
        }}
        onSwitchCompanion={(memberId) => {
          const idx = connections.findIndex(c => c.memberId === memberId);
          if (idx >= 0) {
            const target = connections[idx];
            const color = getCompanionAuraColor(target);
            setAuraBleed({ active: true, color });
            setTimeout(() => {
              setActiveConnectionIndex(idx);
              setTimeout(() => setAuraBleed({ active: false, color: '' }), 1200);
            }, 400);
          }
        }}
        archivedConnections={archivedConnections}
        onOpenStore={() => navigate('/store')}
        onOpenVault={() => navigate('/settings', { state: { scrollTo: 'vault' } })}
        onOpenBrowse={() => navigate('/browse')}
        onOpenStudio={() => navigate('/studio')}
        onRestoreData={handleRestoreData}
        isMinor={treatAsMinor(profile?.dateOfBirth)}
        onUploadBackdrop={handleUploadBackdrop}
        onDeleteBackdrop={handleDeleteBackdrop}
        uploadingBackdrop={uploadingBackdrop}
        userId={user!.id}
        profile={profile}
        updateProfile={updateProfile}
        focusMode={{ isFocusActive: focusMode.isFocusActive, elapsed: focusMode.elapsed, toggle: focusMode.toggle }}
        postGreetingSlot={
          <>
            {/* Post-Focus Bridge pill — appears above StrategistTile when a pending
                insight exists after a Sanctuary exit. Self-managed visibility. */}
            <PostFocusBridgePill primaryMemberId={connections[0]?.memberId} />
            <div className="px-4 mt-2 mb-1">
              <StrategistTile subscribed={subscription.subscribed} />
            </div>
            {user?.id && (
              <MomentumCard userId={user.id} primaryMemberId={connections[0]?.memberId} />
            )}
          </>
        }
      />

      {/* Focus / Flight Mode atmospheric overlay */}
      <FocusOverlay active={focusMode.isFocusActive} />

      {/* First Sanctuary — one-time initiation ceremony */}
      {showFirstSanctuary && (
        <FirstSanctuaryOverlay
          companionName={activeConnection?.name || connections[0]?.name}
          elapsed={focusMode.elapsed}
          onComplete={() => setShowFirstSanctuary(false)}
          onEndFocus={focusMode.deactivate}
        />
      )}

      {/* Sanctuary Exit — Re-emergence reflection */}
      {showSanctuaryExit && (
        <SanctuaryExitReflection
          companionName={activeConnection?.name || connections[0]?.name}
          elapsedSeconds={focusMode.elapsed}
          onDismiss={() => {
            setShowSanctuaryExit(false);
            // Post-Focus Bridge: only surface if a pending insight actually exists
            if (hasPendingInsight()) {
              // Small delay so the exit ceremony has fully cleared before the pill arrives
              setTimeout(() => showPostFocusBridge(), 600);
            }
          }}
        />
      )}

      {/* Aura Bleed — companion switch transition */}
      <AuraBleed active={auraBleed.active} color={auraBleed.color} />

      <AnimatePresence>
        {showMorningIntent && (
          <MorningIntentOverlay
            userName={profile.userName}
            userId={user?.id}
            onComplete={(word) => {
              setShowMorningIntent(false);
              if (word) setTodayIntent(word);
            }}
            onCenturionMilestone={() => setShowCenturionMilestone(true)}
          />
        )}
      </AnimatePresence>

      {/* First Inscription — one-time celebration when first companion is created */}
      {showFirstInscription && (
        <FirstInscriptionOverlay
          companionName={activeConnection?.name || connections[0]?.name || 'your companion'}
          userId={user?.id}
          memberId={connections[0]?.memberId}
          onDismiss={() => setShowFirstInscription(false)}
        />
      )}

      {/* First Night — sanctuary greeting for first late-night session */}
      {showFirstNight && !showFirstInscription && (
        <FirstNightSanctuary
          companionName={activeConnection?.name || connections[0]?.name}
          onDismiss={() => setShowFirstNight(false)}
          onStartConversation={() => {
            setShowFirstNight(false);
            if (companionMemberId) navigate(`/chat/${companionMemberId}`);
          }}
        />
      )}

      {/* Dawn Reflection — golden hour ritual for first early-morning session.
          If an intent already exists for today, hide the "Set Intent" CTA so we don't
          re-prompt the user for something they've already done. */}
      {showDawnReflection && !showFirstInscription && !showFirstNight && (
        <DawnReflection
          companionName={activeConnection?.name || connections[0]?.name}
          onDismiss={() => setShowDawnReflection(false)}
          onSetIntent={todayIntent ? undefined : () => {
            setShowDawnReflection(false);
            setShowMorningIntent(true);
          }}
        />
      )}

      {/* Origin Week — 7-day anniversary reflection */}
      {showOriginWeek && !showFirstInscription && !showFirstNight && !showDawnReflection && (
        <OriginWeekReflection
          companionName={activeConnection?.name || connections[0]?.name}
          userId={user?.id}
          memberId={activeConnection?.memberId || connections[0]?.memberId}
          profileCreatedAt={profile?.createdAt}
          onDismiss={() => setShowOriginWeek(false)}
        />
      )}

      {/* Centurion Milestone — 100th intent celebration */}
      {showCenturionMilestone && (
        <CenturionMilestone
          companionName={activeConnection?.name || connections[0]?.name}
          onDismiss={() => setShowCenturionMilestone(false)}
        />
      )}

      {/* Founder's Partnership Letter — 24h after centurion milestone */}
      {showPartnershipLetter && !showCenturionMilestone && (
        <FounderPartnershipLetter
          userName={profile.userName}
          companionName={activeConnection?.name || connections[0]?.name}
          onDismiss={() => setShowPartnershipLetter(false)}
        />
      )}

    </div>
  );
}
