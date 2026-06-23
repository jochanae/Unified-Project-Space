import { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SocialCampaign } from '../types';
import { PLATFORM_META } from '../types';

interface Props {
  post: SocialCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefined: () => void;
}

interface SliderConfig {
  key: 'tactical_graceful' | 'punchy_depth' | 'bold_subtle';
  label: string;
  low: string;
  high: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'tactical_graceful', label: 'Voice', low: 'Tactical', high: 'Graceful' },
  { key: 'punchy_depth', label: 'Cadence', low: 'Punchy', high: 'Depth' },
  { key: 'bold_subtle', label: 'Energy', low: 'Bold', high: 'Subtle' },
];

export function RefineToneDialog({ post, open, onOpenChange, onRefined }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    tactical_graceful: 0,
    punchy_depth: 0,
    bold_subtle: 0,
  });
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!post) return null;

  const meta = PLATFORM_META[post.platform];
  const hasChanges = Object.values(values).some((v) => v !== 0) || note.trim().length > 0;

  const reset = () => {
    setValues({ tactical_graceful: 0, punchy_depth: 0, bold_subtle: 0 });
    setNote('');
  };

  const handleRefine = async () => {
    if (!hasChanges) {
      toast.info('Adjust a slider or add a note first.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-social-refine', {
        body: {
          postId: post.id,
          sliders: values,
          customNote: note.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Refined with MarQ.');
      onRefined();
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refinement failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Refine with MarQ
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span>{meta.icon} {meta.label}</span>
            {post.narrative_role && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                Day {post.narrative_day} · {post.narrative_role}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Current preview */}
        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current</p>
          <p className="font-semibold text-sm leading-snug">{post.hook}</p>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{post.body}</p>
        </div>

        {/* Sliders */}
        <div className="space-y-5 py-2">
          {SLIDERS.map((s) => (
            <div key={s.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                {values[s.key] !== 0 && (
                  <span className="text-[10px] text-primary font-medium">
                    {values[s.key] < 0 ? `← ${s.low}` : `${s.high} →`}
                    {Math.abs(values[s.key]) === 2 && ' (strong)'}
                  </span>
                )}
              </div>
              <Slider
                value={[values[s.key]]}
                onValueChange={(v) => setValues((prev) => ({ ...prev, [s.key]: v[0] }))}
                min={-2}
                max={2}
                step={1}
                disabled={loading}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70">
                <span>{s.low}</span>
                <span className={cn(values[s.key] === 0 && 'text-foreground/50')}>—</span>
                <span>{s.high}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Custom note */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Custom Direction <span className="text-muted-foreground/60 normal-case">(optional)</span>
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='e.g. "Lead with the contrarian take" or "Drop the second metaphor"'
            className="text-sm min-h-[60px] resize-none"
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={loading || !hasChanges}
            className="text-muted-foreground"
          >
            Reset
          </Button>
          <Button
            onClick={handleRefine}
            disabled={loading || !hasChanges}
            className="ml-auto gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refining…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Regenerate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
