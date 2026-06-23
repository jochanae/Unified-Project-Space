import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Compass, RefreshCw, Sparkles, MessageCircle, User, Plus, Target } from 'lucide-react';
import CinematicHeader from '@/components/shared/CinematicHeader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { discoveryTopics, getDiscoveryTopic } from '@/lib/discoveryTopics';
import type { DiscoveryTopic } from '@/lib/discoveryTopics';
import DiscoverySheet from '@/components/DiscoverySheet';
import BlueprintAssessment from '@/components/BlueprintAssessment';

/* ── Theme groups ── */
const themeGroups = [
  {
    label: 'Social Dynamics',
    emoji: '🤝',
    topicIds: ['attachment-style', 'conflict-style', 'communication-style'],
  },
  {
    label: 'Core Values',
    emoji: '💎',
    topicIds: ['love-languages', 'apology-language', 'values-mapping'],
  },
  {
    label: 'Growth',
    emoji: '🌱',
    topicIds: ['emotional-intelligence', 'boundaries-style', 'stress-response', 'enneagram'],
  },
  {
    label: 'Expression',
    emoji: '✨',
    topicIds: ['expression-style'],
  },
];

interface DiscoveryResultRow {
  id: string;
  topic: string;
  result_key: string;
  result_label: string;
  result_emoji: string;
  result_description: string | null;
  secondary_key: string | null;
  secondary_label: string | null;
  completed_at: string;
  answers?: Record<string, any>;
}

