import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ShieldOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function MentalShredder() {
  const [shredding, setShredding] = useState(false);

  const handleShred = async () => {
    setShredding(true);

    try {
      // 1. Clear all localStorage
      localStorage.clear();

      // 2. Clear all sessionStorage
      sessionStorage.clear();

      // 3. Clear IndexedDB databases
      if (window.indexedDB?.databases) {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        }
      }

      // 4. Clear all caches (Cache API)
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 5. Unregister any service workers
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // 6. Sign out from Supabase (clears auth session + tokens)
      await supabase.auth.signOut();

      toast.success('Zero-Trace activated. All local data destroyed.', {
        description: 'Your workspace has been wiped clean.',
        duration: 3000,
      });

      // 7. Hard reload to clean slate
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (e) {
      console.error('Shredder error:', e);
      // Even on error, force sign out and redirect
      await supabase.auth.signOut().catch(() => {});
      window.location.href = '/';
    } finally {
      setShredding(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          <span>Zero-Trace</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass border-destructive/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Mental Shredder
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            This will <strong>permanently destroy</strong> all local data on this device — cached content, session tokens, stored preferences, and browser storage. You will be signed out immediately.
            <br /><br />
            <span className="text-muted-foreground/60">Your cloud data (projects, funnels, pages) remains safe in your account. This only wipes the local footprint.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleShred}
            disabled={shredding}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {shredding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Shredding…</>
            ) : (
              <><ShieldOff className="h-4 w-4" /> Activate Zero-Trace</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
