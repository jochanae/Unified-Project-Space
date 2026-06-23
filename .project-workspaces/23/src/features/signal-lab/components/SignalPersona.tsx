import { useState, useCallback } from 'react';
import { Users, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { callQuinnStream, extractJSON } from './SignalAIHelper';

interface PersonaOutput {
  name: string;
  age: string;
  role: string;
  frustrations: string[];
  desires: string[];
  languagePatterns: string[];
  objections: string[];
  whereToBuyMessage: string;
}

interface Props {
  oneLiner: string;
  elevatorPitch: string;
  socialBio: string;
  projectId?: string;
}

export default function SignalPersona({ oneLiner, elevatorPitch, socialBio, projectId }: Props) {
  const [output, setOutput] = useState<PersonaOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const prompt = `You are MarQ, an elite audience strategist. Based on this brand signal, build a detailed ideal customer persona.

## Brand Signal
- One-Liner: "${oneLiner}"
- Elevator Pitch: "${elevatorPitch}"
- Social Bio: "${socialBio}"

## Rules
- The persona should feel like a REAL person, not a marketing archetype
- Frustrations should be specific, emotional, and relatable — things they'd say to a friend
- Desires should be concrete outcomes, not vague aspirations
- Language patterns: actual phrases and words this person uses when talking about their problem
- Objections: real reasons they'd hesitate to buy
- "Where to reach them" should be specific platforms, communities, or contexts
- NO marketing jargon. Write like you know this person personally.

Return ONLY valid JSON (no markdown, no code fences):
{
  "name": "A realistic first name",
  "age": "Age range, e.g. '28-35'",
  "role": "What they do / who they are in 5-8 words",
  "frustrations": [
    "Specific frustration they'd say out loud",
    "Another real frustration",
    "A third one"
  ],
  "desires": [
    "Concrete outcome they want",
    "Another specific desire",
    "A third one"
  ],
  "languagePatterns": [
    "Phrase they actually use when describing their problem",
    "Another phrase",
    "Another phrase"
  ],
  "objections": [
    "Real reason they'd hesitate",
    "Another objection"
  ],
  "whereToBuyMessage": "Where and how to reach this person — specific platforms, communities, contexts"
}`;

      const raw = await callQuinnStream(prompt, projectId);
      const parsed = extractJSON<PersonaOutput>(raw);
      if (!parsed?.name) throw new Error('Failed to parse persona');
      setOutput(parsed);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate persona');
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

  const copyAll = () => {
    if (!output) return;
    const text = `IDEAL CUSTOMER PERSONA
Name: ${output.name}
Age: ${output.age}
Role: ${output.role}

FRUSTRATIONS:
${output.frustrations.map(f => `• ${f}`).join('\n')}

DESIRES:
${output.desires.map(d => `• ${d}`).join('\n')}

LANGUAGE PATTERNS:
${output.languagePatterns.map(l => `"${l}"`).join('\n')}

OBJECTIONS:
${output.objections.map(o => `• ${o}`).join('\n')}

WHERE TO REACH THEM:
${output.whereToBuyMessage}`;
    handleCopy('all', text);
  };

  if (!output && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="rounded-full bg-primary/10 p-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Build a detailed ideal customer persona — who they are, what they say, and where to find them.
        </p>
        <Button onClick={generate} className="gap-2">
          <Users className="h-4 w-4" />
          Generate Signal Persona
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Building your ideal customer profile...
        </p>
      </div>
    );
  }

  if (!output) return null;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Persona Header */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          {output.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{output.age} · {output.role}</p>
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3"
        >
          {copied === 'all' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === 'all' ? 'Copied all' : 'Copy full persona'}
        </button>
      </div>

      {/* Frustrations */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-red-500/80">Frustrations</span>
        <ul className="mt-3 space-y-2">
          {output.frustrations.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-red-500/60 mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Desires */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80">Desires</span>
        <ul className="mt-3 space-y-2">
          {output.desires.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-emerald-500/60 mt-0.5">•</span>
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Language Patterns */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">They Say Things Like</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {output.languagePatterns.map((l, i) => (
            <button
              key={i}
              onClick={() => handleCopy(`lang-${i}`, l)}
              className="text-sm text-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              "{l}"
            </button>
          ))}
        </div>
      </div>

      {/* Objections */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">Objections</span>
        <ul className="mt-3 space-y-2">
          {output.objections.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-amber-500/60 mt-0.5">⚡</span>
              {o}
            </li>
          ))}
        </ul>
      </div>

      {/* Where to Reach */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Where to Reach Them</span>
        <p className="text-sm text-foreground mt-3 leading-relaxed">{output.whereToBuyMessage}</p>
      </div>

      {/* Regenerate */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-2">
          <Users className="h-3.5 w-3.5" />
          Regenerate Persona
        </Button>
      </div>
    </div>
  );
}
