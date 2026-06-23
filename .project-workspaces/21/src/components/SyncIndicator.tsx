import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertTriangle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface KnowledgeDoc {
  id: string;
  title: string;
  content_text: string;
  source_type: string;
  category: string;
  created_at: string;
  effective_date?: string | null;
  version_label?: string | null;
  is_active?: boolean;
}

type SyncState = 'idle' | 'syncing' | 'outdated';

function HelixSVG({ state }: { state: SyncState }) {
  const color = state === 'outdated' ? 'hsl(var(--warning, 45 93% 47%))' : 'hsl(45, 80%, 56%)';

  if (state === 'syncing') {
    return (
      <motion.svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
        <line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth="1" opacity="0.4" />
      </motion.svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
      {state === 'idle' ? (
        <path d="M8 12.5L10.5 15L16 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 8V13M12 16V16.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function SyncIndicator({ docs, uploading }: { docs: KnowledgeDoc[]; uploading: boolean }) {
  const [open, setOpen] = useState(false);

  const { state, activeManual, lastCalibration, effectiveDate, activeVersion, pendingDocs } = useMemo(() => {
    if (uploading || docs.some(d => d.content_text === '⏳ Extracting content...')) {
      return { state: 'syncing' as SyncState, activeManual: null, lastCalibration: null, effectiveDate: null, activeVersion: null, pendingDocs: 0 };
    }

    if (docs.length === 0) {
      return { state: 'idle' as SyncState, activeManual: null, lastCalibration: null, effectiveDate: null, activeVersion: null, pendingDocs: 0 };
    }

    const activeDocs = docs.filter(d => d.is_active !== false);
    const sorted = [...activeDocs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latest = sorted[0] || docs[0];
    const latestDate = new Date(latest.created_at);
    const daysSince = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);

    // Count docs with future effective dates
    const now = new Date();
    const pending = docs.filter(d => d.effective_date && new Date(d.effective_date) > now).length;

    const diff = now.getTime() - latestDate.getTime();
    let calibrationText: string;
    if (diff < 60000) calibrationText = 'Just now';
    else if (diff < 3600000) calibrationText = `${Math.floor(diff / 60000)} mins ago`;
    else if (diff < 86400000) calibrationText = `${Math.floor(diff / 3600000)} hours ago`;
    else calibrationText = `${Math.floor(diff / 86400000)} days ago`;

    return {
      state: (daysSince > 90 ? 'outdated' : 'idle') as SyncState,
      activeManual: latest,
      lastCalibration: calibrationText,
      effectiveDate: latestDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
      activeVersion: latest.version_label || null,
      pendingDocs: pending,
    };
  }, [docs, uploading]);

  const stateLabel = state === 'syncing' ? 'Calibrating...' : state === 'outdated' ? 'Review Needed' : 'Current';
  const stateColor = state === 'outdated' ? 'text-amber-400' : state === 'syncing' ? 'text-amber-300' : 'text-emerald-400';

  const activeDocs = docs.filter(d => d.is_active !== false);
  const supersededDocs = docs.filter(d => d.is_active === false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium transition-all hover:bg-primary/10 ${stateColor}`}
          aria-label="Knowledge sync status"
        >
          <motion.div
            animate={state === 'outdated' ? { scale: [1, 1.15, 1] } : {}}
            transition={state === 'outdated' ? { duration: 2, repeat: Infinity } : {}}
          >
            <HelixSVG state={state} />
          </motion.div>
          <span className="hidden sm:inline">{stateLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 rounded-xl border border-white/10 p-0 shadow-2xl"
        style={{ background: 'rgba(19, 20, 36, 0.95)', backdropFilter: 'blur(24px)' }}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HelixSVG state={state} />
            <h4 className="text-xs font-semibold text-foreground tracking-wide">Knowledge Calibration</h4>
          </div>

          {docs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60">No documents loaded yet. Add manuals or guides to calibrate your companion.</p>
          ) : (
            <div className="space-y-2.5">
              <StatusRow
                label="Active Manual"
                value={activeManual?.title || '—'}
                sub={`Uploaded ${effectiveDate}${activeVersion ? ` • ${activeVersion}` : ''}`}
              />
              <StatusRow
                label="Status"
                value={stateLabel}
                valueClass={stateColor}
                icon={state === 'outdated' ? <AlertTriangle className="h-3 w-3 text-amber-400" /> : state === 'idle' ? <Check className="h-3 w-3 text-emerald-400" /> : undefined}
              />
              <StatusRow
                label="Active Docs"
                value={`${activeDocs.length}`}
                sub={supersededDocs.length > 0 ? `${supersededDocs.length} superseded` : `${docs.reduce((s, d) => s + d.content_text.length, 0).toLocaleString()} chars indexed`}
              />
              {pendingDocs > 0 && (
                <StatusRow
                  label="Pending"
                  value={`${pendingDocs} scheduled`}
                  valueClass="text-amber-300"
                  sub="Waiting for effective date"
                />
              )}
              <StatusRow label="Last Calibration" value={lastCalibration || '—'} sub="AI Knowledge Sync" />
            </div>
          )}

          {state === 'outdated' && (
            <p className="text-[10px] text-amber-400/80 leading-relaxed border-t border-white/5 pt-2">
              Your most recent document is over 90 days old. Consider uploading the latest revision.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusRow({ label, value, sub, valueClass, icon }: {
  label: string; value: string; sub?: string; valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest shrink-0">{label}</span>
      <div className="text-right">
        <span className={`text-[11px] font-medium flex items-center gap-1 justify-end ${valueClass || 'text-foreground'}`}>
          {icon}{value}
        </span>
        {sub && <span className="text-[9px] text-muted-foreground/40 block">{sub}</span>}
      </div>
    </div>
  );
}
