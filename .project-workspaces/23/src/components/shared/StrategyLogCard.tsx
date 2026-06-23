import { useState } from 'react';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { useNotes } from '@/features/notes';
import { AddStrategyLogModal } from './AddStrategyLogModal';
import { cn } from '@/lib/utils';
import type { NoteType } from '@/types/funnelhub';

interface StrategyLogCardProps {
  projectId: string | null;
  projectName: string | null;
  orgId: string | undefined;
}

const TYPE_TINT: Record<NoteType, string> = {
  Note: 'bg-muted/40 text-foreground/80',
  Plan: 'bg-primary/10 text-primary',
  Idea: 'bg-amber-500/10 text-amber-400',
  Hypothesis: 'bg-cyan-500/10 text-cyan-300',
  Result: 'bg-emerald-500/10 text-emerald-300',
  Backlog: 'bg-violet-500/10 text-violet-300',
};

export function StrategyLogCard({ projectId, projectName, orgId }: StrategyLogCardProps) {
  const { notes, addNote } = useNotes(projectId, orgId);
  const [modalOpen, setModalOpen] = useState(false);

  const recent = [...notes]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 3);

  const handleAdd = (entry: { type: NoteType; title: string; body: string }) => {
    addNote.mutate(
      { type: entry.type, title: entry.title, body: entry.body, links: [] },
      { onSuccess: () => setModalOpen(false) },
    );
  };

  return (
    <section className="glass relative overflow-hidden rounded-3xl border border-gold/20 p-5 sm:p-7 shadow-[0_0_28px_-8px_hsl(var(--gold)/0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/80">
            Strategy Log
          </p>
          <h2 className="mt-1 text-xl font-serif tracking-tight">
            {projectName ? `What's the play for ${projectName}?` : 'Strategy Log'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Capture hypotheses, results, and the next move.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!projectId}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold transition-all',
            'hover:bg-gold/20 hover:shadow-[0_0_16px_hsl(var(--gold)/0.25)] active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          aria-label="Add strategy log entry"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {recent.length === 0 ? (
          <button
            onClick={() => setModalOpen(true)}
            disabled={!projectId}
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/40 px-4 py-8 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.03] disabled:opacity-50"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No entries yet. Log your first move.
            </p>
          </button>
        ) : (
          recent.map((n) => {
            const type = (n.type || 'Note') as NoteType;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-2xl border border-border/20 bg-muted/10 px-4 py-3"
              >
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                    TYPE_TINT[type] || TYPE_TINT.Note,
                  )}
                >
                  {type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {n.title || '(untitled)'}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {notes.length > 3 && (
        <div className="mt-3 text-right">
          <span className="inline-flex items-center gap-1 text-xs text-primary/70">
            +{notes.length - 3} more entries
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      )}

      <AddStrategyLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAdd}
        projectName={projectName}
        submitting={addNote.isPending}
      />
    </section>
  );
}
