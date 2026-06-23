import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Trash2, Download, ChevronRight, X, Brain, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrivacyCenterProps {
  userId?: string;
  companionName?: string;
}

interface MemoryEntry {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
}

export default function PrivacyCenter({ userId, companionName }: PrivacyCenterProps) {
  const [showMemoryViewer, setShowMemoryViewer] = useState(false);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [camiMemories, setCamiMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadAllMemories = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [companionRes, camiRes] = await Promise.all([
        supabase.from('memories').select('*').eq('user_id', userId).order('extracted_at', { ascending: false }),
        supabase.from('cami_memories').select('*').eq('user_id', userId).order('extracted_at', { ascending: false }),
      ]);
      setMemories(companionRes.data || []);
      setCamiMemories(camiRes.data || []);
    } catch (e) {
      console.error('Failed to load memories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showMemoryViewer) loadAllMemories();
  }, [showMemoryViewer, userId]);

  const deleteMemory = async (id: string, table: 'memories' | 'cami_memories') => {
    setDeletingId(id);
    try {
      await supabase.from(table).delete().eq('id', id);
      if (table === 'memories') {
        setMemories(prev => prev.filter(m => m.id !== id));
      } else {
        setCamiMemories(prev => prev.filter(m => m.id !== id));
      }
      toast.success('Memory deleted');
    } catch {
      toast.error('Failed to delete memory');
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllMemories = async (table: 'memories' | 'cami_memories', label: string) => {
    if (!confirm(`Delete all ${label} memories? This cannot be undone.`)) return;
    try {
      await supabase.from(table).delete().eq('user_id', userId!);
      if (table === 'memories') setMemories([]);
      else setCamiMemories([]);
      toast.success(`All ${label} memories cleared`);
    } catch {
      toast.error('Failed to clear memories');
    }
  };

  const exportData = async () => {
    if (!userId) return;
    setExporting(true);
    try {
      const [profileRes, memoriesRes, camiRes, messagesRes, moodRes, journalRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId),
        supabase.from('memories').select('*').eq('user_id', userId),
        supabase.from('cami_memories').select('*').eq('user_id', userId),
        supabase.from('chat_messages').select('content, role, member_id, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('mood_checkins').select('*').eq('user_id', userId),
        supabase.from('journal_entries').select('*').eq('user_id', userId),
      ]);

      const exportObj = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data?.[0] || null,
        companion_memories: memoriesRes.data || [],
        cami_memories: camiRes.data || [],
        chat_messages: messagesRes.data || [],
        mood_checkins: moodRes.data || [],
        journal_entries: journalRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compani-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const renderMemoryList = (items: MemoryEntry[], table: 'memories' | 'cami_memories') => {
    const grouped = {
      general: items.filter(m => m.category === 'general'),
      emotional: items.filter(m => m.category === 'emotional'),
      wellness: items.filter(m => m.category === 'wellness'),
    };
    const categoryLabels = { general: 'About You', emotional: 'Emotional Patterns', wellness: 'Wellness' };

    return Object.entries(grouped).map(([cat, entries]) => {
      if (entries.length === 0) return null;
      return (
        <div key={cat} className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{categoryLabels[cat as keyof typeof categoryLabels]}</p>
          {entries.map(m => (
            <div key={m.id} className="flex items-start justify-between gap-2 rounded-lg bg-secondary/30 px-3 py-2 group">
              <p className="text-sm text-foreground leading-relaxed flex-1">• {m.text}</p>
              <button
                onClick={() => deleteMemory(m.id, table)}
                disabled={deletingId === m.id}
                className="shrink-0 rounded-md p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                {deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <>
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Privacy & Data
        </h3>
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
          {/* Privacy summary */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Your data stays yours</p>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground ml-6">
              <li>• Conversations are encrypted and only accessible to you</li>
              <li>• Your friends and Cami have separate, isolated memories</li>
              <li>• No data is sold or shared with third parties</li>
              <li>• You can export or delete your data at any time</li>
            </ul>
          </div>

          {/* Memory viewer */}
          <button
            onClick={() => setShowMemoryViewer(true)}
            className="flex w-full items-center justify-between rounded-xl bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">What do my friends know about me?</p>
                <p className="text-xs text-muted-foreground">View and manage all stored memories</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Export data */}
          <button
            onClick={exportData}
            disabled={exporting}
            className="flex w-full items-center justify-between rounded-xl bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary/60 disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Export my data</p>
                <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
              </div>
            </div>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </section>

      {/* Memory viewer modal */}
      <AnimatePresence>
        {showMemoryViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMemoryViewer(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl bg-card border-t border-border/40 p-6 pb-24 max-h-[80vh] flex flex-col"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-foreground">Memory Viewer</h2>
                <button onClick={() => setShowMemoryViewer(false)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Companion memories */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">What your friends know</p>
                        </div>
                        {memories.length > 0 && (
                          <button
                            onClick={() => clearAllMemories('memories', 'companion')}
                            className="text-xs text-destructive hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {memories.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-6">No memories yet — chat to build them.</p>
                      ) : (
                        <div className="space-y-3 pl-2">{renderMemoryList(memories, 'memories')}</div>
                      )}
                    </div>

                    {/* Cami memories */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <p className="text-sm font-semibold text-foreground">What Cami knows</p>
                        </div>
                        {camiMemories.length > 0 && (
                          <button
                            onClick={() => clearAllMemories('cami_memories', 'Cami')}
                            className="text-xs text-destructive hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {camiMemories.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-6">Cami hasn't learned anything about you yet.</p>
                      ) : (
                        <div className="space-y-3 pl-2">{renderMemoryList(camiMemories, 'cami_memories')}</div>
                      )}
                    </div>

                    {/* Privacy note */}
                    <div className="rounded-xl bg-secondary/40 border border-border/30 p-3 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">Memory boundaries</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Your friends and Cami maintain separate memories. What you share with one stays with them — they don't share information with each other unless you bring it up yourself.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
