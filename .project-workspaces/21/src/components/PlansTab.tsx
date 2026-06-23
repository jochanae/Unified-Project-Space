// PERF: 2026-03-15 — Added skeleton loaders — eliminates layout shift during data load
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Check, CheckCircle2, Calendar, ChevronDown, ChevronRight, BookOpen, MessageSquareQuote, Pencil, X, GripVertical, Waves, Languages, Volume2, Trash2, Bookmark, Lightbulb, Brain, UtensilsCrossed, HelpCircle, Sparkles } from 'lucide-react';
import CinematicHeader from '@/components/shared/CinematicHeader';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCompanionPlans, CompanionPlan } from '@/hooks/useCompanionPlans';
import { sendPlanCompletionToChat } from '@/lib/sendPlanCompletionToChat';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';
import DiscoveryHint from '@/components/DiscoveryHint';
import { DISCOVERY_KEYS } from '@/hooks/useFeatureDiscovery';

interface PlansTabProps {
  userId: string;
  onBack: () => void;
  onOpenChat?: (memberId: string) => void;
}

export default function PlansTab({ userId, onBack, onOpenChat }: PlansTabProps) {
  const { user, profile, connections } = useAppContext();
  const plansHook = useCompanionPlans(userId);
  const allPlans = plansHook.data ?? [];
  const [activeTab, setActiveTab] = useState<'plans' | 'rhythms' | 'saved'>('plans');
  const plans = activeTab === 'rhythms'
    ? allPlans.filter(p => p.isRhythm)
    : allPlans.filter(p => !p.isRhythm);

  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirmingPlanId, setConfirmingPlanId] = useState<string | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanEmoji, setNewPlanEmoji] = useState('📋');
  const [newPlanTime, setNewPlanTime] = useState('');
  const [newPlanFrequency, setNewPlanFrequency] = useState<string>('Once');
  const [newPlanCustomFreq, setNewPlanCustomFreq] = useState('');
  const [newPlanIsRhythm, setNewPlanIsRhythm] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [newPlanSteps, setNewPlanSteps] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingTitlePlanId, setEditingTitlePlanId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [editingStepPlanId, setEditingStepPlanId] = useState<string | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingStepValue, setEditingStepValue] = useState('');
  const [newRhythmMemberId, setNewRhythmMemberId] = useState<string>((connections as any)?.[0]?.memberId || 'user');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const existingRhythms = allPlans.filter(p => p.isRhythm && p.status === 'active');
  const atRhythmCap = existingRhythms.length >= 3;

  // --- Saved Cards ---
  type SavedCardType = 'language' | 'reflection' | 'knowledge' | 'decision' | 'recipe' | 'practice' | 'habit';
  interface SavedEntry { id: string; cardType: SavedCardType; title: string; detail: string; savedAt: string; }
  const [savedItems, setSavedItems] = useState<SavedEntry[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedFilter, setSavedFilter] = useState<SavedCardType | 'all'>('all');
  const [savedPage, setSavedPage] = useState(0);
  const [savedHasMore, setSavedHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const SAVED_PAGE_SIZE = 20;

  const parseSavedRows = (data: any[]): SavedEntry[] => {
    const parsed: SavedEntry[] = [];
    for (const row of data) {
      const t = row.text;
      let cardType: SavedCardType = 'language';
      let title = '';
      let detail = '';

      const tagMatch = t.match(/^\[card:(\w+)\]\s*(.*)/s);
      if (tagMatch) {
        cardType = tagMatch[1] as SavedCardType;
        const rest = tagMatch[2];
        if (cardType === 'knowledge') {
          const parts = rest.split(' | ');
          title = parts[0] || rest;
          detail = parts[1] || '';
        } else if (cardType === 'decision') {
          const parts = rest.split(' → chose: ');
          title = parts[0] || rest;
          detail = parts[1] ? `Chose: ${parts[1]}` : '';
        } else if (cardType === 'recipe') {
          title = rest;
          detail = 'Recipe completed';
        } else if (cardType === 'reflection') {
          title = rest;
          detail = 'Reflection prompt';
        } else {
          title = rest;
        }
      } else if (row.category === 'habit_completion') {
        cardType = 'habit';
        title = t.replace(/^Completed:\s*/i, '');
        detail = 'Habit completed';
      } else {
        const typedMatch = t.match(/Typed practice:\s*(.+?)\s*→\s*(.*)/i);
        const spokeMatch = t.match(/Spoke practice:\s*(.+)/i);
        const usedMatch = t.match(/Practiced using:\s*(.+?)\s+in a sentence/i);
        const scenarioMatch = t.match(/Practiced scenario:\s*(.+?)(?:\s*—\s*phrase:\s*(.+))?$/i);
        const reflectMatch = t.match(/Reflected on:\s*(.+)/i);
        if (typedMatch) { cardType = 'language'; title = typedMatch[1]; detail = typedMatch[2] ? `Your attempt: ${typedMatch[2]}` : ''; }
        else if (spokeMatch) { cardType = 'language'; title = spokeMatch[1]; detail = 'Spoken practice'; }
        else if (usedMatch) { cardType = 'language'; title = usedMatch[1]; detail = 'Used in a sentence'; }
        else if (scenarioMatch) { cardType = 'practice'; title = scenarioMatch[1]; detail = scenarioMatch[2] || ''; }
        else if (reflectMatch) { cardType = 'reflection'; title = reflectMatch[1]; detail = 'Reflection prompt'; }
        else { title = t; }
      }

      parsed.push({ id: row.id, cardType, title, detail, savedAt: row.extracted_at });
    }
    return parsed;
  };

  useEffect(() => {
    if (activeTab !== 'saved') return;
    let cancelled = false;
    setSavedLoading(true);
    setSavedPage(0);
    (async () => {
      const { data } = await supabase
        .from('memories')
        .select('id, text, extracted_at, category')
        .eq('user_id', userId)
        .in('category', ['practice', 'habit_completion', 'card_save'])
        .order('extracted_at', { ascending: false })
        .limit(SAVED_PAGE_SIZE + 1);
      if (cancelled) return;
      const rows = data ?? [];
      setSavedHasMore(rows.length > SAVED_PAGE_SIZE);
      setSavedItems(parseSavedRows(rows.slice(0, SAVED_PAGE_SIZE)));
      setSavedLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeTab, userId]);

  const loadMoreSaved = async () => {
    setLoadingMore(true);
    const nextOffset = (savedPage + 1) * SAVED_PAGE_SIZE;
    const { data } = await supabase
      .from('memories')
      .select('id, text, extracted_at, category')
      .eq('user_id', userId)
      .in('category', ['practice', 'habit_completion', 'card_save'])
      .order('extracted_at', { ascending: false })
      .range(nextOffset, nextOffset + SAVED_PAGE_SIZE);
    const rows = data ?? [];
    setSavedHasMore(rows.length === SAVED_PAGE_SIZE + 1);
    setSavedItems(prev => [...prev, ...parseSavedRows(rows.slice(0, SAVED_PAGE_SIZE))]);
    setSavedPage(p => p + 1);
    setLoadingMore(false);
  };

  const speakPhrase = (text: string, rate: number = 0.85) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  const deleteSavedItem = async (id: string) => {
    setSavedItems(prev => prev.filter(p => p.id !== id));
    await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);
  };

  const CARD_TYPE_META: Record<SavedCardType, { icon: any; label: string; color: string }> = {
    language: { icon: Languages, label: 'Phrases', color: 'text-cyan-400' },
    practice: { icon: Sparkles, label: 'Practice', color: 'text-violet-400' },
    reflection: { icon: Brain, label: 'Reflections', color: 'text-emerald-400' },
    knowledge: { icon: Lightbulb, label: 'Tips', color: 'text-amber-400' },
    decision: { icon: HelpCircle, label: 'Decisions', color: 'text-blue-400' },
    recipe: { icon: UtensilsCrossed, label: 'Recipes', color: 'text-orange-400' },
    habit: { icon: CheckCircle2, label: 'Habits', color: 'text-green-400' },
  };

  const filteredSaved = savedFilter === 'all' ? savedItems : savedItems.filter(s => s.cardType === savedFilter);

  const handleSavePlan = async () => {
    if (!newPlanTitle.trim()) return;

    // Enforce 3-rhythm cap
    if (newPlanIsRhythm && atRhythmCap) {
      toast.error("You're keeping 3 rhythms already — complete or remove one to add a new one.");
      return;
    }

    setSavingPlan(true);
    try {
      const freq = newPlanIsRhythm
        ? (newPlanFrequency === 'Weekly' ? 'Weekly' : 'Daily')
        : (newPlanFrequency === 'Custom' ? newPlanCustomFreq.trim() || 'Custom' : newPlanFrequency);
      const trimmedSteps = newPlanIsRhythm ? [] : newPlanSteps.filter(s => s.trim());

      // Resolve companion for rhythm
      const selectedConnection = newPlanIsRhythm && connections.length > 0
        ? connections.find((c: any) => c.memberId === newRhythmMemberId) || connections[0]
        : null;

      await plansHook.createPlan({
        title: newPlanTitle.trim(),
        emoji: newPlanEmoji,
        category: 'general',
        schedule: { time: newPlanTime || undefined, frequency: freq },
        ...(trimmedSteps.length > 0 ? { steps: trimmedSteps, plan_type: 'guidance' as const } : {}),
        isRhythm: newPlanIsRhythm,
        ...(selectedConnection ? {
          member_id: (selectedConnection as any).memberId || (selectedConnection as any).member_id,
          companion_name: (selectedConnection as any).name,
        } : {}),
      });
      setNewPlanTitle('');
      setNewPlanEmoji('📋');
      setNewPlanTime('');
      setNewPlanFrequency(newPlanIsRhythm ? 'Daily' : 'Once');
      setNewPlanCustomFreq('');
      setNewPlanSteps([]);
      setNewPlanIsRhythm(false);
      setShowCreatePlan(false);
      toast.success(newPlanIsRhythm ? 'Life Rhythm created!' : 'Plan created!');
    } catch {
      toast.error('Failed to create plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleComplete = async (planId: string) => {
    await plansHook.completePlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan && user) {
      sendPlanCompletionToChat(user.id, plan, connections, profile);
      // Fire event post for the feed
      import('@/lib/feedEvents').then(({ fireEventPost }) => {
        fireEventPost({
          userId: user.id,
          eventType: 'plan_complete',
          eventLabel: `You completed "${plan.title}"`,
          eventContext: `Category: ${plan.category}. ${plan.description || ''}`.trim(),
        });
      });
    }
  };

  const formatTheme = (t: string) => t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const sorted = [...plans].sort((a, b) => (a.status === 'suggested' ? -1 : 1) - (b.status === 'suggested' ? -1 : 1));

  const stageOrder = ['active', 'upcoming', 'someday'] as const;
  const stageLabels = { active: 'Active Now', upcoming: 'Upcoming', someday: 'Someday' };

  const handleRhythmComplete = async (planId: string) => {
    await plansHook.completeRhythmForToday(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan && user) {
      sendPlanCompletionToChat(user.id, plan, connections, profile, true);
      import('@/lib/feedEvents').then(({ fireEventPost }) => {
        fireEventPost({
          userId: user.id,
          eventType: 'rhythm_checkin',
          eventLabel: `You completed "${plan.title}"`,
          eventContext: `Life Rhythm · ${plan.category}. ${plan.description || ''}`.trim(),
        });
      });
    }
  };

  const renderStageMover = (plan: CompanionPlan) => {
    if (plan.status === 'suggested' || plan.isRhythm) return null;
    return (
      <div className="flex items-center gap-1 mt-2">
        {(['active', 'upcoming', 'someday'] as const).map(s => (
          <button
            key={s}
            onClick={(e) => { e.stopPropagation(); plansHook.updateStage(plan.id, s); }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              plan.stage === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {s === 'active' ? 'Active' : s === 'upcoming' ? 'Upcoming' : 'Someday'}
          </button>
        ))}
      </div>
    );
  };

  const renderPlanCard = (plan: CompanionPlan, i: number, showStageMover = true) => {
    const isSuggested = plan.status === 'suggested';
    const isGuidance = plan.planType === 'guidance' || (!plan.schedule?.time && !plan.schedule?.frequency && plan.steps.length > 0);
    const scheduleText = plan.schedule?.time
      ? `${plan.schedule.days?.[0] || 'Today'} • ${plan.schedule.time}`
      : plan.schedule?.frequency || '';

    const isExpanded = expandedPlanId === plan.id;
    const toggleExpand = () => setExpandedPlanId(prev => prev === plan.id ? null : plan.id);

    return (
      <motion.div
        key={plan.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className={`flex flex-col rounded-2xl p-4 backdrop-blur-xl border-[0.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] ${
          isSuggested
            ? 'bg-amber-500/5 border-l-2 border-l-amber-400/40 border-amber-400/15'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full cursor-pointer ${isSuggested ? 'bg-amber-400/10' : 'bg-primary/10'}`}
            onClick={toggleExpand}
          >
            <span className="text-lg">{plan.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            {plan.source === 'user' && editingTitlePlanId === plan.id ? (
              <input
                type="text"
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onBlur={() => {
                  if (editingTitleValue.trim()) plansHook.updatePlanTitle(plan.id, editingTitleValue.trim());
                  setEditingTitlePlanId(null);
                  setEditingTitleValue('');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                autoFocus
                className="font-display text-sm font-semibold text-foreground w-full bg-transparent border-b border-transparent focus:border-muted-foreground/30 focus:outline-none py-0"
              />
            ) : (
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={toggleExpand}>
                <p className="font-display text-sm font-semibold text-foreground">{plan.title}</p>
                {plan.source === 'user' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingTitlePlanId(plan.id); setEditingTitleValue(plan.title); }}
                    className="shrink-0 p-0.5 rounded text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
                    aria-label="Edit title"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ml-auto shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            )}

            {/* Always-visible summary line when collapsed */}
            {!isExpanded && !isGuidance && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {scheduleText || plan.description || `${plan.companionName} · tap to expand`}
              </p>
            )}
            {!isExpanded && isGuidance && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {plan.steps.length > 0 ? `${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} · tap to expand` : 'tap to expand'}
              </p>
            )}

            {/* Expanded content */}
            <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {isGuidance ? (
                  <>
                    {plan.description && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">{plan.description}</p>
                    )}
                    {plan.steps.length > 0 && (() => {
                      const today = new Date().toDateString();
                      const updatedDay = plan.updatedAt ? new Date(plan.updatedAt).toDateString() : '';
                      const effectiveChecked = plan.checklistReset === 'daily' && updatedDay !== today
                        ? [] : (plan.checkedSteps || []);
                      const allChecked = plan.steps.length > 0 && effectiveChecked.length === plan.steps.length;
                      return (
                        <ul className="mt-1.5 space-y-0.5">
                          {plan.steps.map((step, si) => {
                            const isChecked = effectiveChecked.includes(si);
                            const isEditingStep = plan.source === 'user' && editingStepPlanId === plan.id && editingStepIndex === si;
                            return (
                              <li
                                key={si}
                                className="text-[11px] text-muted-foreground flex items-start gap-1.5 cursor-pointer select-none group/step"
                                onClick={isEditingStep ? undefined : async () => {
                                  await plansHook.toggleStep(plan.id, si, effectiveChecked);
                                  const wouldBeChecked = isChecked
                                    ? effectiveChecked.filter(idx => idx !== si)
                                    : [...effectiveChecked, si];
                                  if (wouldBeChecked.length === plan.steps.length && !allChecked) {
                                    if (plan.checklistReset) return;
                                    setTimeout(() => handleComplete(plan.id), 600);
                                  }
                                }}
                              >
                                {isEditingStep ? (
                                  <input
                                    type="text"
                                    value={editingStepValue}
                                    onChange={(e) => setEditingStepValue(e.target.value)}
                                    onBlur={() => {
                                      plansHook.updatePlanStep(plan.id, si, editingStepValue, plan.steps);
                                      setEditingStepPlanId(null);
                                      setEditingStepIndex(null);
                                      setEditingStepValue('');
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="text-[11px] text-muted-foreground w-full bg-transparent border-b border-transparent focus:border-muted-foreground/30 focus:outline-none py-0 min-w-0"
                                  />
                                ) : (
                                  <>
                                    <span className={`mt-0.5 shrink-0 flex items-center justify-center h-3.5 w-3.5 rounded border transition-colors ${
                                      isChecked
                                        ? 'bg-primary/80 border-primary/60 text-primary-foreground'
                                        : 'border-muted-foreground/30 group-hover/step:border-primary/50'
                                    }`}>
                                      {isChecked && <Check className="h-2.5 w-2.5" />}
                                    </span>
                                    <span className={`flex items-center gap-1 min-w-0 ${isChecked ? 'line-through opacity-50' : ''}`}>
                                      <span className="min-w-0">{step}</span>
                                      {plan.source === 'user' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStepPlanId(plan.id);
                                            setEditingStepIndex(si);
                                            setEditingStepValue(step);
                                          }}
                                          className="shrink-0 p-0.5 rounded text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
                                          aria-label="Edit step"
                                        >
                                          <Pencil className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </span>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                    {plan.companionNote && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground italic">
                        {plan.companionName}: "{plan.companionNote}"
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {plan.description && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">{plan.description}</p>
                    )}
                    {scheduleText && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {scheduleText}
                      </p>
                    )}
                    {plan.companionNote && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic flex items-center gap-1">
                        <MessageSquareQuote className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        "{plan.companionNote}"
                      </p>
                    )}
                  </>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-1.5 italic">
                  {isSuggested ? `Suggested by ${plan.companionName}` : plan.source === 'user' ? 'Created by you' : `Created with ${plan.companionName}`}
                </p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {isSuggested ? (
            <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
              <button onClick={() => plansHook.dismissPlan(plan.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Dismiss">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => plansHook.acceptPlan(plan.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Accept">
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          ) : plan.isRhythm ? (
            <button
              onClick={() => handleRhythmComplete(plan.id)}
              disabled={plan.rhythmCompletedToday}
              className={`shrink-0 flex items-center gap-1 rounded-full transition-colors mt-0.5 ${
                plan.rhythmCompletedToday
                  ? 'bg-green-500/20 text-green-400 h-8 w-8 justify-center'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 h-8 w-8 justify-center'
              }`}
              title={plan.rhythmCompletedToday ? 'Done today' : 'Mark complete'}
            >
              <CheckCircle2 className={`h-4 w-4 ${plan.rhythmCompletedToday ? 'opacity-100' : ''}`} />
            </button>
          ) : isGuidance ? (
            <button
              onClick={() => { if (plan.memberId && plan.memberId !== 'user') onOpenChat?.(plan.memberId); }}
              className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-3 py-1.5 text-[11px] font-medium mt-0.5"
              title="Revisit"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Revisit
            </button>
          ) : (
            <button
              onClick={async () => {
                if (confirmingPlanId === plan.id) {
                  setConfirmingPlanId(null);
                  await handleComplete(plan.id);
                } else {
                  setConfirmingPlanId(plan.id);
                  setTimeout(() => setConfirmingPlanId(prev => prev === plan.id ? null : prev), 3000);
                }
              }}
              className={`shrink-0 flex items-center gap-1 rounded-full transition-colors mt-0.5 ${
                confirmingPlanId === plan.id
                  ? 'bg-green-500/20 text-green-400 px-3 py-1.5 text-[11px] font-medium'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 h-8 w-8 justify-center'
              }`}
              title="Mark complete"
            >
              <CheckCircle2 className={confirmingPlanId === plan.id ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              {confirmingPlanId === plan.id && 'Done?'}
            </button>
          )}
        </div>
        {showStageMover && renderStageMover(plan)}
      </motion.div>
    );
  };

  const renderHorizon = (stagePlans: CompanionPlan[], stage: string) => {
    if (stagePlans.length === 0) return null;

    const stageThemeCounts: Record<string, number> = {};
    stagePlans.forEach(p => {
      const isG = p.planType === 'guidance' || (!p.schedule?.time && !p.schedule?.frequency && p.steps.length > 0);
      if (isG && p.playbookTheme) stageThemeCounts[p.playbookTheme] = (stageThemeCounts[p.playbookTheme] || 0) + 1;
    });
    const stageGroupedThemes = new Set(Object.entries(stageThemeCounts).filter(([, c]) => c >= 2).map(([t]) => t));

    const individualPlans = stagePlans.filter(p => {
      const isG = p.planType === 'guidance' || (!p.schedule?.time && !p.schedule?.frequency && p.steps.length > 0);
      return !(isG && p.playbookTheme && stageGroupedThemes.has(p.playbookTheme));
    });

    const playbookGroups: Record<string, CompanionPlan[]> = {};
    stagePlans.forEach(p => {
      const isG = p.planType === 'guidance' || (!p.schedule?.time && !p.schedule?.frequency && p.steps.length > 0);
      if (isG && p.playbookTheme && stageGroupedThemes.has(p.playbookTheme)) {
        if (!playbookGroups[p.playbookTheme]) playbookGroups[p.playbookTheme] = [];
        playbookGroups[p.playbookTheme].push(p);
      }
    });

    return (
      <div key={stage}>
        <p className="text-xs text-muted-foreground mb-1.5 px-0.5">
          {stageLabels[stage as keyof typeof stageLabels]} · {stagePlans.length}
        </p>
        <div className="flex flex-col gap-2">
          {individualPlans.map((plan, i) => {
            const isG = plan.planType === 'guidance' || (!plan.schedule?.time && !plan.schedule?.frequency && plan.steps.length > 0);
            const showStepsHint = isG && plan.steps.length > 0 && i === 0 && stage === 'active';
            return (
              <div key={plan.id}>
                {renderPlanCard(plan, i)}
                {showStepsHint && (
                  <div className="mt-1 mb-1">
                    <DiscoveryHint featureKey={DISCOVERY_KEYS.PLAN_STEPS} userId={userId} icon="🪜" title="Plans can have steps" body="Guidance plans include steps your companion suggested. Tap Revisit anytime." />
                  </div>
                )}
              </div>
            );
          })}
          {Object.entries(playbookGroups).map(([theme, groupPlans], pbIdx) => (
            <div key={theme}>
              {pbIdx === 0 && (
                <div className="mb-1">
                  <DiscoveryHint featureKey={DISCOVERY_KEYS.PLAYBOOKS} userId={userId} icon="📚" title="Playbooks" body="Related plans are grouped together so you can work through them step by step." />
                </div>
              )}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center gap-2.5 rounded-2xl p-3.5 bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/8 transition-colors group">
                  <span className="text-base">📚</span>
                  <span className="flex-1 text-left text-sm font-semibold text-foreground">
                    {formatTheme(theme)}
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">· {groupPlans.length} plans</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-2 mt-2 pl-2">
                    {groupPlans.map((plan, i) => renderPlanCard(plan, i))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector('[data-app-scroller]') || document.querySelector('main') || document.documentElement;
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrolled((el as HTMLElement).scrollTop > 60);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const subtitleText = activeTab === 'saved'
    ? `${savedItems.length} saved item${savedItems.length === 1 ? '' : 's'}`
    : `${plans.length} ${activeTab === 'rhythms' ? (plans.length === 1 ? 'rhythm' : 'rhythms') : (plans.length === 1 ? 'plan' : 'plans')} · routines, goals & guidance`;

  return (
    <div>
      <CinematicHeader
        scrolled={scrolled}
        onBack={onBack}
        title="Your Path"
        subtitle={subtitleText}
        compactIcon={
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
          </div>
        }
        compactTrailing={<>{plans.length} plans</>}
        headerAction={
          <button
            onClick={() => setShowCreatePlan(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-full h-8 px-3 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        }
        expandedDetail={
          <div className="flex items-center gap-3 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>Routines, goals & guidance</p>
              <p className="text-[11px] text-white/50 mt-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>Plans from chat and ones you create</p>
            </div>
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 px-3 sm:px-5 py-2 border-b border-border/20 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('plans')}
           className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium transition-all shrink-0 ${
            activeTab === 'plans' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Plans
        </button>
        <button
          onClick={() => setActiveTab('rhythms')}
           className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium transition-all shrink-0 ${
            activeTab === 'rhythms' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Waves className="h-3.5 w-3.5" />
          Life Rhythms
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium transition-all shrink-0 ${
            activeTab === 'saved' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Saved
        </button>
      </div>

      {/* Content — flows into AppLayout scroller */}
      <div className="px-3 sm:px-5 pb-40">
      <div className="mt-4">

      {/* Saved tab content */}
      {activeTab === 'saved' ? (
        <div>
          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setSavedFilter('all')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                savedFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              All
            </button>
            {(Object.keys(CARD_TYPE_META) as SavedCardType[])
              .filter(ct => savedItems.some(s => s.cardType === ct))
              .map(ct => {
                const meta = CARD_TYPE_META[ct];
                const Icon = meta.icon;
                return (
                  <button
                    key={ct}
                    onClick={() => setSavedFilter(ct)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                      savedFilter === ct ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </button>
                );
              })}
          </div>

          {savedLoading ? (
            <div className="flex flex-col gap-2 mt-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : filteredSaved.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Bookmark className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nothing saved yet</p>
              <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                When you interact with cards in chat — practice phrases, save tips, make decisions — they'll appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredSaved.map(item => {
                const meta = CARD_TYPE_META[item.cardType];
                const Icon = meta.icon;
                const isLanguage = item.cardType === 'language';
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-2xl border border-border/30 bg-white/[0.04] backdrop-blur-sm p-3"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="text-[10px] text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {item.detail && <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{item.detail}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isLanguage && (
                        <>
                          <button
                            onClick={() => speakPhrase(item.title, 0.5)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors text-muted-foreground hover:text-foreground"
                            title="Slow"
                          >
                            <span className="text-[10px]">🐢</span>
                          </button>
                          <button
                            onClick={() => speakPhrase(item.title)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors text-muted-foreground hover:text-foreground"
                            title="Normal"
                          >
                            <Volume2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteSavedItem(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {/* Load more */}
              {savedHasMore && savedFilter === 'all' && (
                <button
                  onClick={loadMoreSaved}
                  disabled={loadingMore}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 mt-2 text-xs font-medium text-muted-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-border/20 transition-colors"
                >
                  {loadingMore ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
      <>
      <DiscoveryHint featureKey={DISCOVERY_KEYS.PLANS_SECTION} userId={userId} icon={activeTab === 'rhythms' ? '🔄' : '📋'} title={activeTab === 'rhythms' ? 'Your Rhythms' : 'Your Path'} body={activeTab === 'rhythms' ? 'Rhythms are daily or weekly habits. Tap + to create one.' : 'Friends suggest plans in chat. Tap + to add your own.'} />

      {plansHook.isLoading ? (
        <div className="flex flex-col gap-2 mt-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">{activeTab === 'rhythms' ? 'No rhythms yet' : 'Nothing here yet'}</p>
          <p className="text-xs text-muted-foreground/70 max-w-[260px]">
            {activeTab === 'rhythms'
              ? 'Rhythms are daily or weekly habits you want to build. Tap Add to create your first.'
              : `${profile?.companionName || 'Your companion'} can suggest plans during conversations, or start one yourself.`}
          </p>
          <button
            onClick={() => setShowCreatePlan(true)}
            className="mt-2 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {activeTab === 'rhythms' ? 'Create your first rhythm' : 'Create your first plan'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {stageOrder.map(stage => {
            const stagePlans = sorted.filter(p => (p.stage || 'active') === stage);
            return renderHorizon(stagePlans, stage);
          })}
        </div>
      )}

      {/* Completed plans history */}
      {plansHook.completedPlans.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-xl px-3 py-2 mt-3 bg-white/5 hover:bg-white/8 transition-colors group">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="flex-1 text-left text-[11px] font-medium text-muted-foreground/60">
              Completed · {plansHook.completedPlans.length}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1.5 mt-2">
              {plansHook.completedPlans.map((plan) => (
                <div key={plan.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/5 border-[0.5px] border-white/10">
                  <span className="text-sm opacity-50">{plan.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground/60 line-through truncate">{plan.title}</p>
                    {plan.completedAt && (
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                        Done {new Date(plan.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => plansHook.reactivatePlan(plan.id)}
                    className="shrink-0 text-[10px] font-medium text-primary/60 hover:text-primary px-2 py-1 rounded-full hover:bg-primary/10 transition-colors"
                  >
                    Undo
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Create Plan Bottom Sheet ── */}
      <AnimatePresence>
        {showCreatePlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowCreatePlan(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[85dvh] sm:max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl border border-border bg-card p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">{newPlanIsRhythm ? 'Add a Life Rhythm' : 'Add a Plan'}</h3>
                <button onClick={() => setShowCreatePlan(false)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* First-plan starter suggestions — only show when no plans yet and title is empty */}
              {plans.length === 0 && !newPlanTitle && (
                <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                  <p className="text-xs font-semibold text-primary/70 mb-2.5">
                    {profile?.companionName ? `What should ${profile.companionName} help you work on?` : 'What would you like to work on first?'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { emoji: '💧', title: 'Drink more water' },
                      { emoji: '🚶', title: 'Daily walk' },
                      { emoji: '📖', title: 'Read before bed' },
                      { emoji: '😴', title: 'Better sleep routine' },
                      { emoji: '🧘', title: 'Morning mindfulness' },
                      { emoji: '✍️', title: 'Journal daily' },
                    ].map((s) => (
                      <button
                        key={s.title}
                        onClick={() => { setNewPlanTitle(s.title); setNewPlanEmoji(s.emoji); }}
                        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95"
                      >
                        {s.emoji} {s.title}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">Tap one to get started, or write your own below</p>
                </div>
              )}

              {/* Plan Type picker */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plan Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNewPlanIsRhythm(false); setNewPlanFrequency('Once'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                      !newPlanIsRhythm ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Plan
                  </button>
                  <button
                    onClick={() => { setNewPlanIsRhythm(true); setNewPlanFrequency('Daily'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                      newPlanIsRhythm ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Waves className="h-3.5 w-3.5" />
                    Life Rhythm
                  </button>
                </div>
              </div>

              {/* Companion picker for rhythms */}
              {newPlanIsRhythm && connections.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assign to companion</label>
                  <div className="flex flex-wrap gap-1.5">
                    {connections.map((c: any) => (
                      <button
                        key={c.memberId}
                        onClick={() => setNewRhythmMemberId(c.memberId)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                          newRhythmMemberId === c.memberId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rhythm cap warning */}
              {newPlanIsRhythm && atRhythmCap && (
                <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-400/20 px-3.5 py-2.5 text-xs text-amber-300">
                  You're at your 3-rhythm limit. Complete or remove a rhythm to add a new one.
                </div>
              )}

              {/* Emoji selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pick an emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {['💊', '💪', '📖', '🍎', '💧', '🧘', '📞', '📋'].map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewPlanEmoji(e)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                        newPlanEmoji === e
                          ? 'bg-primary/15 ring-2 ring-primary/40 scale-110'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{newPlanIsRhythm ? 'Rhythm title' : 'Plan title'}</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder={newPlanIsRhythm ? "e.g., Morning stretch" : "e.g., Take vitamins"}
                  maxLength={60}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Time */}
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {newPlanIsRhythm ? 'Check-in time (optional)' : 'Scheduled time (optional)'}
                </label>
                <input
                  type="time"
                  value={newPlanTime}
                  onChange={(e) => setNewPlanTime(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Frequency */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frequency</label>
                <div className="flex flex-wrap gap-1.5">
                  {(newPlanIsRhythm ? ['Daily', 'Weekly'] : ['Once', 'Daily', 'Weekly', 'Custom']).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNewPlanFrequency(f)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                        newPlanFrequency === f
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {!newPlanIsRhythm && newPlanFrequency === 'Custom' && (
                  <input
                    type="text"
                    value={newPlanCustomFreq}
                    onChange={(e) => setNewPlanCustomFreq(e.target.value)}
                    placeholder="e.g., Every other day"
                    maxLength={40}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>

              {/* Steps (optional) */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Steps (optional)</label>
                {newPlanSteps.map((step, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                    onDragEnd={() => {
                      if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                        const reordered = [...newPlanSteps];
                        const [moved] = reordered.splice(dragIdx, 1);
                        reordered.splice(dragOverIdx, 0, moved);
                        setNewPlanSteps(reordered);
                      }
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`flex items-center gap-1.5 mb-1.5 transition-opacity ${dragIdx === i ? 'opacity-40' : ''} ${dragOverIdx === i && dragIdx !== i ? 'border-t-2 border-primary/40' : ''}`}
                  >
                    <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none">
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const updated = [...newPlanSteps];
                        updated[i] = e.target.value;
                        setNewPlanSteps(updated);
                      }}
                      placeholder="e.g., Take three slow breaths"
                      maxLength={120}
                      className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => setNewPlanSteps(newPlanSteps.filter((_, j) => j !== i))}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {newPlanSteps.length < 10 && (
                  <button
                    onClick={() => setNewPlanSteps([...newPlanSteps, ''])}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add a step
                  </button>
                )}
              </div>

              <button
                onClick={handleSavePlan}
                disabled={!newPlanTitle.trim() || savingPlan || (newPlanIsRhythm && atRhythmCap)}
                className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {savingPlan ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  `Save ${newPlanEmoji} ${newPlanTitle.trim() || (newPlanIsRhythm ? 'Rhythm' : 'Plan')}`
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
      </div>
      </div>
    </div>
  );
}
