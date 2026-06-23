/**
 * BlueprintsPage — global vault of all saved strategic blueprints
 * across every project (Strategist / Auditor / Visionary outputs).
 *
 * Counterpart to /personal-intel ("About You"):
 *   • /personal-intel = who you ARE (identity, discovery quizzes)
 *   • /blueprints     = what you're BUILDING (strategic plans your companion drafted)
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Sparkles, Filter, Pin, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import CinematicHeader from '@/components/shared/CinematicHeader';
import BlueprintCard, { type BlueprintMode } from '@/components/cards/BlueprintCard';
import { buildInAxiom } from '@/lib/axiomHandoff';

interface SavedBlueprint {
  id: string;
  mode: BlueprintMode;
  title: string;
  callout: string | null;
  sections: { heading: string; points: string[] }[];
  pinned: boolean;
  created_at: string;
  project_id: string;
  project_name: string;
  project_emoji: string;
}

const MODE_FILTERS: { key: BlueprintMode | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'strategist', label: 'Strategist', emoji: '📊' },
  { key: 'auditor', label: 'Auditor', emoji: '🔍' },
  { key: 'visionary', label: 'Visionary', emoji: '👁' },
];

export default function BlueprintsPage() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [scrolled, setScrolled] = useState(false);
  const [modeFilter, setModeFilter] = useState<BlueprintMode | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  /* Header scroll feedback (matches PersonalIntelPage rhythm) */
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-app-scroller]');
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(el.scrollTop > 12);
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const { data: blueprints = [], refetch } = useQuery({
    queryKey: ['all-blueprints', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('project_blueprints')
        .select('id, mode, title, callout, sections, pinned, created_at, project_id, user_projects!inner(name, emoji)')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      return ((data as any[]) || []).map(r => ({
        id: r.id,
        mode: r.mode,
        title: r.title,
        callout: r.callout,
        sections: r.sections,
        pinned: r.pinned,
        created_at: r.created_at,
        project_id: r.project_id,
        project_name: r.user_projects?.name ?? 'Project',
        project_emoji: r.user_projects?.emoji ?? '📁',
      })) as SavedBlueprint[];
    },
    enabled: !!user?.id,
  });

  const projectsList = useMemo(() => {
    const seen = new Map<string, { name: string; emoji: string }>();
    blueprints.forEach(b => {
      if (!seen.has(b.project_id)) {
        seen.set(b.project_id, { name: b.project_name, emoji: b.project_emoji });
      }
    });
    return Array.from(seen.entries()).map(([id, v]) => ({ id, ...v }));
  }, [blueprints]);

  const filtered = useMemo(() => {
    return blueprints.filter(b => {
      if (modeFilter !== 'all' && b.mode !== modeFilter) return false;
      if (projectFilter !== 'all' && b.project_id !== projectFilter) return false;
      return true;
    });
  }, [blueprints, modeFilter, projectFilter]);

  /* Group by project for display */
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; items: SavedBlueprint[] }>();
    filtered.forEach(b => {
      if (!map.has(b.project_id)) {
        map.set(b.project_id, { name: b.project_name, emoji: b.project_emoji, items: [] });
      }
      map.get(b.project_id)!.items.push(b);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    await supabase.from('project_blueprints').update({ pinned: !currentlyPinned }).eq('id', id);
    refetch();
  };

  return (
    <div className="min-h-screen pb-24">
      <CinematicHeader
        scrolled={scrolled}
        onBack={() => navigate(-1)}
        title="Blueprints"
        subtitle="Plans your companion drafted with you"
        compactIcon={<Sparkles className="h-4 w-4" />}
      />

      <div className="px-4 pt-4 max-w-3xl mx-auto">
        {/* Filters */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {MODE_FILTERS.map(f => {
              const active = modeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setModeFilter(f.key)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border ${
                    active
                      ? 'bg-primary/15 border-primary/40 text-foreground'
                      : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {projectsList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-widest text-muted-foreground/50">
                <Filter className="h-3 w-3" /> project
              </span>
              <button
                onClick={() => setProjectFilter('all')}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11.5px] border transition-all ${
                  projectFilter === 'all'
                    ? 'bg-primary/15 border-primary/40 text-foreground'
                    : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {projectsList.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProjectFilter(p.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] border transition-all ${
                    projectFilter === p.id
                      ? 'bg-primary/15 border-primary/40 text-foreground'
                      : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span className="truncate max-w-[120px]">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-8 text-center"
          >
            <Sparkles className="h-7 w-7 text-primary/50 mx-auto mb-3" />
            <p className="text-[14px] text-foreground/85 font-medium mb-1.5">
              {blueprints.length === 0 ? 'No blueprints saved yet' : 'No blueprints match these filters'}
            </p>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-sm mx-auto mb-5">
              {blueprints.length === 0
                ? 'Ask your companion in Strategist, Auditor, or Visionary mode to draft a plan — then tap "Save" on the card.'
                : 'Try clearing a filter to see more.'}
            </p>
            {blueprints.length === 0 && (
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-foreground text-[12.5px] font-medium hover:bg-primary/20 transition-colors"
              >
                Open chat <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </motion.div>
        )}

        {/* Grouped by project */}
        <div className="space-y-8">
          {grouped.map(([projectId, group]) => (
            <section key={projectId}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-base">{group.emoji}</span>
                <h2 className="text-[13px] font-semibold tracking-wide text-foreground">{group.name}</h2>
                <span className="text-[10.5px] text-muted-foreground/60">
                  · {group.items.length} {group.items.length === 1 ? 'blueprint' : 'blueprints'}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map(item => (
                  <div key={item.id} className="relative">
                    {item.pinned && (
                      <button
                        onClick={() => togglePin(item.id, item.pinned)}
                        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-md flex items-center justify-center hover:bg-primary/30 transition-colors"
                        title="Unpin"
                      >
                        <Pin className="h-3 w-3 text-primary fill-primary" />
                      </button>
                    )}
                    <BlueprintCard
                      mode={item.mode}
                      title={item.title}
                      callout={item.callout ?? undefined}
                      sections={item.sections}
                      onBuildInAxiom={() => buildInAxiom({
                        title: item.title,
                        callout: item.callout,
                        sections: item.sections,
                      })}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
