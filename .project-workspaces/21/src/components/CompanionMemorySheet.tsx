import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trash2, X, Heart, Sparkles, Shield, ChevronDown, Pencil, Check, Plus, MapPin, Star, Coffee, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Memory {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
}

interface CompanionFact {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
  source: string;
}

interface CompanionMemorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  companionName: string;
  memberId?: string;
}

const USER_CATEGORY_META: Record<string, { label: string; icon: typeof Heart; intro: string; color: string }> = {
  general:   { label: 'About you',      icon: Sparkles, intro: "Things I've picked up about your life.",           color: 'text-primary' },
  emotional: { label: 'Your heart',     icon: Heart,    intro: "Patterns I've noticed in how you feel.",            color: 'text-accent' },
  wellness:  { label: 'Your wellbeing', icon: Shield,   intro: 'What I know about how you take care of yourself.', color: 'text-primary' },
};

const COMPANION_CATEGORY_META: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  background:  { label: 'Background',  icon: MapPin, color: 'text-primary' },
  personality: { label: 'Personality', icon: Star,   color: 'text-accent' },
  interests:   { label: 'Interests',   icon: Coffee, color: 'text-primary' },
  life:        { label: 'Their world', icon: User,   color: 'text-muted-foreground' },
};

export default function CompanionMemorySheet({ open, onOpenChange, userId, companionName, memberId }: CompanionMemorySheetProps) {
  const [tab, setTab] = useState<'they' | 'you'>('they');

  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const [facts, setFacts] = useState<CompanionFact[]>([]);
  const [factsLoading, setFactsLoading] = useState(false);
  const [addingFact, setAddingFact] = useState(false);
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState('background');
  const [expandedFactCategory, setExpandedFactCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setMemoriesLoading(true);
    let query = supabase.from('memories').select('id, text, category, extracted_at').eq('user_id', userId);
    if (memberId) query = query.eq('member_id', memberId);
    query.order('extracted_at', { ascending: false }).then(({ data }) => {
      setMemories((data as Memory[]) || []);
      setMemoriesLoading(false);
      if (data && data.length > 0) setExpandedCategory(data[0]?.category || null);
    });
  }, [open, userId, memberId]);

  useEffect(() => {
    if (!open || !userId || !memberId) return;
    setFactsLoading(true);
    supabase
      .from('companion_facts')
      .select('id, text, category, extracted_at, source')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .order('extracted_at', { ascending: false })
      .then(({ data }) => {
        setFacts((data as CompanionFact[]) || []);
        setFactsLoading(false);
        if (data && data.length > 0) setExpandedFactCategory(data[0]?.category || null);
      });
  }, [open, userId, memberId]);

  const grouped = useMemo(() => {
    const map: Record<string, Memory[]> = {};
    for (const m of memories) { if (!map[m.category]) map[m.category] = []; map[m.category].push(m); }
    return map;
  }, [memories]);

  const groupedFacts = useMemo(() => {
    const map: Record<string, CompanionFact[]> = {};
    for (const f of facts) { if (!map[f.category]) map[f.category] = []; map[f.category].push(f); }
    return map;
  }, [facts]);

  const handleDeleteMemory = async (id: string) => {
    const { error } = await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);
    if (!error) { setMemories(prev => prev.filter(m => m.id !== id)); toast.success('Memory removed'); }
  };
  const handleStartEdit = (m: Memory) => { setEditingId(m.id); setEditText(m.text); };
  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from('memories').update({ text: editText.trim() }).eq('id', id);
    if (!error) setMemories(prev => prev.map(m => m.id === id ? { ...m, text: editText.trim() } : m));
    else toast.error('Failed to update');
    setEditingId(null); setEditText('');
  };
  const handleCancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleDeleteFact = async (id: string) => {
    const { error } = await supabase.from('companion_facts').delete().eq('id', id).eq('user_id', userId);
    if (!error) { setFacts(prev => prev.filter(f => f.id !== id)); toast.success('Removed'); }
  };

  const handleAddFact = async () => {
    if (!newFactText.trim() || !memberId) return;
    const { data, error } = await supabase.from('companion_facts').insert({
      user_id: userId, member_id: memberId, text: newFactText.trim(),
      category: newFactCategory, source: 'manual',
    }).select().single();
    if (!error && data) {
      setFacts(prev => [data as CompanionFact, ...prev]);
      setNewFactText(''); setAddingFact(false);
      setExpandedFactCategory(newFactCategory);
      toast.success('Added');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-foreground/20" />
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.15 }}
              className="flex flex-col flex-1 overflow-hidden"
            >

            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 border border-accent/20">
                  <Brain className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">{companionName} &amp; You</h3>
                  <p className="text-[11px] text-muted-foreground">The things you both carry</p>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 px-5 py-3 border-b border-border/20">
              <button
                onClick={() => setTab('they')}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all border ${tab === 'they' ? 'bg-accent/15 border-accent/30 text-accent' : 'bg-muted/30 border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                🧠 {companionName} knows
              </button>
              <button
                onClick={() => setTab('you')}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all border ${tab === 'you' ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted/30 border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                ✨ You know
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">

              {tab === 'they' && (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed italic pt-4 pb-2">
                    {companionName} has been paying attention. Here's what they carry with them every time you talk. Tap to edit or remove anything.
                  </p>
                  {memoriesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Brain className="h-6 w-6 text-muted-foreground" /></div>
                      <p className="text-sm text-muted-foreground">No memories yet</p>
                      <p className="text-xs text-muted-foreground/70 max-w-[240px]">Keep chatting — {companionName} picks up on the things that matter to you.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {(['general', 'emotional', 'wellness'] as const).map(cat => {
                        const items = grouped[cat];
                        if (!items || items.length === 0) return null;
                        const meta = USER_CATEGORY_META[cat];
                        const Icon = meta.icon;
                        const isExpanded = expandedCategory === cat;
                        return (
                          <div key={cat} className="rounded-xl border border-border/40 overflow-hidden">
                            <button onClick={() => setExpandedCategory(isExpanded ? null : cat)} className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60"><Icon className={`h-3.5 w-3.5 ${meta.color}`} /></div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{items.length}</span>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="px-4 pb-1"><p className="text-[11px] text-muted-foreground/70 italic mb-2">"{meta.intro}"</p></div>
                                  <div className="px-4 pb-3 space-y-1.5">
                                    {items.map(m => (
                                      <div key={m.id} className="group flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                        {editingId === m.id ? (
                                          <div className="flex-1 flex flex-col gap-1.5">
                                            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" rows={2} autoFocus
                                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(m.id); } if (e.key === 'Escape') handleCancelEdit(); }} />
                                            <div className="flex gap-1.5 justify-end">
                                              <button onClick={handleCancelEdit} className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded">Cancel</button>
                                              <button onClick={() => handleSaveEdit(m.id)} disabled={!editText.trim()} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded disabled:opacity-40"><Check className="h-2.5 w-2.5" /> Save</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <p className="flex-1 text-[13px] text-foreground/90 leading-relaxed cursor-pointer" onClick={() => handleStartEdit(m)} title="Tap to edit">{m.text}</p>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                              <button onClick={() => handleStartEdit(m)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/10" title="Edit"><Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" /></button>
                                              <button onClick={() => handleDeleteMemory(m.id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-destructive/10" title="Delete"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === 'you' && (
                <>
                  <div className="flex items-center justify-between pt-4 pb-2">
                    <p className="text-xs text-muted-foreground leading-relaxed italic flex-1">
                      Things {companionName} has shared. Grows naturally — or add your own.
                    </p>
                    <button onClick={() => setAddingFact(!addingFact)} className="flex items-center gap-1 ml-3 shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  <AnimatePresence>
                    {addingFact && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col gap-2">
                          <textarea value={newFactText} onChange={(e) => setNewFactText(e.target.value)} placeholder={`Something ${companionName} told you…`}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50" rows={2} autoFocus />
                          <div className="flex gap-2">
                            <select value={newFactCategory} onChange={(e) => setNewFactCategory(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none">
                              <option value="background">Background</option>
                              <option value="personality">Personality</option>
                              <option value="interests">Interests</option>
                              <option value="life">Their world</option>
                            </select>
                            <button onClick={() => { setAddingFact(false); setNewFactText(''); }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg">Cancel</button>
                            <button onClick={handleAddFact} disabled={!newFactText.trim()} className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/15 hover:bg-primary/25 rounded-lg disabled:opacity-40 transition-colors">Save</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {factsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : facts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Sparkles className="h-6 w-6 text-muted-foreground" /></div>
                      <p className="text-sm text-muted-foreground">Nothing yet</p>
                      <p className="text-xs text-muted-foreground/70 max-w-[240px]">As {companionName} shares things about themselves, they'll appear here. You can also add things manually.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-1">
                      {(['background', 'personality', 'interests', 'life'] as const).map(cat => {
                        const items = groupedFacts[cat];
                        if (!items || items.length === 0) return null;
                        const meta = COMPANION_CATEGORY_META[cat];
                        const Icon = meta.icon;
                        const isExpanded = expandedFactCategory === cat;
                        return (
                          <div key={cat} className="rounded-xl border border-border/40 overflow-hidden">
                            <button onClick={() => setExpandedFactCategory(isExpanded ? null : cat)} className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60"><Icon className={`h-3.5 w-3.5 ${meta.color}`} /></div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{items.length}</span>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="px-4 pb-3 space-y-1.5 pt-1">
                                    {items.map(f => (
                                      <div key={f.id} className="group flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                        <p className="flex-1 text-[13px] text-foreground/90 leading-relaxed">{f.text}</p>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                          {f.source === 'manual' && <span className="text-[9px] text-muted-foreground/50 mr-1">manual</span>}
                                          <button onClick={() => handleDeleteFact(f.id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-destructive/10" title="Remove"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
