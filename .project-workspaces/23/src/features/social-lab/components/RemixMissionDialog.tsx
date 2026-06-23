import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  campaignId: string;
  campaignTheme: string;
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ANGLE_PRESETS: Array<{
  key: string;
  label: string;
  emoji: string;
  description: string;
}> = [
  { key: 'provocative', label: 'Provocative', emoji: '⚡', description: 'Challenge conventional wisdom. Sharp contrasts.' },
  { key: 'educational', label: 'Educational', emoji: '🧠', description: 'Teach the framework. Authority through clarity.' },
  { key: 'story_led', label: 'Story-Led', emoji: '🎬', description: 'Narrative-first. Insight emerges from scene.' },
  { key: 'tactical', label: 'Tactical', emoji: '🛠️', description: 'Pure execution. Scripts, numbers, frameworks.' },
  { key: 'aspirational', label: 'Aspirational', emoji: '✨', description: 'Paint the after-state. Identity-driven.' },
  { key: 'contrarian', label: 'Contrarian', emoji: '🔄', description: "Argue against the trend. Smart minority view." },
];

export function RemixMissionDialog({ campaignId, campaignTheme, projectId, open, onOpenChange }: Props) {
  const [angle, setAngle] = useState<string>('provocative');
  const [customDirection, setCustomDirection] = useState('');
  const [replaceOriginal, setReplaceOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleRemix = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-social-remix', {
        body: {
          campaignId,
          angle,
          customDirection: customDirection.trim() || undefined,
          replaceOriginal,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`Remix live: "${(data as any).campaign_theme}" — ${(data as any).count} posts.`);
      qc.invalidateQueries({ queryKey: ['social-campaigns', projectId] });
      onOpenChange(false);
      setCustomDirection('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remix failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Remix Mission
          </DialogTitle>
          <DialogDescription>
            Same Signal, new angle. MarQ re-architects the entire 7-day arc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Theme preserved */}
          <div className="glass rounded-lg border border-primary/20 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Theme (locked)</p>
            <p className="text-sm font-semibold truncate">{campaignTheme}</p>
          </div>

          {/* Angle presets */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Pivot the angle</Label>
            <div className="grid grid-cols-2 gap-2">
              {ANGLE_PRESETS.map((preset) => {
                const active = angle === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setAngle(preset.key)}
                    className={cn(
                      'text-left rounded-lg border p-2.5 transition-all',
                      active
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/50 hover:border-primary/40 hover:bg-card/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>{preset.emoji}</span>
                      <span className={cn('text-xs font-semibold', active && 'text-primary')}>
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom direction */}
          <div className="space-y-2">
            <Label htmlFor="custom" className="text-xs uppercase tracking-widest text-muted-foreground">
              Custom direction (optional)
            </Label>
            <Textarea
              id="custom"
              value={customDirection}
              onChange={(e) => setCustomDirection(e.target.value)}
              placeholder="e.g. Lean harder on the founder's personal story. Less jargon."
              className="text-sm min-h-[70px] resize-none"
            />
          </div>

          {/* Replace toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div className="flex-1 pr-3">
              <p className="text-sm font-medium">Archive original</p>
              <p className="text-[11px] text-muted-foreground">
                Off → keep both versions side-by-side. On → archive the original.
              </p>
            </div>
            <Switch checked={replaceOriginal} onCheckedChange={setReplaceOriginal} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRemix} disabled={loading} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? 'Remixing the arc…' : 'Remix Mission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