export default function PersonalIntelPage() {
  const navigate = useNavigate();
  const { user, connections } = useAppContext();
  const [sheetTopic, setSheetTopic] = useState<DiscoveryTopic | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [choiceTopicId, setChoiceTopicId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  const companion = connections[0];

  const { data: results = [], refetch } = useQuery({
    queryKey: ['discovery-results', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('discovery_results')
        .select('*')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false });
      return (data || []) as unknown as DiscoveryResultRow[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-app-scroller]');
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled(el.scrollTop > 60);
          ticking = false;
        });
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (!user) return null;

  const onboardingEntry = results.find(r => r.topic === 'onboarding');
  const quizResults = results.filter(r => r.topic !== 'onboarding');
  const completedTopicIds = new Set(quizResults.map((r) => r.topic));
  const resultsByTopic = new Map(quizResults.map((r) => [r.topic, r]));
  const progress = completedTopicIds.size;
  const total = discoveryTopics.length;

  const openSolo = (topicId: string) => {
    const t = getDiscoveryTopic(topicId);
    if (t) { setSheetTopic(t); setSheetOpen(true); }
    setChoiceTopicId(null);
  };

  const openWithCompanion = (topicId: string) => {
    setChoiceTopicId(null);
    if (companion?.memberId) {
      sessionStorage.setItem('discoveryContext', topicId);
      navigate(`/chat/${companion.memberId}`);
    }
  };

  const handleTopicTap = (topicId: string) => {
    if (companion) setChoiceTopicId(topicId);
    else openSolo(topicId);
  };

  const deleteResult = async (topicId: string) => {
    await supabase
      .from('discovery_results')
      .delete()
      .eq('user_id', user!.id)
      .eq('topic', topicId);
    refetch();
  };

  // SVG progress ring
  const ringSize = scrolled ? 28 : 52;
  const strokeWidth = scrolled ? 2.5 : 3;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / total) * circumference;

  return (
    <div>
      <CinematicHeader
        scrolled={scrolled}
        onBack={() => navigate(-1)}
        title="My Compass"
        subtitle="Know your direction. Move with intention."
        compactIcon={
          <div className="relative flex items-center justify-center">
            <svg width={28} height={28} className="-rotate-90">
              <circle cx={14} cy={14} r={12} fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth={2.5} />
              <circle cx={14} cy={14} r={12} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 12}
                strokeDashoffset={2 * Math.PI * 12 - (progress / total) * 2 * Math.PI * 12}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground tabular-nums">{progress}</span>
          </div>
        }
        compactTrailing={<>{progress}/{total}</>}
        expandedDetail={
          <div className="flex items-center gap-3 rounded-xl border-[0.5px] border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="relative flex items-center justify-center">
              <svg width={52} height={52} className="-rotate-90">
                <circle cx={26} cy={26} r={23.5} fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth={3} />
                <motion.circle
                  cx={26} cy={26} r={23.5}
                  fill="none" stroke="hsl(var(--primary))" strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 23.5}
                  initial={{ strokeDashoffset: 2 * Math.PI * 23.5 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 23.5 - (progress / total) * 2 * Math.PI * 23.5 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground tabular-nums">{progress}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>{progress} of {total} discovered</p>
              <p className="text-[11px] text-white/50 mt-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                {progress === 0 ? 'Start your self-discovery journey' :
                 progress === total ? 'All topics unlocked ✨' :
                 `${total - progress} more to explore`}
              </p>
            </div>
          </div>
        }
      />

      {/* Scrollable content */}
      <div
        className="px-5 pt-4 pb-40 space-y-8"
        style={{
          paddingBottom: 'max(10rem, calc(8rem + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {!onboardingEntry && (
          <div
            className="mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 p-5 text-center"
            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(212,175,80,0.15)' }}
          >
            <p className="text-sm font-semibold text-white/80 mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              Your Blueprint is empty
            </p>
            <p className="text-[12px] text-white/50 mb-4" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
              Three quick questions to help your companion understand what you actually need.
            </p>
            <button
              onClick={() => setShowAssessment(true)}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                boxShadow: '0 0 20px rgba(212,175,80,0.2), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              Start my Blueprint
            </button>
          </div>
        )}

        {onboardingEntry && (
          <section className="mb-8">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-sm">🌱</span>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>How I Started</h2>
              <div className="flex-1 h-px bg-white/[0.04]" />
              <button
                onClick={() => setShowAssessment(true)}
                className="text-[10px] text-primary/50 hover:text-primary transition-colors"
              >
                Retake →
              </button>
            </div>
            <div
              className="rounded-2xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 p-4"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(212,175,80,0.15)' }}
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                When I first arrived
              </p>
              <p className="text-sm text-white/80 leading-relaxed mb-3" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {onboardingEntry.result_description || ''}
              </p>
              {onboardingEntry.answers && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    (onboardingEntry.answers as any).why,
                    (onboardingEntry.answers as any).support,
                  ].filter(Boolean).map((tag: string) => (
                    <span key={tag} className="rounded-full bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 text-[11px] text-white/60">
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {themeGroups.map((group) => {
          const groupTopics = group.topicIds.map((id) => discoveryTopics.find((t) => t.id === id)).filter(Boolean) as DiscoveryTopic[];
          const completedInGroup = groupTopics.filter((t) => completedTopicIds.has(t.id));
          const availableInGroup = groupTopics.filter((t) => !completedTopicIds.has(t.id));

          if (groupTopics.length === 0) return null;

          return (
            <section key={group.label}>
              {/* Theme header */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-sm">{group.emoji}</span>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>{group.label}</h2>
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-[10px] text-white/40 tabular-nums" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{completedInGroup.length}/{groupTopics.length}</span>
              </div>

              {/* Completed results in this group */}
              {completedInGroup.length > 0 && (
                <div className="grid grid-cols-1 gap-3 mb-3">
                  {completedInGroup.map((topic, i) => {
                    const r = resultsByTopic.get(topic.id);
                    if (!r) return null;
                    return (
                      <CompletedCard
                        key={r.id}
                        result={r}
                        topicMeta={topic}
                        index={i}
                        choiceTopicId={choiceTopicId}
                        companion={companion}
                      onTap={handleTopicTap}
                      onDelete={deleteResult}
                        onSolo={openSolo}
                        onCompanion={openWithCompanion}
                        onCancelChoice={() => setChoiceTopicId(null)}
                        onPractice={topic.id === 'expression-style' ? () => {
                          const firstConn = connections[0];
                          if (firstConn?.memberId) {
                            navigate(`/chat/${firstConn.memberId}?practice=1`);
                          }
                        } : undefined}
                      />
                    );
                  })}
                </div>
              )}

              {/* Available topics in this group */}
              {availableInGroup.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {availableInGroup.map((topic, i) => (
                    <AvailableCard
                      key={topic.id}
                      topic={topic}
                      index={completedInGroup.length + i}
                      choiceTopicId={choiceTopicId}
                      companion={companion}
                      onTap={handleTopicTap}
                      onSolo={openSolo}
                      onCompanion={openWithCompanion}
                      onCancelChoice={() => setChoiceTopicId(null)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {progress === 0 && discoveryTopics.length === 0 && (
          <div className="text-center py-12">
            <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No discovery topics available yet.</p>
          </div>
        )}
      </div>

      <DiscoverySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        topic={sheetTopic}
        userId={user.id}
        onComplete={() => refetch()}
      />

      {showAssessment && (
        <BlueprintAssessment
          onComplete={async (answers) => {
            await supabase.from('discovery_results').upsert({
              user_id: user!.id,
              topic: 'onboarding',
              result_key: answers.why,
              result_label: answers.whyMode,
              result_emoji: '🌱',
              result_description: answers.snapshot || null,
              answers: answers as any,
            }, { onConflict: 'user_id,topic' });

            const bioContext = [
              `Looking for: ${answers.why.replace(/_/g, ' ')}.`,
              `Responds best to: ${answers.support.replace(/_/g, ' ')} energy.`,
              answers.snapshot ? `Important: ${answers.snapshot}` : '',
            ].filter(Boolean).join(' ');

            await supabase
              .from('profiles')
              .update({ bio: bioContext })
              .eq('user_id', user!.id);

            setShowAssessment(false);
            refetch();
          }}
          onSkip={() => setShowAssessment(false)}
        />
      )}
    </div>
  );
}

/* ── Completed Result Card ── */
function CompletedCard({
  result: r, topicMeta, index, choiceTopicId, companion, onTap, onDelete, onSolo, onCompanion, onCancelChoice, onPractice,
}: {
  result: DiscoveryResultRow;
  topicMeta: DiscoveryTopic;
  index: number;
  choiceTopicId: string | null;
  companion: any;
  onTap: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onSolo: (id: string) => void;
  onCompanion: (id: string) => void;
  onCancelChoice: () => void;
  onPractice?: () => void;
}) {
  return (
    <div
      className="group relative rounded-2xl"
    >
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
      />
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/[0.04] blur-3xl -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-primary/[0.03] blur-2xl translate-y-8 -translate-x-8" />

      <div
        className="relative border border-white/[0.12] rounded-2xl p-4 overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(212,175,80,0.18), 0 4px 24px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div
              className="flex items-center justify-center h-14 w-14 rounded-2xl border border-primary/20"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
                boxShadow: '0 0 20px rgba(212,175,80,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-3xl">{r.result_emoji}</span>
            </div>
            <div className="absolute inset-0 rounded-2xl border border-primary/10 animate-pulse opacity-40" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
              {topicMeta.title}
            </p>
            <p className="text-[15px] font-bold text-white leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>{r.result_label}</p>
            {r.secondary_label && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] border border-white/[0.1] text-white/50">
                also {r.secondary_label}
              </span>
            )}
            {r.result_description && (
              <p className="text-[12px] text-white/80 leading-[1.7] mt-2 line-clamp-3" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>
                {r.result_description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
          {r.topic === 'expression-style' && onPractice ? (
            <button
              onClick={onPractice}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full border border-primary/25 hover:border-primary/40 bg-primary/[0.06]"
            >
              <Target size={13} />
              Practice Your Voice
            </button>
          ) : <div />}
          <button
            onClick={async () => { await onDelete(r.topic); }}
            className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            <RefreshCw size={13} />
            Retake
          </button>
        </div>
      </div>

      {choiceTopicId === r.topic && (
        <ChoicePopover
          topicId={r.topic}
          companionName={companion?.name}
          onSolo={onSolo}
          onCompanion={onCompanion}
          onCancel={onCancelChoice}
        />
      )}
    </div>
  );
}

/* ── Available Topic Card ── */
function AvailableCard({
  topic, index, choiceTopicId, companion, onTap, onSolo, onCompanion, onCancelChoice,
}: {
  topic: DiscoveryTopic;
  index: number;
  choiceTopicId: string | null;
  companion: any;
  onTap: (id: string) => void;
  onSolo: (id: string) => void;
  onCompanion: (id: string) => void;
  onCancelChoice: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onTap(topic.id)}
        className="w-full rounded-2xl border border-white/[0.14] hover:border-primary/20 px-4 py-5 flex flex-col items-center gap-2.5 transition-all group text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div className="absolute top-2.5 right-2.5 flex items-center justify-center h-5 w-5 rounded-full bg-white/[0.06] border border-white/[0.08] group-hover:border-primary/30 group-hover:bg-primary/10 transition-all">
          <Plus size={10} className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
        </div>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.06), transparent 70%)' }}
        />

        <div
          className="relative flex items-center justify-center h-12 w-12 rounded-xl opacity-75 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(135deg, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.1))' }}
        >
          <span className="text-2xl">{topic.emoji}</span>
        </div>
        <div className="relative">
          <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>{topic.title}</p>
        </div>
      </button>

      {choiceTopicId === topic.id && (
        <ChoicePopover
          topicId={topic.id}
          companionName={companion?.name}
          onSolo={onSolo}
          onCompanion={onCompanion}
          onCancel={onCancelChoice}
        />
      )}
    </div>
  );
}

/* ── Choice Popover ── */
function ChoicePopover({ topicId, companionName, onSolo, onCompanion, onCancel }: {
  topicId: string; companionName?: string; onSolo: (id: string) => void; onCompanion: (id: string) => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="absolute left-0 right-0 bottom-full mb-1.5 z-20 rounded-2xl bg-background/95 backdrop-blur-xl border border-white/[0.12] shadow-xl overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,80,0.1)' }}
    >
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSolo(topicId)}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors"
        >
          <User size={16} className="text-primary/60" />
          <div>
            <p className="text-sm font-medium text-foreground">On my own</p>
            <p className="text-[11px] text-muted-foreground/50">Quick interactive quiz</p>
          </div>
        </button>
        <button
          onClick={() => onCompanion(topicId)}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors"
        >
          <MessageCircle size={16} className="text-primary/60" />
          <div>
            <p className="text-sm font-medium text-foreground">With {companionName || 'companion'}</p>
            <p className="text-[11px] text-muted-foreground/50">Discuss & discover together</p>
          </div>
        </button>
      </div>
      <button
        onClick={onCancel}
        className="w-full text-center text-[11px] text-muted-foreground/40 py-2 border-t border-white/[0.06] hover:text-muted-foreground/60"
      >
        Cancel
      </button>
    </motion.div>
  );
}
