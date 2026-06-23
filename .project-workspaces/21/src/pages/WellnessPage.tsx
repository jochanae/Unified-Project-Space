import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import WellnessHub from '@/components/WellnessHub';
import { useVibePoints } from '@/hooks/useVibePoints';
import DiscoveryHint from '@/components/DiscoveryHint';
import { DISCOVERY_KEYS } from '@/hooks/useFeatureDiscovery';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import CinematicHeader from '@/components/shared/CinematicHeader';

export default function WellnessPage() {
  const { user, profile, connections, saveAutoMoment } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'journal' | 'mood' | 'gratitude' | 'plans' | null;
  const { reward } = useVibePoints(user?.id ?? null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector('[data-app-scroller]') || document.querySelector('main') || document.documentElement;
    const onScroll = () => setScrolled((el as HTMLElement).scrollTop > 60);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (!user || !profile) return null;

  const primaryMemberId = connections[0]?.memberId;
  const isMoodTab = initialTab === 'mood';
  const isLandingView = !initialTab || initialTab === 'overview' as string;
  const firstName = profile.userName?.split(' ')[0] || '';

  return (
    <div>
      {!isMoodTab && (
        <CinematicHeader
          scrolled={scrolled}
          onBack={() => navigate(-1)}
          title="Your Space 🪞"
          subtitle={`Your moment, ${firstName}. Breathe.`}
          compactIcon={
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          }
          compactTitle="Your Space"
          expandedDetail={
            <div className="flex items-center gap-3 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>Journal, reflect, grow</p>
                <p className="text-[11px] text-white/50 mt-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Track your mood, set goals, stay grounded</p>
              </div>
            </div>
          }
        />
      )}
      {isLandingView && (
        <div className="px-4 pt-2">
          <DiscoveryHint featureKey={DISCOVERY_KEYS.WELLNESS_TAB} userId={user.id} icon="🌿" title="Your Space" body="Journal, track your mood, and get a daily presence moment." />
        </div>
      )}
      <WellnessHub
        userId={user.id}
        userName={profile.userName}
        primaryMemberId={primaryMemberId}
        connections={connections.map(c => ({ memberId: c.memberId, name: c.name, avatarUrl: c.avatarUrl }))}
        onBack={() => navigate('/')}
        initialTab={initialTab || undefined}
        activeConnectionNames={connections.map(c => c.name)}
        onVibeReward={reward}
        onOpenChat={(memberId) => navigate(`/chat/${memberId}`)}
        onSaveToStory={(entry) => {
          if (primaryMemberId) {
            saveAutoMoment({ memberId: primaryMemberId, content: entry.content, source: 'milestone', imageUrl: entry.imageUrl });
            toast.success('Saved to Your Story ✨');
          }
        }}
      />
    </div>
  );
}
