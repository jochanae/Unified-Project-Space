import { motion, AnimatePresence } from 'framer-motion';

interface SwitchCompanionDialogProps {
  open: boolean;
  companionName: string;
  companionAvatarUrl?: string;
  companionRole?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SwitchCompanionDialog({
  open,
  companionName,
  companionAvatarUrl,
  companionRole,
  onConfirm,
  onCancel,
}: SwitchCompanionDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-5 shadow-xl text-center"
          >
            {companionAvatarUrl && (
              <img
                src={companionAvatarUrl}
                alt={companionName}
                className="mx-auto mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            )}
            <h3 className="font-display text-base font-bold text-foreground mb-1">
              Switch to {companionName}?
            </h3>
            {companionRole && (
              <p className="text-xs text-muted-foreground mb-4">{companionRole}</p>
            )}
            {!companionRole && <div className="mb-4" />}
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
              >
                Stay
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-primary/20 border border-primary/30 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/30 transition-all"
              >
                Switch
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
