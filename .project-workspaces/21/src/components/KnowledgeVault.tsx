import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, FileText, Trash2, Upload, Loader2, ChevronDown, ChevronRight, Brain, X, Briefcase, MapPin, Shield, Calendar, Tag, GitCompare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SyncIndicator from './SyncIndicator';
import VaultIndexingBar from './VaultIndexingBar';

export interface KnowledgeDoc {
  id: string;
  title: string;
  content_text: string;
  source_type: string;
  file_url: string | null;
  category: string;
  created_at: string;
  effective_date: string | null;
  version_label: string | null;
  supersedes_id: string | null;
  delta_summary: string | null;
  is_active: boolean;
}

const CATEGORIES = [
  { value: 'work-rules', label: 'Work Rules', icon: Briefcase, color: 'text-amber-400' },
  { value: 'travel', label: 'Destination Guide', icon: MapPin, color: 'text-emerald-400' },
  { value: 'safety', label: 'Safety & Procedures', icon: Shield, color: 'text-red-400' },
  { value: 'general', label: 'General Reference', icon: BookOpen, color: 'text-primary' },
];

export default function KnowledgeVault({ userId }: { userId?: string }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [addMode, setAddMode] = useState<'text' | 'file'>('text');
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');

  const fetchDocs = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('knowledge_documents' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setDocs(data as any);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    if (!docs.some((d) => d.content_text === '⏳ Extracting content...')) return;
    const interval = window.setInterval(() => {
      fetchDocs();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [docs, fetchDocs]);

  // Find previous doc in same category for delta comparison
  const findPreviousVersion = (category: string): KnowledgeDoc | null => {
    return docs.find(
      (d) => d.category === category && d.is_active && !d.content_text.startsWith('⏳') && !d.content_text.startsWith('❌')
    ) || null;
  };

  const resetForm = () => {
    setNewTitle(''); setNewContent(''); setNewEffectiveDate(''); setNewVersionLabel(''); setAdding(false);
  };

  const handleAddText = async () => {
    if (!userId || !newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setUploading(true);
    try {
      const previousDoc = findPreviousVersion(newCategory);

      // Deactivate previous version in same category if exists
      if (previousDoc) {
        await supabase.from('knowledge_documents' as any)
          .update({ is_active: false } as any)
          .eq('id', previousDoc.id);
      }

      const { data: insertedDoc, error } = await supabase.from('knowledge_documents' as any).insert({
        user_id: userId,
        title: newTitle.trim(),
        content_text: newContent.trim(),
        source_type: 'manual',
        category: newCategory,
        effective_date: newEffectiveDate || null,
        version_label: newVersionLabel.trim() || null,
        supersedes_id: previousDoc?.id || null,
        is_active: true,
      } as any).select('id').single();
      if (error) throw error;

      toast.success('Knowledge added to your vault');
      resetForm();
      fetchDocs();

      // Trigger delta comparison if there's a previous version
      if (previousDoc && (insertedDoc as any)?.id) {
        triggerDeltaSync((insertedDoc as any).id, previousDoc.id);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setUploading(false);
    }
  };

  const triggerDeltaSync = async (newDocId: string, oldDocId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode: 'delta', newDocId, oldDocId }),
      });
      if (resp.ok) {
        toast.success('Delta comparison complete — check changes ✨');
        fetchDocs();
      }
    } catch {
      // Delta is optional, don't block
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB');
      return;
    }

    let insertedDocId: string | null = null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = `${userId}/${Date.now()}.${ext}`;
      const previousDoc = findPreviousVersion(newCategory);

      const { error: uploadError } = await supabase.storage
        .from('knowledge-vault')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('knowledge-vault')
        .getPublicUrl(filePath);

      const { data: docData, error: insertError } = await supabase
        .from('knowledge_documents' as any)
        .insert({
          user_id: userId,
          title: newTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
          content_text: '⏳ Extracting content...',
          source_type: 'pdf',
          file_url: urlData.publicUrl,
          category: newCategory,
          effective_date: newEffectiveDate || null,
          version_label: newVersionLabel.trim() || null,
          supersedes_id: previousDoc?.id || null,
          is_active: true,
        } as any)
        .select('id')
        .single();
      if (insertError) throw insertError;

      insertedDocId = (docData as any).id;
      toast.success('Document uploaded — extraction started...');
      resetForm();
      fetchDocs();

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          fileUrl: urlData.publicUrl,
          fileName: file.name,
          documentId: insertedDocId,
          previousDocId: previousDoc?.id || null,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to start extraction');
      }

      fetchDocs();
    } catch (e: any) {
      if (insertedDocId) {
        await supabase
          .from('knowledge_documents' as any)
          .update({
            content_text: '❌ Extraction failed — please tap Remove and re-upload.',
            is_active: false,
          } as any)
          .eq('id', insertedDocId);
        fetchDocs();
      }
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      // Also remove from storage if there's a file
      const doc = docs.find(d => d.id === id);
      if (doc?.file_url) {
        const storagePath = doc.file_url.includes('/storage/v1/object/')
          ? doc.file_url.split('/storage/v1/object/')[1]?.replace(/^(public|authenticated)\//, '')
          : null;
        if (storagePath) {
          const parts = storagePath.split('/');
          const bucket = parts[0];
          const path = parts.slice(1).join('/');
          await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
        }
      }
      const { error } = await supabase.from('knowledge_documents' as any).delete().eq('id', id);
      if (error) { toast.error('Failed to delete'); return; }
      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Removed from vault');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryMeta = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[3];

  const effectiveDateStatus = (doc: KnowledgeDoc) => {
    if (!doc.effective_date) return null;
    const eff = new Date(doc.effective_date);
    const now = new Date();
    if (eff > now) return 'pending';
    return 'active';
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      {/* Vault Indexing Micro-Thread */}
      {userId && <VaultIndexingBar userId={userId} detailed />}

      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Your Vault
        </h3>
        <div className="flex items-center gap-2">
          <SyncIndicator docs={docs} uploading={uploading} />
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Upload documents, medical records, guides, or paste notes. Your companion uses this knowledge to give you expert, factual answers.
        </p>

        {/* Add Form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                {/* Mode toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddMode('text')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${addMode === 'text' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground'}`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Paste Text
                  </button>
                  <button
                    onClick={() => setAddMode('file')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${addMode === 'file' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground'}`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload PDF
                  </button>
                </div>

                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Document title (e.g. Delta Work Rules Section 7)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                {/* Version & Effective Date row */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mb-1">
                      <Tag className="h-2.5 w-2.5" /> Version
                    </label>
                    <input
                      value={newVersionLabel}
                      onChange={e => setNewVersionLabel(e.target.value)}
                      placeholder="e.g. v2.4"
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mb-1">
                      <Calendar className="h-2.5 w-2.5" /> Effective Date
                    </label>
                    <input
                      type="date"
                      value={newEffectiveDate}
                      onChange={e => setNewEffectiveDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Category picker */}
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map(cat => {
                    const prev = findPreviousVersion(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setNewCategory(cat.value)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          newCategory === cat.value
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary/40 text-muted-foreground border border-transparent'
                        }`}
                      >
                        <cat.icon className="h-3 w-3" /> {cat.label}
                        {newCategory === cat.value && prev && (
                          <span className="text-[8px] text-amber-400 ml-0.5">↑ replaces {prev.version_label || 'prev'}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {addMode === 'text' ? (
                  <>
                    <textarea
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      placeholder="Paste your work rules, notes, or reference material here..."
                      rows={6}
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={handleAddText}
                      disabled={uploading || !newTitle.trim() || !newContent.trim()}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                      Add to Vault
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 cursor-pointer hover:bg-primary/10 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      className="hidden"
                      disabled={uploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = '';
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-primary/60 mb-2" />
                        <span className="text-xs text-muted-foreground">Drop a PDF, TXT, or MD file</span>
                        <span className="text-[10px] text-muted-foreground/50 mt-1">Max 20MB • AI extracts & compares automatically</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document List */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground/50">No documents yet</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">Add work rules, guides, or notes for expert answers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const catMeta = getCategoryMeta(doc.category);
              const isExpanded = expandedId === doc.id;
              const isExtracting = doc.content_text === '⏳ Extracting content...';
              const contentPreview = doc.content_text.length > 200
                ? doc.content_text.substring(0, 200) + '...'
                : doc.content_text;
              const effStatus = effectiveDateStatus(doc);

              return (
                <motion.div
                  key={doc.id}
                  layout
                  className={`rounded-xl border overflow-hidden ${
                    !doc.is_active ? 'border-border/15 bg-secondary/10 opacity-60' : 'border-border/30 bg-secondary/20'
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                  >
                    <catMeta.icon className={`h-4 w-4 ${catMeta.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{doc.title}</p>
                        {doc.version_label && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0">
                            {doc.version_label}
                          </span>
                        )}
                        {!doc.is_active && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                            Superseded
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {catMeta.label} • {doc.source_type === 'pdf' ? 'PDF' : 'Text'} • {new Date(doc.created_at).toLocaleDateString()}
                        {effStatus === 'pending' && (
                          <span className="text-amber-400 ml-1">• Effective {new Date(doc.effective_date!).toLocaleDateString()}</span>
                        )}
                        {effStatus === 'active' && doc.effective_date && (
                          <span className="text-emerald-400 ml-1">• Active since {new Date(doc.effective_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    {isExtracting && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                          {/* Delta Summary */}
                          {doc.delta_summary && (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5">
                              <p className="text-[10px] font-medium text-amber-400 flex items-center gap-1 mb-1">
                                <GitCompare className="h-3 w-3" /> Changes from Previous Version
                              </p>
                              <p className="text-[11px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {doc.delta_summary}
                              </p>
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {isExtracting ? '⏳ AI is extracting content from your document...' : contentPreview}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground/50">
                              {doc.content_text.length.toLocaleString()} chars
                            </span>
                            {doc.effective_date && (
                              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                                <Calendar className="h-2.5 w-2.5" /> {new Date(doc.effective_date).toLocaleDateString()}
                              </span>
                            )}
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="ml-auto flex items-center gap-1 text-[10px] text-destructive/70 hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              {deletingId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              {deletingId === doc.id ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
