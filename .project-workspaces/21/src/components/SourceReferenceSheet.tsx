/**
 * SourceReferenceSheet — bottom sheet that shows the vault document source
 * when a user taps a [SOURCE:] tagged term in a companion message.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SourceReferenceSheetProps {
  open: boolean;
  onClose: () => void;
  docTitle: string;
  term: string;
  userId: string;
}

export default function SourceReferenceSheet({ open, onClose, docTitle, term, userId }: SourceReferenceSheetProps) {
  const [doc, setDoc] = useState<{ title: string; content_text: string; category: string; version_label: string | null; file_url: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [snippet, setSnippet] = useState('');
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (!open || !docTitle || !userId) return;
    setLoading(true);
    setShowFull(false);

    (async () => {
      // Find the document by title (fuzzy match)
      const { data } = await supabase
        .from('knowledge_documents' as any)
        .select('title, content_text, category, version_label, file_url')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!data || data.length === 0) { setLoading(false); return; }

      // Find best match by title similarity
      const normalizedTitle = docTitle.toLowerCase().trim();
      const matched = (data as any[]).find(d =>
        d.title.toLowerCase().trim() === normalizedTitle
      ) || (data as any[]).find(d =>
        d.title.toLowerCase().includes(normalizedTitle) ||
        normalizedTitle.includes(d.title.toLowerCase())
      ) || (data as any[])[0];

      setDoc(matched);

      // Extract snippet around the referenced term
      if (matched?.content_text) {
        const content = matched.content_text;
        const termLower = term.toLowerCase().replace(/[^a-z0-9.\s$]/g, '');
        const contentLower = content.toLowerCase();
        const idx = contentLower.indexOf(termLower);

        if (idx !== -1) {
          // Get ~400 chars around the match
          const start = Math.max(0, idx - 200);
          const end = Math.min(content.length, idx + termLower.length + 200);
          let extracted = content.substring(start, end).trim();
          if (start > 0) extracted = '…' + extracted;
          if (end < content.length) extracted = extracted + '…';
          setSnippet(extracted);
        } else {
          // Fallback: first 400 chars
          setSnippet(content.substring(0, 400) + (content.length > 400 ? '…' : ''));
        }
      }
      setLoading(false);
    })();
  }, [open, docTitle, term, userId]);

  // Highlight the term within snippet
  const renderSnippet = (text: string) => {
    if (!term) return text;
    const termEscaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${termEscaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/25 text-primary rounded px-1 py-0.5 font-medium" style={{ boxShadow: '0 0 8px hsl(var(--primary) / 0.2)' }}>{part}</mark>
        : part
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-hidden rounded-t-[20px] border-t border-primary/20 bg-[#131424]/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Source Reference</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Vault</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-6 overflow-y-auto max-h-[55vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
                </div>
              ) : doc ? (
                <div className="space-y-4">
                  {/* Document info */}
                  <div className="rounded-xl bg-muted/20 border border-border/20 p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-full px-2 py-0.5">
                            {doc.category.replace('-', ' ')}
                          </span>
                          {doc.version_label && (
                            <span className="text-[10px] uppercase tracking-wider text-primary/70 bg-primary/10 rounded-full px-2 py-0.5">
                              {doc.version_label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Referenced term */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1 bg-primary/10" />
                    <span className="text-[10px] uppercase tracking-[0.15em] text-primary/60 font-semibold">Referenced: "{term}"</span>
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>

                  {/* Snippet */}
                  <div className="rounded-xl bg-[#1a1b2e]/50 border border-border/15 p-4">
                    <p className="text-[13px] leading-[1.8] font-light text-foreground/90 whitespace-pre-wrap">
                      {renderSnippet(showFull && doc.content_text ? doc.content_text : snippet)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {doc.content_text && doc.content_text.length > 500 && (
                      <button
                        onClick={() => setShowFull(!showFull)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {showFull ? 'Show Snippet' : 'View Full Document'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Document not found in vault</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">The referenced document may have been removed</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
