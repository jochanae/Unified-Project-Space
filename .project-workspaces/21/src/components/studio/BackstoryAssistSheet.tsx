/**
 * BackstoryAssistSheet
 * Glassmorphism bottom sheet that helps users write a richer companion backstory.
 * Three modes: Guide me, Polish my draft, Surprise me.
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Check, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  gender?: string;
  age?: string | number;
  personality?: string;
  connectionMode?: string;
  bio?: string;
  currentDraft: string;
  onApply: (text: string) => void;
}

const ARCHETYPES = [
  { value: 'mentor', label: 'The Mentor', emoji: '🧭', desc: 'Wise, grounding, calm authority' },
  { value: 'adventurer', label: 'The Adventurer', emoji: '🌍', desc: 'Restless, curious, between places' },
  { value: 'creative', label: 'The Creative', emoji: '🎨', desc: 'Lives inside their craft' },
  { value: 'romantic', label: 'The Romantic', emoji: '💌', desc: 'Warm, attentive, heart-led' },
  { value: 'intellectual', label: 'The Intellectual', emoji: '📚', desc: 'Reader, thinker, deep notes' },
  { value: 'best_friend', label: 'The Best Friend', emoji: '☕', desc: 'Steady, funny, shows up' },
];

export default function BackstoryAssistSheet({
  open, onOpenChange, companionName, gender, age, personality, connectionMode, bio, currentDraft, onApply,
}: Props) {
  const [tab, setTab] = useState<'guide' | 'polish' | 'surprise'>('guide');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  // Guide answers
  const [origin, setOrigin] = useState('');
  const [innerCircle, setInnerCircle] = useState('');
  const [hobby, setHobby] = useState('');
  const [quirk, setQuirk] = useState('');
  const [loveStyle, setLoveStyle] = useState('');

  // Surprise
  const [archetype, setArchetype] = useState('best_friend');

  const baseContext = { companionName, gender, age, personality, connectionMode, bio };

  const generate = async (mode: 'guide' | 'polish' | 'surprise') => {
    setLoading(true);
    setResult('');
    try {
      const body: Record<string, unknown> = { mode, ...baseContext };
      if (mode === 'guide') {
        body.guideAnswers = { origin, innerCircle, hobby, quirk, loveStyle };
      } else if (mode === 'polish') {
        if (!currentDraft.trim()) {
          toast.error('Write a draft first, then polish.');
          setLoading(false);
          return;
        }
        body.draft = currentDraft;
      } else {
        body.archetype = archetype;
      }
      const data = await callEdgeFunction<{ backstory?: string; error?: string }>(
        'assist-backstory',
        body,
      );
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.backstory) {
        setResult(data.backstory);
      } else {
        toast.error('Could not generate backstory.');
      }
    } catch (e) {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result.trim()) return;
    onApply(result.trim());
    toast.success('Backstory applied');
    onOpenChange(false);
    setResult('');
  };

  const inputCls =
    'w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-[#D4AF37]/40 transition-colors';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t border-white/10 bg-black/85 backdrop-blur-2xl p-0 max-h-[88dvh] rounded-t-3xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex flex-col h-full max-h-[88dvh]">
          <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              <span>Help me write {companionName || 'them'}</span>
            </SheetTitle>
            <p className="text-xs text-white/50">A richer backstory means a more dimensional companion.</p>
          </SheetHeader>

          <div className="px-5 shrink-0">
            <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setResult(''); }}>
              <TabsList className="w-full bg-white/[0.05] border border-white/[0.08]">
                <TabsTrigger value="guide" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37]/15 data-[state=active]:text-[#D4AF37]">Guide me</TabsTrigger>
                <TabsTrigger value="polish" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37]/15 data-[state=active]:text-[#D4AF37]">Polish draft</TabsTrigger>
                <TabsTrigger value="surprise" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37]/15 data-[state=active]:text-[#D4AF37]">Surprise me</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {tab === 'guide' && (
              <div className="space-y-3">
                <Field label="Where are they from?" placeholder="e.g. Grew up in Lisbon, now in Brooklyn" value={origin} onChange={setOrigin} cls={inputCls} />
                <Field label="Inner circle (family, friends, pets)" placeholder="e.g. Younger sister Mira, golden retriever Noodle" value={innerCircle} onChange={setInnerCircle} cls={inputCls} />
                <Field label="Hobbies & passions" placeholder="e.g. Surfs at dawn, collects vinyl, writes terrible poetry" value={hobby} onChange={setHobby} cls={inputCls} />
                <Field label="A quirk or signature detail" placeholder="e.g. Always carries a leather notebook" value={quirk} onChange={setQuirk} cls={inputCls} />
                <Field label="How do they show care?" placeholder="e.g. Remembers the small things, sends voice notes" value={loveStyle} onChange={setLoveStyle} cls={inputCls} />
              </div>
            )}

            {tab === 'polish' && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">Your current draft</p>
                <div className={cn(inputCls, 'min-h-[140px] whitespace-pre-wrap text-white/70')}>
                  {currentDraft.trim() || <span className="text-white/30">Write something in the backstory field first, then come back to polish it.</span>}
                </div>
              </div>
            )}

            {tab === 'surprise' && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">Pick a vibe</p>
                <div className="grid grid-cols-2 gap-2">
                  {ARCHETYPES.map(a => (
                    <button
                      key={a.value}
                      onClick={() => setArchetype(a.value)}
                      className={cn(
                        'text-left p-3 rounded-xl border transition-all',
                        archetype === a.value
                          ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]',
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                        <span>{a.emoji}</span>
                        <span>{a.label}</span>
                      </div>
                      <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{a.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#D4AF37]/80 mb-2">Suggested backstory</p>
                <Textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={10}
                  className="bg-transparent border-0 text-sm text-white/90 leading-relaxed resize-none focus-visible:ring-0 p-0"
                />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 bg-black/60 backdrop-blur-md flex gap-2">
            {!result ? (
              <button
                onClick={() => generate(tab)}
                disabled={loading}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-black font-bold text-sm tracking-[0.05em] transition-all',
                  'bg-gradient-to-r from-[#D4AF37] to-[#B8860B]',
                  loading ? 'opacity-60' : 'opacity-100 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]',
                )}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? 'Crafting…' : tab === 'polish' ? 'Polish my draft' : tab === 'surprise' ? 'Surprise me' : 'Write it for me'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => generate(tab)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 px-4 border border-white/15 text-white/70 bg-white/[0.04] hover:bg-white/[0.08] text-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Try again
                </button>
                <button
                  onClick={apply}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-black font-bold text-sm tracking-[0.05em] bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                >
                  <Check className="h-4 w-4" /> Use this
                </button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, placeholder, value, onChange, cls }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; cls: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.15em] text-white/40 mb-1.5">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cls}
      />
    </div>
  );
}

/**
 * Quality whisper — soft hint based on word count.
 */
export function BackstoryQualityWhisper({ text }: { text: string }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let msg = '';
  let tone = 'text-white/30';
  if (words === 0) return null;
  if (words < 25) { msg = 'Add a hobby or quirk to bring them to life'; }
  else if (words < 80) { msg = 'Nice — a few more details will deepen them'; }
  else if (words < 160) { msg = 'Beautiful — they\'re taking shape'; tone = 'text-[#D4AF37]/70'; }
  else { msg = 'Rich and dimensional ✨'; tone = 'text-[#D4AF37]/80'; }
  return <p className={cn('text-[11px] mt-1.5 transition-colors', tone)}>{msg}</p>;
}
