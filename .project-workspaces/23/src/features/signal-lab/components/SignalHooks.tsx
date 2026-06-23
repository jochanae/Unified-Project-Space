import { useState, useCallback } from 'react';
import { Megaphone, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { callQuinnStream, extractJSON } from './SignalAIHelper';

interface Hook {
  platform: string;
  hook: string;
  context: string;
}

interface SignalHooksOutput {
  hooks: Hook[];
  emailSubjects: string[];
  adHeadlines: string[];
}

interface Props {
  oneLiner: string;
  elevatorPitch: string;
  socialBio: string;
  projectId?: string;
}

export default function SignalHooks({ oneLiner, elevatorPitch, socialBio, projectId }: Props) {
  const [output, setOutput] = useState<SignalHooksOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const prompt = `You are MarQ, an elite content strategist. Based on this brand signal, generate ready-to-use content hooks.

## Brand Signal
- One-Liner: "${oneLiner}"
- Elevator Pitch: "${elevatorPitch}"
- Social Bio: "${socialBio}"

## Rules
- Hooks must be scroll-stopping — the kind that make people pause mid-scroll
- Each hook should be a different angle (pain, aspiration, curiosity, contrarian, story)
- Email subjects should be under 50 characters, designed for high open rates
- Ad headlines should be direct and benefit-focused
- NO buzzwords. Write like a sharp human.
- Sound conversational, not corporate

Return ONLY valid JSON (no markdown, no code fences):
{
  "hooks": [
    { "platform": "Instagram", "hook": "The opening line of a post", "context": "Pain angle — what they're struggling with" },
    { "platform": "LinkedIn", "hook": "The opening line of a post", "context": "Authority angle — why you're credible" },
    { "platform": "X/Twitter", "hook": "A punchy tweet", "context": "Contrarian angle — challenges conventional thinking" },
    { "platform": "Instagram", "hook": "A story hook or reel caption", "context": "Curiosity angle — makes them want to know more" },
    { "platform": "LinkedIn", "hook": "An opening line", "context": "Story angle — personal experience" }
  ],
  "emailSubjects": [
    "Subject line 1 (under 50 chars)",
    "Subject line 2",
    "Subject line 3"
  ],
  "adHeadlines": [
    "Ad headline 1",
    "Ad headline 2",
    "Ad headline 3"
  ]
}`;

      const raw = await callQuinnStream(prompt, projectId);
      const parsed = extractJSON<SignalHooksOutput>(raw);
      if (!parsed?.hooks?.length) throw new Error('Failed to parse signal hooks');
      setOutput(parsed);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate signal hooks');
    } finally {
      setLoading(false);
    }
  }, [oneLiner, elevatorPitch, socialBio, projectId, loading]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied');
    setTimeout(() => setCopied(null), 2000);
  };

  if (!output && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="rounded-full bg-primary/10 p-4">
          <Megaphone className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Generate scroll-stopping hooks, email subjects, and ad headlines from your signal.
        </p>
        <Button onClick={generate} className="gap-2">
          <Megaphone className="h-4 w-4" />
          Generate Signal Hooks
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Crafting angles that stop the scroll...
        </p>
      </div>
    );
  }

  if (!output) return null;

  const PLATFORM_COLORS: Record<string, string> = {
    Instagram: 'bg-pink-500/10 text-pink-600',
    LinkedIn: 'bg-blue-500/10 text-blue-600',
    'X/Twitter': 'bg-foreground/10 text-foreground',
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Social Hooks */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Social Hooks</span>
        <div className="space-y-3 mt-4">
          {output.hooks.map((h, i) => (
            <div key={i} className="rounded-2xl border border-border/20 bg-card/30 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', PLATFORM_COLORS[h.platform] || 'bg-muted text-muted-foreground')}>
                  {h.platform}
                </span>
                <button
                  onClick={() => handleCopy(`hook-${i}`, h.hook)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied === `hook-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-foreground text-sm font-medium leading-relaxed">"{h.hook}"</p>
              <p className="text-xs text-muted-foreground/60 mt-1.5">{h.context}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Email Subjects */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Email Subject Lines</span>
        <div className="space-y-2 mt-3">
          {output.emailSubjects.map((s, i) => (
            <div key={i} className="flex items-center justify-between group">
              <p className="text-sm text-foreground">{s}</p>
              <button
                onClick={() => handleCopy(`email-${i}`, s)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === `email-${i}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ad Headlines */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Ad Headlines</span>
        <div className="space-y-2 mt-3">
          {output.adHeadlines.map((h, i) => (
            <div key={i} className="flex items-center justify-between group">
              <p className="text-sm text-foreground font-medium">{h}</p>
              <button
                onClick={() => handleCopy(`ad-${i}`, h)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied === `ad-${i}` ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Regenerate */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-2">
          <Megaphone className="h-3.5 w-3.5" />
          Regenerate Hooks
        </Button>
      </div>
    </div>
  );
}
