import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import CompaniLogo from './CompaniLogo';
import { cn } from '@/lib/utils';
import type { FoundingTier } from '@/hooks/useFoundingMemberStatus';

interface Props {
  serialNumber: number;
  tier: FoundingTier;
  claimDate: string;
  userName: string;
  onDismiss: () => void;
  onSaved: () => void;
}

interface SnapshotCardBodyProps {
  serialNumber: number;
  tier: FoundingTier;
  claimDate: string;
  userName: string;
}

function SnapshotCardBody({ serialNumber, tier, claimDate, userName }: SnapshotCardBodyProps) {
  const formatted = `#${String(serialNumber).padStart(3, '0')}`;
  const isGenesis = tier === 'genesis';
  const dateStr = new Date(claimDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border backdrop-blur-xl',
        isGenesis ? 'border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_24px_60px_hsl(var(--background)/0.55)]' : 'border-border/80 shadow-[0_0_0_1px_hsl(var(--border)/0.25),0_24px_60px_hsl(var(--background)/0.55)]'
      )}
      style={{
        background: 'linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--card)) 45%, hsl(var(--background)) 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: isGenesis
            ? 'radial-gradient(circle at 50% 18%, hsl(var(--primary) / 0.16), transparent 34%), radial-gradient(circle at 50% 100%, hsl(var(--primary) / 0.06), transparent 40%)'
            : 'radial-gradient(circle at 50% 18%, hsl(var(--foreground) / 0.08), transparent 34%), radial-gradient(circle at 50% 100%, hsl(var(--foreground) / 0.04), transparent 40%)',
        }}
      />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-8 pb-10 pt-8 text-center">
        <Crown className={cn('mb-8 h-8 w-8', isGenesis ? 'text-primary' : 'text-foreground/75')} />

        <p className={cn('text-[3rem] font-semibold tracking-[0.08em] leading-none', isGenesis ? 'text-primary' : 'text-foreground/85')}>
          {formatted}
        </p>

        <p className={cn('mt-6 text-[0.95rem] font-medium uppercase tracking-[0.28em]', isGenesis ? 'text-primary/90' : 'text-foreground/70')}>
          {isGenesis ? 'Genesis Architect' : 'Foundation Member'}
        </p>

        <div className={cn('my-8 h-px w-14', isGenesis ? 'bg-primary/30' : 'bg-border')} />

        <p className="text-[1.1rem] text-foreground/92">{userName}</p>
        <p className="mt-4 text-sm text-foreground/45">Claimed {dateStr}</p>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <CompaniLogo size="sm" animate={false} />
        </div>
      </div>
    </div>
  );
}

export default function FoundingSnapshot({ serialNumber, tier, claimDate, userName, onDismiss, onSaved }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewHeight = 480 * previewScale;
  const isGenesis = tier === 'genesis';

  useEffect(() => {
    const updatePreviewScale = () => {
      const widthScale = Math.min(1, (window.innerWidth - 32) / 320);
      const heightScale = Math.min(1, (window.innerHeight - 220) / 480);
      setPreviewScale(Math.max(0.68, Math.min(widthScale, heightScale, 1)));
    };

    updatePreviewScale();
    window.addEventListener('resize', updatePreviewScale);
    return () => window.removeEventListener('resize', updatePreviewScale);
  }, []);

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        width: 320,
        height: 480,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `compani-founding-${serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed inset-0 z-[85] overflow-y-auto bg-background/70 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md"
      >
        <div className="pointer-events-none fixed -left-[9999px] top-0">
          <div ref={cardRef} style={{ width: 320, height: 480 }}>
            <SnapshotCardBody
              serialNumber={serialNumber}
              tier={tier}
              claimDate={claimDate}
              userName={userName}
            />
          </div>
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-end gap-4">
          <div className="flex w-full justify-center" style={{ height: `${previewHeight}px` }}>
            <div
              className="shrink-0"
              style={{
                width: 320,
                height: 480,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
              }}
            >
              <SnapshotCardBody
                serialNumber={serialNumber}
                tier={tier}
                claimDate={claimDate}
                userName={userName}
              />
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98]',
                isGenesis ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15' : 'border-border bg-card/70 text-foreground/85 hover:bg-card'
              )}
            >
              <Download className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save your founding moment'}
            </button>

            <button
              onClick={onDismiss}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-border bg-card/70 px-4 text-foreground/55 transition-colors hover:text-foreground"
              aria-label="Dismiss founding snapshot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
