import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, ShieldAlert, X } from 'lucide-react';
import { reportContent } from '@/hooks/useModeration';

interface ReportDialogProps {
  reporterId: string;
  memberId: string;
  memberName: string;
  postId?: string;
  onClose: () => void;
  onBlock?: () => void;
}

const REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'Inappropriate content',
  'Impersonation',
  'Self-harm or crisis',
  'Other',
];

export default function ReportDialog({ reporterId, memberId, memberName, postId, onClose, onBlock }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    const success = await reportContent(reporterId, memberId, selectedReason, postId, details || undefined);
    setSubmitting(false);
    if (success) setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 mb-4 w-full max-w-md rounded-2xl border border-border/40 bg-card shadow-lg sm:mb-0 p-5"
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <ShieldAlert className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-display text-lg font-bold text-foreground">Report Submitted</h3>
            <p className="text-sm text-muted-foreground">Thanks for helping keep Compani safe. We'll review this.</p>
            {onBlock && (
              <button
                onClick={() => { onBlock(); onClose(); }}
                className="mt-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Also block {memberName}
              </button>
            )}
            <button onClick={onClose} className="block mx-auto text-sm text-primary font-medium hover:underline mt-2">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              <h3 className="font-display text-lg font-bold text-foreground">Report {memberName}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {postId ? "What's wrong with this post?" : 'Why are you reporting this person?'}
            </p>

            <div className="space-y-2">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedReason === reason
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selectedReason && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Any additional details? (optional)"
                  rows={2}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </motion.div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedReason || submitting}
              className="w-full rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
