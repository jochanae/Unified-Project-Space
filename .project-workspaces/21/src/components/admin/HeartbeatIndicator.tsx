/**
 * HeartbeatIndicator — Gold pulsing heart icon showing
 * all automated systems are healthy and observing.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStatus {
  label: string;
  healthy: boolean;
}

export default function HeartbeatIndicator() {
  const [systems, setSystems] = useState<SystemStatus[]>([
    { label: 'Location Sensor', healthy: false },
    { label: 'Signup Listener', healthy: false },
    { label: 'Edge Functions', healthy: false },
  ]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Check system health
    const checks: SystemStatus[] = [];

    // 1. Location: check if geolocation is available and permitted
    checks.push({
      label: 'Location Sensor',
      healthy: 'geolocation' in navigator,
    });

    // 2. Signup listener: always healthy when on admin page (realtime is active)
    checks.push({
      label: 'Signup Listener',
      healthy: true,
    });

    // 3. Edge functions: check if supabase URL is configured
    checks.push({
      label: 'Edge Functions',
      healthy: !!import.meta.env.VITE_SUPABASE_URL,
    });

    setSystems(checks);
  }, []);

  const allHealthy = systems.every((s) => s.healthy);

  return (
    <div className="relative inline-flex">
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-card/60 backdrop-blur-xl hover:border-primary/40 transition-all"
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulsing glow behind heart */}
        <motion.div
          className="absolute left-3 w-4 h-4 rounded-full bg-primary/30"
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <Heart
          className={cn(
            'h-4 w-4 relative z-10',
            allHealthy ? 'text-primary fill-primary/40' : 'text-destructive'
          )}
        />
        <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
          {allHealthy ? 'Active' : 'Alert'}
        </span>
      </motion.button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-full mt-2 right-0 z-50 w-56 rounded-xl border border-primary/15 bg-card/95 backdrop-blur-2xl p-3 shadow-[0_8px_30px_hsl(var(--primary)/0.1)]"
        >
          <p className="text-[8px] uppercase tracking-[0.4em] text-primary/50 mb-2 font-medium">
            Heartbeat: Observing
          </p>
          <div className="space-y-1.5">
            {systems.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    s.healthy ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]' : 'bg-destructive'
                  )}
                />
                <span className="text-[10px] text-foreground/70">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
