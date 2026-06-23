import { useState } from 'react';
import { FlaskConical, Trophy, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QuinnABTestHint } from '@/components/shared/QuinnContextualHint';

interface ABTestPanelProps {
  pageId: string;
  orgId: string;
  /** Current landing page values for pre-fill */
  currentValues: {
    headline: string;
    subheadline: string;
    cta_text: string;
  };
  /** Called when the winner is applied */
  onApplyWinner?: (field: string, value: string) => void;
}

type TestField = 'headline' | 'cta_text' | 'subheadline';

const FIELD_OPTIONS: { value: TestField; label: string }[] = [
  { value: 'headline', label: 'Headline' },
  { value: 'cta_text', label: 'CTA Text' },
  { value: 'subheadline', label: 'Subheadline' },
];

export function ABTestPanel({ pageId, orgId, currentValues, onApplyWinner }: ABTestPanelProps) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [field, setField] = useState<TestField>('headline');
  const [variantB, setVariantB] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch active test for this page
  const { data: activeTest, isLoading } = useQuery({
    queryKey: ['ab-test', pageId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .maybeSingle();
      return data as {
        id: string;
        field_name: string;
        variant_a: string;
        variant_b: string;
        is_active: boolean;
      } | null;
    },
  });

  // Fetch results when test is active
  const { data: results } = useQuery({
    queryKey: ['ab-test-results', pageId, activeTest?.id],
    queryFn: async () => {
      if (!activeTest) return null;
      const { data: submissions } = await supabase
        .from('form_submissions')
        .select('data')
        .eq('page_id', pageId);
      if (!submissions) return { a: 0, b: 0, total: 0 };
      let a = 0, b = 0;
      for (const s of submissions) {
        const d = s.data as Record<string, any> | null;
        if (d?.variant === 'a' && d?.field === activeTest.field_name) a++;
        else if (d?.variant === 'b' && d?.field === activeTest.field_name) b++;
      }
      return { a, b, total: a + b };
    },
    enabled: !!activeTest,
    refetchInterval: 30000,
  });

  const handleStartTest = async () => {
    if (!variantB.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ab_tests').insert({
        page_id: pageId,
        org_id: orgId,
        field_name: field,
        variant_a: currentValues[field],
        variant_b: variantB.trim(),
      } as any);
      if (error) throw error;
      toast.success('A/B test started!');
      setCreating(false);
      setVariantB('');
      qc.invalidateQueries({ queryKey: ['ab-test', pageId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  const handleStopTest = async () => {
    if (!activeTest) return;
    await supabase
      .from('ab_tests')
      .update({ is_active: false } as any)
      .eq('id', activeTest.id);
    toast.success('Test stopped');
    qc.invalidateQueries({ queryKey: ['ab-test', pageId] });
  };

  const handleUseWinner = async () => {
    if (!activeTest || !results) return;
    const winner = results.a >= results.b ? activeTest.variant_a : activeTest.variant_b;
    onApplyWinner?.(activeTest.field_name, winner);
    await supabase
      .from('ab_tests')
      .update({ is_active: false } as any)
      .eq('id', activeTest.id);
    toast.success(`Applied winning variant for ${activeTest.field_name}`);
    qc.invalidateQueries({ queryKey: ['ab-test', pageId] });
  };

  if (isLoading) return null;

  // Active test view
  if (activeTest) {
    const aRate = results && results.total > 0 ? ((results.a / results.total) * 100).toFixed(1) : '0';
    const bRate = results && results.total > 0 ? ((results.b / results.total) * 100).toFixed(1) : '0';
    const aWins = results ? results.a >= results.b : true;

    return (
      <div className="glass rounded-2xl p-5 border border-primary/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">A/B Test Active</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Testing: {activeTest.field_name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 border ${aWins ? 'border-green-500/30 bg-green-500/5' : 'border-border/30'}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Variant A</p>
            <p className="text-sm font-medium truncate">{activeTest.variant_a}</p>
            <p className="text-lg font-semibold mt-1">
              {results?.a ?? 0} <span className="text-xs text-muted-foreground font-normal">({aRate}%)</span>
            </p>
            {aWins && results && results.total > 0 && (
              <Trophy className="h-3.5 w-3.5 text-green-400 mt-1" />
            )}
          </div>
          <div className={`rounded-xl p-3 border ${!aWins ? 'border-green-500/30 bg-green-500/5' : 'border-border/30'}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Variant B</p>
            <p className="text-sm font-medium truncate">{activeTest.variant_b}</p>
            <p className="text-lg font-semibold mt-1">
              {results?.b ?? 0} <span className="text-xs text-muted-foreground font-normal">({bRate}%)</span>
            </p>
            {!aWins && results && results.total > 0 && (
              <Trophy className="h-3.5 w-3.5 text-green-400 mt-1" />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleStopTest} className="gap-1.5 text-xs">
            <Square className="h-3 w-3" /> Stop Test
          </Button>
          {results && results.total > 0 && (
            <Button size="sm" onClick={handleUseWinner} className="gap-1.5 text-xs">
              <Trophy className="h-3 w-3" /> Use Winner
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Create test view
  if (creating) {
    return (
      <div className="glass rounded-2xl p-5 border border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Create A/B Test</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Field to test</label>
            <Select value={field} onValueChange={(v) => setField(v as TestField)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Variant A (current)</label>
            <Input value={currentValues[field]} disabled className="text-sm opacity-60" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Variant B (alternative)</label>
            <Input
              value={variantB}
              onChange={e => setVariantB(e.target.value)}
              placeholder="Enter alternative text..."
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleStartTest} disabled={saving || !variantB.trim()} className="gap-1.5 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
            Start Test
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="text-xs">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Default — show create button
  return (
    <div className="space-y-3">
      <QuinnABTestHint />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreating(true)}
        className="gap-1.5 text-xs"
      >
        <FlaskConical className="h-3.5 w-3.5" /> Create A/B Test
      </Button>
    </div>
  );
}
