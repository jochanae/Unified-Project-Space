import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { getStoredAnchor, anchorToRoute } from '@/hooks/useHomeAnchor';
// ThinkFreelyHome retired — Privacy Mode is now in ChatInterface
import FindFriendSheet from '@/components/FindFriendSheet';
import WelcomeEnvelope, { hasSeenWelcome, markSpaceUnlocked } from '@/components/WelcomeEnvelope';
import BlueprintAnnouncementModal, { hasSeenBlueprintAnnouncement } from '@/components/BlueprintAnnouncementModal';
import MorningWake, { shouldShowMorningWake } from '@/components/MorningWake';
import ExpansionUpdateOverlay, { hasSeenExpansionUpdate } from '@/components/dashboard/ExpansionUpdateOverlay';
import { useBetaSerial } from '@/hooks/useBetaSerial';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';

/**
 * Branded shimmer — plays AFTER the Founder's Letter completes.
 * Bridges the personal/poetic letter into the interactive Studio.
 */
function BrandedTransition({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 1000);
      }}
      className="fixed inset-0 z-[99] flex flex-col items-center justify-center"
      style={{ background: '#0A0B1E' }}
    >
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.6, 1, 0.6],
          filter: [
            'drop-shadow(0 0 8px rgba(212,175,80,0.2))',
            'drop-shadow(0 0 30px rgba(212,175,80,0.5))',
            'drop-shadow(0 0 8px rgba(212,175,80,0.2))',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-primary"
      >
        <Crown size={36} strokeWidth={1} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-6 text-[10px] uppercase tracking-[0.4em] text-primary/40 font-medium"
      >
        Preparing your space…
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile, connections, subscription } = useAppContext();
  const betaSerial = useBetaSerial();
  const ceremoniesEnabled = profile?.circadianCeremonies ?? true;
  const [showFindFriend, setShowFindFriend] = useState(false);

  // ── Ceremony: Envelope (with optional invite code gate) → Crown Shimmer ──
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome());
  const [showTransition, setShowTransition] = useState(false);

  const [showBlueprint, setShowBlueprint] = useState(() => !hasSeenBlueprintAnnouncement() && !!profile?.onboardingCompleted && connections.length > 0 && hasSeenWelcome());
  const [showDawn, setShowDawn] = useState(() => ceremoniesEnabled && shouldShowMorningWake());

  // Expansion update — Genesis Architects only
  const isGenesisOrigin = betaSerial !== null && betaSerial <= 100 && localStorage.getItem('compani-origin-partner') === 'true';
  const [showExpansion, setShowExpansion] = useState(() => isGenesisOrigin && !hasSeenExpansionUpdate());

  // ── Redirect to anchored home ──
  useEffect(() => {
    const anchor = getStoredAnchor();
    const route = anchorToRoute(anchor, connections[0]?.memberId);
    if (route !== '/') {
      navigate(route, { replace: true });
    } else {
      navigate('/my-world', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile || !user) return null;

  const companionBasics = connections.map(c => ({
    memberId: c.memberId,
    name: c.name,
    avatarUrl: c.avatarUrl,
  }));

  const primaryCompanionName = connections.length > 0 ? connections[0].name : 'Cami';

  const hasOverlay = showWelcome || showTransition || showExpansion;

  return (
    <>
      {/* Envelope — includes invite code gate for new users */}
      {showWelcome && (
        <WelcomeEnvelope
          userName={profile.userName}
          betaSerial={betaSerial}
          hasCompanion={connections.length > 0}
          requireInviteCode={true}
          isBackfilledMember={connections.length > 0}
          onComplete={() => {
            setShowWelcome(false);
            if (connections.length === 0) {
              // Direct dissolve into Studio — no intermediate shimmer
              navigate('/studio?from=ceremony');
            } else {
              // Returning user with companions — shimmer then dashboard
              setShowTransition(true);
            }
          }}
        />
      )}

      {/* Crown shimmer — only for returning users with companions */}
      <AnimatePresence>
        {showTransition && (
          <BrandedTransition
            onComplete={() => {
              setShowTransition(false);
              markSpaceUnlocked();
            }}
          />
        )}
      </AnimatePresence>

      {!hasOverlay && showExpansion && betaSerial && (
        <ExpansionUpdateOverlay
          serialNumber={betaSerial}
          onComplete={() => setShowExpansion(false)}
        />
      )}
      {!hasOverlay && showDawn && <MorningWake onComplete={() => setShowDawn(false)} />}
      {!hasOverlay && showBlueprint && !showWelcome && (
        <BlueprintAnnouncementModal
          companionName={primaryCompanionName}
          onClose={() => setShowBlueprint(false)}
        />
      )}
      {!showWelcome && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-6">
          <p className="text-muted-foreground text-sm">Redirecting...</p>
        </div>
      )}
      <FindFriendSheet open={showFindFriend} onClose={() => setShowFindFriend(false)} />
    </>
  );
}
