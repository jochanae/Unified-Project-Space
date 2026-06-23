import { useState } from 'react';
import { Wand2, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';

const ORIGIN_PRESETS = [
  { id: 'childhood', label: 'Childhood friends', emoji: '🏡' },
  { id: 'cafe', label: 'Met at a café', emoji: '☕' },
  { id: 'college', label: 'College roommates', emoji: '🎓' },
  { id: 'coworkers', label: 'Coworkers', emoji: '💼' },
  { id: 'online', label: 'Online friends', emoji: '💬' },
  { id: 'gym', label: 'Gym buddies', emoji: '🏋️' },
] as const;

interface OriginStoryPickerProps {
  companionName: string;
  personality?: string;
  age?: string;
  gender?: string;
  connectionMode?: string;
  bio?: string;
  backstory?: string;
  /** Called with the final origin story text */
  onSelect: (story: string) => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
  /** Show skip button */
  showSkip?: boolean;
  /** Compact mode for inline display in AvatarLightbox */
  compact?: boolean;
}

export default function OriginStoryPicker({
  companionName, personality, age, gender, connectionMode, bio, backstory,
  onSelect, onSkip, showSkip, compact,
}: OriginStoryPickerProps) {
  const [generating, setGenerating] = useState(false);
  const [writeOwn, setWriteOwn] = useState(false);
  const [draft, setDraft] = useState('');

  const generateWithContext = async (meetingContext?: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-backstory', {
        body: {
          companionName, personality, age, gender, connectionMode, bio, backstory,
          type: 'origin',
          ...(meetingContext ? { meetingContext } : {}),
        },
      });
      if (error) throw error;
      const story = data?.backstory || '';
      if (story) {
        onSelect(story);
        toast.success('Origin story created! ✨');
      }
    } catch (e) {
      console.error('Generate origin story error:', e);
      toast.error('Failed to generate origin story');
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
        <p className="text-xs text-white/50">Writing your story with {companionName}…</p>
      </div>
    );
  }

  if (writeOwn) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`How did you and ${companionName} meet? What were those early days like?`}
          className="min-h-[80px] bg-white/5 border-white/10 text-xs text-white/80 placeholder:text-white/30 resize-none"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => { if (draft.trim()) onSelect(draft.trim()); }}
            disabled={!draft.trim()}
            className="flex-1 rounded-lg bg-primary/20 border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-40 transition-all"
          >
            Save
          </button>
          <button
            onClick={() => { setWriteOwn(false); setDraft(''); }}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white/70 transition-all"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs text-white/50 mb-1">How did you and {companionName} meet?</p>
      )}
      <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-2 gap-2'}>
        {ORIGIN_PRESETS.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => generateWithContext(label)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left transition-all hover:bg-white/[0.08] hover:border-primary/20 active:scale-[0.97]"
          >
            <span className="text-sm">{emoji}</span>
            <span className="block text-[11px] font-medium text-white/60 mt-0.5 leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        <button
          onClick={() => setWriteOwn(true)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all"
        >
          <Pencil className="h-3 w-3" /> Write my own
        </button>
        <button
          onClick={() => generateWithContext()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-[11px] font-medium text-primary/80 hover:bg-primary/15 transition-all"
        >
          <Wand2 className="h-3 w-3" /> ✨ Generate with AI
        </button>
      </div>
      {showSkip && onSkip && (
        <button
          onClick={onSkip}
          className="w-full text-center text-[11px] text-white/40 hover:text-white/50 py-1 transition-colors"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

export { ORIGIN_PRESETS };
