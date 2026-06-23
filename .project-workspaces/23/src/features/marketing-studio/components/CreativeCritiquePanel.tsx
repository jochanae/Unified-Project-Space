import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, AlertTriangle, Lightbulb, CheckCircle2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { StrategistAsset } from './StrategistDialog';

type Severity = 'aligned' | 'nudge' | 'warning';
type Attribute = 'headline' | 'subhead' | 'cta' | 'overall';

interface CritiqueNote {
  severity: Severity;
  asset_index: number;
  attribute: Attribute;
  message: string;
  suggestion?: string;
}

interface Critique {
  summary: string;
  notes: CritiqueNote[];
}

interface Props {
  projectId: string | null;
  draftAssets: StrategistAsset[];
  originalAssets?: StrategistAsset[];
  onApplySuggestion: (assetIndex: number, attribute: Attribute, value: string) => void;
}

const SEVERITY_STYLES: Record<Severity, { ring: string; chip: string; icon: typeof Eye }> = {
  aligned: { ring: 'border-emerald-400/30 bg-emerald-400/5', chip: 'text-emerald-300', icon: CheckCircle2 },
  nudge: { ring: 'border-cyan-400/30 bg-cyan-400/5', chip: 'text-cyan-300', icon: Lightbulb },
  warning: { ring: 'border-amber-400/40 bg-amber-400/10', chip: 'text-amber-300', icon: AlertTriangle },
};

export function CreativeCritiquePanel({ projectId, draftAssets, originalAssets, onApplySuggestion }: Props) {
  const [critique, setCritique] = useState<Critique | null>(null);
  const [hasWinners, setHasWinners] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const dirty = !!originalAssets && draftAssets.some((a, i) => {
    const o = originalAssets[i];
    return !o || a.headline !== o.headline || a.subhead !== o.subhead || a.cta !== o.cta;
  });

  const runCritique = async () => {
    if (!projectId) {
      toast.error('Open a project first');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-creative-critique', {
        body: {
          projectId,
          draft: { assets: draftAssets },
          original: originalAssets ? { assets: originalAssets } : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCritique(data.critique as Critique);
      setHasWinners(!!data.hasWinners);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Critique unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gold" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Creative Director</div>
            <div className="text-sm font-medium">MarQ audits your edits</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runCritique}
          disabled={loading}
          className="border-gold/30 hover:bg-gold/10"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          {dirty ? 'Audit my edits' : 'Audit draft'}
        </Button>
      </div>

      {critique && (
        <div className="mt-4 grid gap-2.5">
          <p className="text-xs italic text-foreground/85">"{critique.summary}"</p>
          {!hasWinners && (
            <p className="text-[10px] text-muted-foreground">
              No winning campaigns yet — MarQ will sharpen this critique as your data accumulates.
            </p>
          )}

          {critique.notes.map((note, i) => {
            const s = SEVERITY_STYLES[note.severity];
            const Icon = s.icon;
            return (
              <div key={i} className={cn('rounded-xl border p-3', s.ring)}>
                <div className="flex items-start gap-2">
                  <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', s.chip)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-[9px] uppercase tracking-wider font-semibold', s.chip)}>
                        {note.severity}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        Asset {note.asset_index + 1} · {note.attribute}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-foreground/90">{note.message}</p>
                    {note.suggestion && note.attribute !== 'overall' && (
                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex-1 rounded-md border border-border/40 bg-background/60 px-2 py-1.5 text-[11px] text-foreground/95">
                          {note.suggestion}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-gold hover:bg-gold/10"
                          onClick={() => onApplySuggestion(note.asset_index, note.attribute, note.suggestion!)}
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {critique.notes.length === 0 && (
            <p className="text-xs text-muted-foreground">No drift detected — copy aligns with your winners.</p>
          )}
        </div>
      )}
    </div>
  );
}
