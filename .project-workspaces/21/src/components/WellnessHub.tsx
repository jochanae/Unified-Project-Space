import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Smile, Heart, Sparkles, ChevronLeft, Check, Send, Flame, RefreshCw, TrendingUp, Target, Eye, EyeOff, ClipboardList, Loader2, Paperclip, BookmarkPlus, Compass } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { useWellness, getDailyAffirmation } from '@/hooks/useWellness';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import GoalsTracker from './GoalsTracker';
import PlansTab from './PlansTab';
import { useGoals } from '@/hooks/useGoals';
import { useSubscription } from '@/hooks/useSubscription';
import { useCompanionPlans } from '@/hooks/useCompanionPlans';
import CheckInFlow from './CheckInFlow';
import type { MoodLevel } from '@/lib/moodPrompts';
import { cn } from '@/lib/utils';

type WellnessTab = 'overview' | 'journal' | 'checkin' | 'mood' | 'gratitude' | 'goals' | 'plans';

interface CompanionBasic {
  memberId: string;
  name: string;
  avatarUrl?: string;
}

interface WellnessHubProps {
  userId: string;
  userName: string;
  primaryMemberId?: string;
  connections?: CompanionBasic[];
  onBack?: () => void;
  initialTab?: WellnessTab;
  activeConnectionNames?: string[];
  onVibeReward?: (action: 'goalComplete' | 'journalEntry' | 'moodCheckin') => void;
  onOpenChat?: (memberId: string) => void;
  onSaveToStory?: (entry: { content: string; imageUrl?: string }) => void;
}

