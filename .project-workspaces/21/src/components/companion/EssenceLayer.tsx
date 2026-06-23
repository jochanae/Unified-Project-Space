/**
 * EssenceLayer — "Who Shaped You" influence manager.
 * Lets users add people whose energy, phrases, and beliefs
 * subtly influence how their companion responds.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EssenceEntry {
  id: string;
  person_name: string;
  relationship: string | null;
  influence_type: string;
  content: string;
  trigger_context: string[];
  weight: number;
  created_at: string;
}

interface EssenceLayerProps {
  userId: string;
  memberId: string;
  companionName: string;
}

const TRIGGER_OPTIONS = [
  { value: 'self_doubt', label: 'When I doubt myself' },
  { value: 'frustration', label: "When I'm frustrated" },
  { value: 'stress', label: "When I'm stressed" },
  { value: 'celebration', label: "When I'm celebrating" },
  { value: 'grief', label: "When I'm grieving" },
  { value: 'confusion', label: "When I'm confused" },
  { value: 'loneliness', label: "When I feel alone" },
  { value: 'excitement', label: "When I'm excited" },
] as const;

const INFLUENCE_TYPES = [
  { value: 'phrase', label: 'Something they say' },
  { value: 'belief', label: 'A belief they carry' },
  { value: 'tone', label: 'How they show up' },
] as const;

export default function EssenceLayer({ userId, memberId, companionName }: EssenceLayerProps) {
  const [entries, setEntries] = useState<EssenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [influenceType, setInfluenceType] = useState('phrase');
  const [content, setContent] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [weight, setWeight] = useState(0.5);

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('essence_influences' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (data) setEntries(data as any);
    setLoading(false);
  }, [userId, memberId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const resetForm = () => {
    setPersonName(''); setRelationship(''); setInfluenceType('phrase');
    setContent(''); setTriggers([]); setWeight(0.5); setAdding(false);
  };

  const saveEntry = async () => {
    if (!personName.trim() || !content.trim()) {
      toast.error('Name and content are required');
      return;
    }
    if (entries.length >= 10) {
      toast.error('Maximum 10 influences — keep it focused');
      return;
    }

    const { error } = await supabase.from('essence_influences' as any).insert({
      user_id: userId,
      member_id: memberId,
      person_name: personName.trim(),
      relationship: relationship.trim() || null,
      influence_type: influenceType,
      content: content.trim(),
      trigger_context: triggers,
      weight,
    } as any);

    if (error) { toast.error('Failed to save'); return; }
    toast.success(`${personName.trim()}'s essence saved`);
    resetForm();
    fetchEntries();
  };

  const deleteEntry = async (id: string, name: string) => {
    await supabase.from('essence_influences' as any).delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success(`${name}'s influence removed`);
  };

  const strengthLabel = (w: number) => w >= 0.7 ? 'Strong' : w >= 0.4 ? 'Balanced' : 'Subtle';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" /> Essence Layer
          </h4>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            People who shaped you — their energy subtly influences {companionName}
          </p>
        </div>
        {!adding && entries.length < 10 && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 overflow-hidden"
          >
            <p className="text-[10px] text-muted-foreground/60 italic">
              Who is someone whose voice still sticks with you?
            </p>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                placeholder="Name or nickname"
                className="col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
              />
              <input
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                placeholder="Relationship (optional)"
                className="col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
              />
            </div>

            {/* Influence type */}
            <div className="flex gap-1.5 flex-wrap">
              {INFLUENCE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setInfluenceType(t.value)}
                  className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${
                    influenceType === t.value
                      ? 'border-primary/40 text-primary bg-primary/10'
                      : 'border-white/[0.06] text-muted-foreground/50 hover:border-white/[0.12]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                influenceType === 'phrase' ? '"You always figure it out"' :
                influenceType === 'belief' ? 'Hard things can be solved with patience' :
                'Calm, steady, always makes you feel grounded'
              }
              rows={2}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 resize-none"
            />

            {/* Triggers */}
            <div>
              <p className="text-[10px] text-muted-foreground/50 mb-1.5">When should this energy show up?</p>
              <div className="flex gap-1.5 flex-wrap">
                {TRIGGER_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTriggers(prev =>
                      prev.includes(t.value) ? prev.filter(x => x !== t.value) : [...prev, t.value]
                    )}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                      triggers.includes(t.value)
                        ? 'border-primary/40 text-primary bg-primary/10'
                        : 'border-white/[0.06] text-muted-foreground/40 hover:border-white/[0.12]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Strength slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground/50">Strength</p>
                <span className="text-[10px] text-primary/60">{strengthLabel(weight)}</span>
              </div>
              <Slider
                value={[weight]}
                onValueChange={([v]) => setWeight(v)}
                min={0.1}
                max={0.9}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEntry}
                disabled={!personName.trim() || !content.trim()}
                className="flex-1 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-30"
              >
                Save Influence
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-white/[0.08] text-xs text-muted-foreground/60 hover:border-white/[0.15] transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {loading ? (
        <p className="text-[10px] text-muted-foreground/30 text-center py-4">Loading…</p>
      ) : entries.length === 0 && !adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-6 rounded-xl border border-dashed border-white/[0.08] text-center hover:border-white/[0.15] transition-all group"
        >
          <Sparkles className="h-4 w-4 text-primary/30 mx-auto mb-1 group-hover:text-primary/50 transition-colors" />
          <p className="text-[11px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
            Add someone who shaped you
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {entries.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground/80">{entry.person_name}</span>
                      {entry.relationship && (
                        <span className="text-[9px] text-muted-foreground/40">{entry.relationship}</span>
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/50">
                        {entry.influence_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">"{entry.content}"</p>
                    {entry.trigger_context.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {entry.trigger_context.map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-muted-foreground/40">
                            {TRIGGER_OPTIONS.find(o => o.value === t)?.label || t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id, entry.person_name)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3 text-destructive/50" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {entries.length > 0 && entries.length < 10 && !adding && (
        <p className="text-[9px] text-muted-foreground/30 text-center">
          {entries.length}/10 influences · Keep it focused for maximum impact
        </p>
      )}
    </div>
  );
}
