import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('pwa-banner-dismissed') === 'true'
  );

  if (!canInstall || !isMobile || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) handleDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-3 right-3 z-50 rounded-2xl border border-primary/20 bg-card p-4 shadow-lg"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Install Compani</p>
            <p className="text-xs text-muted-foreground">Add to your home screen for the best experience</p>
          </div>
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            Install
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