export default function WellnessHub({ userId, userName, primaryMemberId, connections, onBack, initialTab, activeConnectionNames, onVibeReward, onOpenChat, onSaveToStory }: WellnessHubProps) {
  const [activeTab, setActiveTab] = useState<WellnessTab>(initialTab || 'overview');
  const wellness = useWellness(userId, userName, activeConnectionNames, primaryMemberId);
  const goalsHook = useGoals(userId);

  const handleCheckInComplete = async (data: {
    moodLevel: MoodLevel;
    moodEmoji: string;
    note?: string;
    journalContent?: string;
    promptShown?: string;
    promptType: string;
  }) => {
    const checkinResult = await wellness.addMoodCheckin(data.moodLevel, data.moodEmoji, data.note, {
      referenced: false,
      prompt_type: data.promptType,
      prompt_shown: data.promptShown || null,
    });
    onVibeReward?.('moodCheckin');

    const journalText = data.journalContent || data.note;
    if (journalText) {
      const moodLabels: Record<number, string> = { 1: 'rough', 2: 'low', 3: 'okay', 4: 'good', 5: 'great' };
      await wellness.addJournalEntry(
        journalText,
        data.promptShown,
        moodLabels[data.moodLevel] || undefined,
        false,
        'checkin',
        checkinResult?.id || undefined
      );
      onVibeReward?.('journalEntry');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'journal': return <JournalTab wellness={wellness} onBack={() => setActiveTab('overview')} onVibeReward={onVibeReward} connections={connections} userId={userId} onSaveToStory={onSaveToStory} />;
      case 'checkin':
      case 'mood':
        return <CheckInFlow onComplete={handleCheckInComplete} onBack={() => setActiveTab('overview')} companionName={activeConnectionNames?.[0] || connections?.[0]?.name} />;
      case 'gratitude': return <GratitudeTab wellness={wellness} onBack={() => setActiveTab('overview')} />;
      case 'goals': return <GoalsTracker userId={userId} onBack={() => setActiveTab('overview')} onGoalCompleted={() => onVibeReward?.('goalComplete')} />;
      case 'plans': return <PlansTab userId={userId} onBack={() => setActiveTab('overview')} onOpenChat={onOpenChat} />;
      default: return <OverviewTab wellness={wellness} userName={userName} onOpenTab={setActiveTab} goalsHook={goalsHook} userId={userId} />;
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-5" style={{ paddingBottom: 'max(16rem, calc(14rem + env(safe-area-inset-bottom, 0px)))' }}>
      <div className="mx-auto w-full max-w-lg">
        {/* Back breadcrumb removed — redundant with sticky header nav */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Overview ─── */
function OverviewTab({ wellness, userName, onOpenTab, goalsHook, userId }: { wellness: ReturnType<typeof useWellness>; userName: string; onOpenTab: (tab: WellnessTab) => void; goalsHook: ReturnType<typeof useGoals>; userId: string }) {
  const navigate = useNavigate();
  const firstName = userName.split(' ')[0];
  const affirmation = getDailyAffirmation();
  const completedCount = [wellness.hasJournaledToday, wellness.hasMoodToday, wellness.hasGratitudeToday].filter(Boolean).length;
  const plansHook = useCompanionPlans(userId);
  const planCount = plansHook.data?.length ?? 0;

  return (
    <>
      <h1 className="font-serif text-xl font-bold text-foreground">Your Space 🪞</h1>
      <p className="text-[11px] text-muted-foreground/60 mt-1">Your moment, {firstName}. Breathe.</p>

      {/* Daily Affirmation */}
      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Today's Affirmation</span>
        </div>
        <p className="text-sm italic text-foreground/85 leading-relaxed">"{affirmation}"</p>
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Today</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < completedCount ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{completedCount}/3</p>
        </div>

        <div className="flex-1 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-muted-foreground">Streak</span>
          </div>
          <p className="text-lg font-bold text-foreground">{wellness.journalStreak}</p>
          <p className="text-xs text-muted-foreground">day{wellness.journalStreak !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Mood Trend Chart */}
      {wellness.moods.length > 1 && (
        <div className="mt-4 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Mood Trend</span>
          </div>
          <MoodChart moods={wellness.moods.slice(0, 14)} />
        </div>
      )}

      {/* ── Mind ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-sm">🧠</span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Mind</h2>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>
        <div className="flex flex-col gap-3">
          <ActivityCard
            icon={BookOpen} title="Journal" subtitle={wellness.hasJournaledToday ? 'Done today ✓' : wellness.dailyPrompt}
            done={wellness.hasJournaledToday} onClick={() => onOpenTab('journal')}
          />
          <ActivityCard
            icon={Smile} title="Check-In" subtitle={wellness.hasMoodToday ? `Feeling ${wellness.moods[0]?.moodEmoji || ''}` : 'How are you feeling right now?'}
            done={wellness.hasMoodToday} onClick={() => onOpenTab('checkin')}
          />
          <ActivityCard
            icon={Heart} title="Gratitude" subtitle={wellness.hasGratitudeToday ? 'Done today ✓' : '3 things you\'re grateful for'}
            done={wellness.hasGratitudeToday} onClick={() => onOpenTab('gratitude')}
          />
        </div>
      </div>

      {/* ── Growth ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-sm">🌱</span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Growth</h2>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>
        <div className="flex flex-col gap-3">
          <ActivityCard
            icon={Target} title="Goals" subtitle={goalsHook.activeGoals.length > 0 ? `${goalsHook.activeGoals.length} active goal${goalsHook.activeGoals.length !== 1 ? 's' : ''}` : 'Set a personal goal'}
            done={false} onClick={() => onOpenTab('goals')}
          />
          <ActivityCard
            icon={ClipboardList} title="Plans" subtitle={planCount > 0 ? `${planCount} active plan${planCount !== 1 ? 's' : ''}` : 'View your plans'}
            done={false} onClick={() => onOpenTab('plans')}
          />
        </div>
      </div>

      {/* ── Discover ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-sm">🔮</span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Discover</h2>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>
        <div className="flex flex-col gap-3">
          <ActivityCard
            icon={Compass} title="My Blueprint" subtitle="Your self-discovery results"
            done={false} onClick={() => navigate('/personal-intel')}
          />
        </div>
      </div>
    </>
  );
}

/* ─── Mood Chart ─── */
function MoodChart({ moods }: { moods: ReturnType<typeof useWellness>['moods'] }) {
  const reversed = [...moods].reverse();
  const maxLevel = 5;
  const chartHeight = 60;

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
      {reversed.map((m, i) => {
        const height = (m.moodLevel / maxLevel) * chartHeight;
        const isLast = i === reversed.length - 1;
        return (
          <div key={m.id} className="flex flex-col items-center gap-1 min-w-[24px]">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`w-5 rounded-t-sm ${isLast ? 'bg-primary' : 'bg-primary/40'}`}
              title={`${m.moodEmoji} ${format(new Date(m.createdAt), 'MMM d')}`}
            />
            <span className="text-[10px]">{m.moodEmoji}</span>
            <span className="text-[8px] text-muted-foreground">{format(new Date(m.createdAt), 'd')}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityCard({ icon: Icon, title, subtitle, done, onClick }: {
  icon: typeof BookOpen; title: string; subtitle: string; done: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
        done ? 'border-primary/20 bg-primary/5' : 'border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-md'
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        done ? 'bg-primary/15' : 'bg-primary/10'
      }`}>
        {done ? <Check className="h-5 w-5 text-primary" /> : <Icon className="h-5 w-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
    </button>
  );
}

/* ─── Journal Tab ─── */
function JournalTab({ wellness, onBack, onVibeReward, connections, userId, onSaveToStory }: { wellness: ReturnType<typeof useWellness>; onBack: () => void; onVibeReward?: WellnessHubProps['onVibeReward']; connections?: CompanionBasic[]; userId: string; onSaveToStory?: (entry: { content: string; imageUrl?: string }) => void }) {
  // Journal write content — sessionStorage-backed so text survives accidental navigation away and back
  const [content, setContentRaw] = useState(() => sessionStorage.getItem('compani-journal-draft') || '');
  const setContent = (val: string | ((prev: string) => string)) => {
    setContentRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (next) sessionStorage.setItem('compani-journal-draft', next);
      else sessionStorage.removeItem('compani-journal-draft');
      return next;
    });
  };
  const [saving, setSaving] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(wellness.dailyPrompt);
  const [isPrivate, setIsPrivate] = useState(false);
  const [globalPrivate, setGlobalPrivate] = useState(false);

  // Photo attachment (premium only)
  const [journalPhoto, setJournalPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { subscribed: isPremium } = useSubscription(userId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = '';
    setPhotoUploading(true);
    try {
      const { compressImage } = await import('@/lib/imageCompression');
      const compressed = await compressImage(file);
      const fileName = `${userId}/journal-${Date.now()}.jpg`;
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.storage.from('companion-avatars').upload(fileName, compressed, { contentType: compressed.type, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
      setJournalPhoto(urlData.publicUrl);
    } catch (err) {
      console.error('[JournalTab] Photo upload failed:', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await wellness.addJournalEntry(content.trim(), selectedPrompt, undefined, isPrivate, undefined, undefined, journalPhoto || undefined);
    onVibeReward?.('journalEntry');
    setContent('');
    setJournalPhoto(null);
    sessionStorage.removeItem('compani-journal-draft');
    setSaving(false);
  };

  const handlePromptSelect = (nextPrompt: string) => {
    if (selectedPrompt === nextPrompt) {
      setSelectedPrompt('');
      setContent((current) => {
        const stripped = current.replace(nextPrompt + '\n\n', '').trim();
        return stripped;
      });
      return;
    }

    const previousPrompt = selectedPrompt;
    setSelectedPrompt(nextPrompt);

    setContent((current) => {
      let cleaned = current;
      if (previousPrompt) {
        cleaned = current.replace(previousPrompt + '\n\n', '');
      }
      const trimmed = cleaned.trim();
      if (!trimmed) {
        return `${nextPrompt}\n\n`;
      }
      return `${nextPrompt}\n\n${trimmed}`;
    });
  };

  const allPrompts = wellness.aiPrompts.length > 0
    ? wellness.aiPrompts
    : [wellness.dailyPrompt];

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Wellness
      </button>
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" /> Journal
      </h2>


      <button
        onClick={() => setGlobalPrivate(!globalPrivate)}
        className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
          globalPrivate
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border bg-card text-muted-foreground hover:border-primary/20'
        }`}
      >
        {globalPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {globalPrivate ? 'Private by default — entries hidden from companions' : 'Shared — companions can learn from entries'}
      </button>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-primary">
            {wellness.aiPrompts.length > 0 ? 'Personalized prompts' : 'Today\'s prompt'}
          </p>
          {!wellness.promptsLoading && (
            <button
              onClick={wellness.fetchAiPrompts}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
            >
              <RefreshCw className="h-3 w-3" /> New prompts
            </button>
          )}
        </div>
        {wellness.promptsLoading ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm text-muted-foreground animate-pulse">Generating personalized prompts…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {allPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePromptSelect(p)}
                className={`rounded-xl border p-2.5 text-left text-sm transition-all ${
                  selectedPrompt === p
                    ? 'border-primary/30 bg-primary/10 text-foreground/90'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/20'
                }`}
              >
                "{p}"
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 relative">
        <AnimatePresence>
          {selectedPrompt && content.startsWith(selectedPrompt) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="rounded-t-xl border border-b-0 border-border/30 bg-muted/30 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-foreground/80">{selectedPrompt}</p>
              <div className="mt-1.5 h-px bg-border/20" />
            </motion.div>
          )}
        </AnimatePresence>
        <Textarea
          placeholder={selectedPrompt && content.startsWith(selectedPrompt) ? "Your thoughts..." : "Write your thoughts…"}
          value={selectedPrompt && content.startsWith(selectedPrompt) ? content.replace(selectedPrompt + '\n\n', '') : content}
          onChange={e => {
            if (selectedPrompt && content.startsWith(selectedPrompt)) {
              setContent(selectedPrompt + '\n\n' + e.target.value);
            } else {
              setContent(e.target.value);
            }
          }}
          className={`min-h-[120px] resize-none placeholder:text-muted-foreground/50 placeholder:italic ${
            selectedPrompt && content.startsWith(selectedPrompt) ? 'rounded-t-none rounded-b-xl border-t-0' : 'rounded-xl'
          }`}
        />
        {/* Photo attachment — premium only */}
        {isPremium && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                journalPhoto
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/20'
              )}
            >
              {photoUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              {journalPhoto ? '✓ Photo attached' : 'Attach a photo'}
            </button>
            {journalPhoto && (
              <button
                onClick={() => setJournalPhoto(null)}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        )}

        {journalPhoto && (
          <img src={journalPhoto} alt="Attached" className="mt-2 w-full rounded-xl object-cover max-h-32 border border-border/30" />
        )}

        <div className="mt-2 flex items-center gap-2">
          <Button onClick={handleSave} disabled={!content.trim() || saving} className="flex-1 gap-2">
            <Send className="h-4 w-4" /> {saving ? 'Saving…' : journalPhoto ? 'Save Entry 📎' : 'Save Entry'}
          </Button>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            title={isPrivate ? 'Private — hidden from companions' : 'Shared — companions can learn from this'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isPrivate
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-border bg-card text-muted-foreground hover:border-primary/20'
            }`}
          >
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>


      {wellness.journals.filter(j => j.sourceType !== 'think_freely' && j.sourceType !== 'think_freely_shared').length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Past Entries</h3>
          <div className="flex flex-col gap-2">
            {wellness.journals.filter(j => j.sourceType !== 'think_freely' && j.sourceType !== 'think_freely_shared').map(j => (
              <div key={j.id} className="rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {j.prompt && <p className="text-[11px] text-primary/70 mb-1 italic">"{j.prompt}"</p>}
                <p className="text-sm text-foreground whitespace-pre-wrap">{j.content.replace(j.prompt ? j.prompt + '\n\n' : '', '')}</p>
                {j.imageUrl && (
                  <img
                    src={j.imageUrl}
                    alt="Journal attachment"
                    className="mt-2 w-full rounded-lg object-cover max-h-72"
                    loading="lazy"
                  />
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">{format(new Date(j.createdAt), 'MMM d, h:mm a')}</p>
                    {j.isPrivate && <span className="text-[10px] text-amber-500">🔒 Private</span>}
                    {j.moodTag && <span className="text-[10px] text-muted-foreground capitalize">· {j.moodTag}</span>}
                    {j.imageUrl && <span className="text-[10px] text-muted-foreground">📎</span>}
                  </div>
                  {onSaveToStory && !j.isPrivate && (
                    <button
                      onClick={() => onSaveToStory({ content: j.content, imageUrl: j.imageUrl || undefined })}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Save to Your Story"
                    >
                      <BookmarkPlus className="h-3 w-3" /> Story
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}

/* ─── Gratitude Tab ─── */
function GratitudeTab({ wellness, onBack }: { wellness: ReturnType<typeof useWellness>; onBack: () => void }) {
  const [items, setItems] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const filled = items.filter(i => i.trim());
    if (filled.length === 0) return;
    setSaving(true);
    await wellness.addGratitudeEntry(filled);
    setItems(['', '', '']);
    setSaving(false);
  };

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" /> Gratitude
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-3">3 things you're grateful for today</p>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-lg">{['🌟', '💛', '🌈'][i]}</span>
            <input
              type="text"
              value={item}
              onChange={e => {
                const updated = [...items];
                updated[i] = e.target.value;
                setItems(updated);
              }}
              placeholder={['Something that made you smile...', 'Someone you appreciate...', 'A moment of peace...'][i]}
              className="flex-1 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={!items.some(i => i.trim()) || saving} className="w-full mt-3 gap-2">
        <Heart className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Gratitude'}
      </Button>

      {wellness.gratitudes.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Past Entries</h3>
          <div className="flex flex-col gap-2">
            {wellness.gratitudes.map(g => (
              <div key={g.id} className="rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <ul className="space-y-1">
                  {g.items.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex items-center gap-2">
                      <span className="text-xs">{['🌟', '💛', '🌈'][i] || '✨'}</span> {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-1.5">{format(new Date(g.createdAt), 'MMM d, h:mm a')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
