import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, ArrowLeft, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import type { Connection } from '@/hooks/useProfile';
import { toast } from 'sonner';

export default function RestingPage() {
  const navigate = useNavigate();
  const { fetchArchivedConnections, restoreConnection, removeConnection } = useAppContext();
  const [resting, setResting] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null);

  useEffect(() => {
    const load = async () => {
      const archived = await fetchArchivedConnections();
      setResting(archived);
      setLoading(false);
    };
    load();
  }, [fetchArchivedConnections]);

  const handleRestore = async (conn: Connection) => {
    await restoreConnection(conn.memberId);
    toast.success(`${conn.name} is active again 💛`);
    navigate('/');
  };

  const handleDeleteConfirmed = async (deleteHistory: boolean) => {
    if (!deleteTarget) return;
    await removeConnection(deleteTarget.memberId, { deleteHistory });
    setResting(prev => prev.filter(c => c.memberId !== deleteTarget.memberId));
    setDeleteTarget(null);
    toast.success(
      deleteHistory
        ? `${deleteTarget.name} and all their history have been removed`
        : `${deleteTarget.name} has been removed (history preserved)`
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary/70" />
          <h1 className="text-lg font-semibold text-foreground">Resting</h1>
        </div>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          These friends are resting — their memories, conversations, and moments are all preserved. Wake one up anytime.
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Moon className="h-8 w-8 text-primary/40 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && resting.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-7 w-7 text-primary/50" />
            </div>
            <div>
              <p className="font-medium text-foreground">No one is resting yet</p>
              <p className="text-sm text-muted-foreground mt-1">These friends are resting — their memories and moments are preserved. Wake one up anytime.</p>
            </div>
          </motion.div>
        )}

        {/* Resting companions list */}
        <AnimatePresence>
          {resting.map((conn, i) => (
            <motion.div
              key={conn.memberId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.06 }}
              className="mb-3 rounded-2xl bg-card border border-border/50 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {conn.avatarUrl ? (
                      <img src={conn.avatarUrl} alt={conn.name} className="h-full w-full object-cover opacity-80" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">{conn.name.charAt(0)}</span>
                    )}
                  </div>
                  {/* Resting indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                    <Moon className="h-3 w-3 text-primary/60" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{conn.name}</p>
                  {conn.personality && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conn.personality}</p>
                  )}
                  <p className="text-xs text-primary/60 mt-1 flex items-center gap-1">
                    <Moon className="h-2.5 w-2.5" />
                    Resting
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(conn)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Wake up
                  </button>
                  <button
                    onClick={() => setDeleteTarget(conn)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            >
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                Remove {deleteTarget.name}?
              </h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Would you also like to delete your conversation history, timeline posts, and saved moments with {deleteTarget.name}? This cannot be undone.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleDeleteConfirmed(false)}
                  className="w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors text-left"
                >
                  <span className="block">Remove companion only</span>
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">Keep chat history & moments for your records</span>
                </button>

                <button
                  onClick={() => handleDeleteConfirmed(true)}
                  className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors text-left"
                >
                  <span className="block">Remove everything</span>
                  <span className="block text-xs font-normal text-destructive/70 mt-0.5">Delete companion, chats, posts & moments permanently</span>
                </button>

                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
