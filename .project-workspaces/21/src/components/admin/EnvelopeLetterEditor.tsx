import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Mail, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface LetterEntry {
  key: string;
  label: string;
  description: string;
  value: string;
  original: string;
}

const LETTER_KEYS: { key: string; label: string; description: string }[] = [
  {
    key: 'letter_welcome_genesis',
    label: 'Welcome — Genesis (First 100)',
    description: 'Shown to founding members during sign-up. Use ${name} for the user\'s name.',
  },
  {
    key: 'letter_welcome_regular',
    label: 'Welcome — Regular',
    description: 'Shown to regular members during sign-up. Use ${name} for the user\'s name.',
  },
  {
    key: 'letter_partnership',
    label: 'Founder Partnership',
    description: 'Shown after the centurion milestone. Use ${companionLine} where the companion mention should go. Paragraphs are split by blank lines.',
  },
];

export default function EnvelopeLetterEditor() {
  const [letters, setLetters] = useState<LetterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('admin_settings' as any)
        .select('key, value')
        .in('key', LETTER_KEYS.map(l => l.key));

      const map = new Map<string, string>();
      for (const row of (data as any[]) || []) {
        map.set(row.key, typeof row.value === 'string' ? row.value : JSON.stringify(row.value));
      }

      setLetters(LETTER_KEYS.map(lk => ({
        ...lk,
        value: map.get(lk.key) || '',
        original: map.get(lk.key) || '',
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async (key: string) => {
    const entry = letters.find(l => l.key === key);
    if (!entry) return;
    setSaving(key);
    const { error } = await supabase
      .from('admin_settings' as any)
      .upsert(
        { key, value: entry.value, updated_at: new Date().toISOString() } as any,
        { onConflict: 'key' }
      );
    setSaving(null);
    if (error) {
      toast.error('Failed to save');
    } else {
      setLetters(prev => prev.map(l => l.key === key ? { ...l, original: l.value } : l));
      // Clear client cache so next load picks up new copy
      localStorage.removeItem('compani-letter-copy-cache');
      toast.success('Letter saved');
    }
  };

  const handleReset = (key: string) => {
    setLetters(prev => prev.map(l => l.key === key ? { ...l, value: l.original } : l));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading letters…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-primary/60" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-primary/50 font-semibold">
          Envelope Letters
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Edit the ceremonial letters that appear inside the envelope animations. Changes take effect for the next user who sees the letter.
      </p>

      {letters.map(entry => {
        const isDirty = entry.value !== entry.original;
        return (
          <Card key={entry.key} className="bg-black/20 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{entry.label}</CardTitle>
              <p className="text-[11px] text-muted-foreground">{entry.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={entry.value}
                onChange={(e) => setLetters(prev =>
                  prev.map(l => l.key === entry.key ? { ...l, value: e.target.value } : l)
                )}
                rows={8}
                className="text-sm font-mono bg-black/30 border-white/10 resize-y"
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', lineHeight: '1.6' }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(entry.key)}
                  disabled={!isDirty || saving === entry.key}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving === entry.key ? 'Saving…' : 'Save'}
                </Button>
                {isDirty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReset(entry.key)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revert
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
