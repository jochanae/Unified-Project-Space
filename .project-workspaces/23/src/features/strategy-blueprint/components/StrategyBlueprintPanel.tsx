import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, TrendingUp, Target, Zap, RefreshCw, Copy, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { BlueprintSection, BlueprintData } from '../types';

interface StrategyBlueprintPanelProps {
  projectId: string;
  projectName: string;
  existingBlueprint?: BlueprintData | null;
  onSaved?: (data: BlueprintData) => void;
}

const SECTION_ORDER = ['ACQUISITION', 'ACTIVATION', 'THE CRITICAL GAP', 'RETENTION', 'REVENUE'];

const getSectionIcon = (title: string) => {
  switch (title.toUpperCase()) {
    case 'ACQUISITION':
      return Target;
    case 'ACTIVATION':
      return Zap;
    case 'THE CRITICAL GAP':
      return Sparkles;
    case 'RETENTION':
      return RefreshCw;
    case 'REVENUE':
      return TrendingUp;
    default:
      return Sparkles;
  }
};

const normalizeBlueprint = (raw: any, fallbackProjectName: string): BlueprintData | null => {
  if (!raw || !Array.isArray(raw.sections)) return null;

  const sectionMap = new Map<string, BlueprintSection>();
  for (const section of raw.sections) {
    if (!section || typeof section.title !== 'string' || !Array.isArray(section.points)) continue;
    sectionMap.set(section.title.toUpperCase(), {
      title: section.title.toUpperCase(),
      points: section.points.filter((p: unknown): p is string => typeof p === 'string').slice(0, 4),
    });
  }

  const orderedSections: BlueprintSection[] = [];
  for (const title of SECTION_ORDER) {
    const entry = sectionMap.get(title);
    if (entry) orderedSections.push(entry);
  }

  if (orderedSections.length === 0) return null;

  return {
    sections: orderedSections,
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
    projectName: typeof raw.projectName === 'string' ? raw.projectName : fallbackProjectName,
  };
};

export function StrategyBlueprintPanel({
  projectId,
  projectName,
  existingBlueprint = null,
  onSaved,
}: StrategyBlueprintPanelProps) {
  useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(
    existingBlueprint ? normalizeBlueprint(existingBlueprint, projectName) : null,
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const normalized = existingBlueprint ? normalizeBlueprint(existingBlueprint, projectName) : null;
    if (normalized?.sections.length) {
      normalized.sections.forEach((section, index) => {
        initial[section.title] = index === 0;
      });
    }
    return initial;
  });

  const ensureExpansionDefaults = useCallback((data: BlueprintData) => {
    setExpandedSections(prev => {
      const next = { ...prev };
      data.sections.forEach((section, index) => {
        if (next[section.title] === undefined) {
          next[section.title] = index === 0;
        }
      });
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-strategy-blueprint', {
        body: { projectId },
      });
      if (error) throw new Error(error.message || 'Failed to generate strategy blueprint');

      const normalized = normalizeBlueprint(data, projectName);
      if (!normalized) throw new Error('Invalid strategy blueprint response');

      setBlueprint(normalized);
      ensureExpansionDefaults(normalized);
      onSaved?.(normalized);
      toast.success('Strategy Blueprint generated');
    } catch (err: any) {
      toast.error('Failed to generate strategy blueprint', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, projectName, onSaved, ensureExpansionDefaults]);

  const toggleSection = useCallback((title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!blueprint) return;
    const text = [
      `STRATEGY BLUEPRINT — ${blueprint.projectName}`,
      '',
      ...blueprint.sections.flatMap(section => [
        section.title,
        ...section.points.map(point => `- ${point}`),
        '',
      ]),
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Blueprint copied');
    setTimeout(() => setCopied(false), 2000);
  }, [blueprint]);

  if (loading) {
    return (
      <div className="glass rounded-2xl border border-border/30 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">MarQ is mapping your growth strategy...</p>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="glass rounded-2xl border border-border/30 p-8 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <TrendingUp className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-serif tracking-tight text-foreground">Build your growth strategy</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          MarQ will map your acquisition, activation, retention, and revenue architecture — specific to your project.
        </p>
        <Button onClick={handleGenerate} className="mt-6 gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Strategy Blueprint
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border/30 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Strategy Blueprint</p>
          <p className="mt-1 text-sm text-muted-foreground">Growth architecture for {blueprint.projectName}</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="space-y-3">
        {blueprint.sections.map(section => {
          const Icon = getSectionIcon(section.title);
          const open = expandedSections[section.title] ?? false;
          return (
            <div
              key={section.title}
              className="rounded-2xl border border-border/30 bg-card/20 pl-3 pr-4 py-3"
              style={{ borderLeftColor: 'hsl(var(--primary))', borderLeftWidth: 2 }}
            >
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
                    {section.title}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </button>
              {open && (
                <ul className="mt-3 space-y-2 pb-1">
                  {section.points.map((point, index) => (
                    <li key={`${section.title}-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleGenerate}>
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
      </div>
    </div>
  );
}

