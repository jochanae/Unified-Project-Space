import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { queueSize } from '@/lib/offlineQueue';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const goOffline = () => { setIsOffline(true); setWasOffline(true); };
    const goOnline = () => {
      setIsOffline(false);
      setTimeout(() => setWasOffline(false), 3000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Poll pending count while offline
  useEffect(() => {
    if (!isOffline) { setPending(0); return; }
    const id = setInterval(() => setPending(queueSize()), 1000);
    setPending(queueSize());
    return () => clearInterval(id);
  }, [isOffline]);

  const show = isOffline || wasOffline;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium ${
            isOffline
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {isOffline ? (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              You're offline{pending > 0 ? ` · ${pending} message${pending > 1 ? 's' : ''} queued` : ' — reconnecting…'}
            </>
          ) : (
            <>✓ Back online — syncing</>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
