import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const EMOJI_OPTIONS = ['🌿', '🔥', '📚', '🎵', '💪', '🧘', '🎮', '🍳', '✈️', '🐾', '🎨', '🌊', '💡', '🤝', '🌙'];

interface CreateCircleProps {
  onSubmit: (name: string, emoji: string, description: string) => Promise<any>;
  canCreate: boolean;
  maxReached: boolean;
}

export default function CreateCircle({ onSubmit, canCreate, maxReached }: CreateCircleProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🌿');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), emoji, description.trim());
      setName('');
      setEmoji('🌿');
      setDescription('');
      setOpen(false);
      toast.success(`${emoji} ${name.trim()} circle created!`);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) return null;

  return (
    <>
      <button
        onClick={() => {
          if (maxReached) {
            toast('You can create up to 3 Circles', { duration: 2500 });
            return;
          }
          setOpen(true);
        }}
        className={`shrink-0 flex items-center justify-center rounded-full h-7 w-7 text-xs transition-all ${
          maxReached
            ? 'bg-secondary/50 text-muted-foreground/40'
            : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
        }`}
        aria-label="Create a Circle"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Create a Circle</h3>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                A space for conversations that matter to you. Others can post here too.
              </p>

              {/* Emoji selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Choose an emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                        emoji === e
                          ? 'bg-primary/15 ring-2 ring-primary/40 scale-110'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Circle name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Book Club"
                  maxLength={24}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What's it for?</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One sentence about this space"
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!name.trim() || !description.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  `Create ${emoji} ${name.trim() || 'Circle'}`
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
