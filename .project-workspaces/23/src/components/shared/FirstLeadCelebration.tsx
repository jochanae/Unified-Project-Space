import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Volume2, VolumeX, X, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useFirstLeadCelebration } from '@/hooks/use-first-lead-celebration';
import { cn } from '@/lib/utils';

/**
 * FirstLeadCelebration
 * --------------------
 * Cinematic moment when the org captures its very first lead.
 *  - Confetti via CSS-only particles (no extra deps)
 *  - Voice line MUTED by default (jarring otherwise) — explicit unmute button
 *  - Single CTA: open the Lead Hub
 *  - Fires exactly once per org (handled in the hook)
 */
export function FirstLeadCelebration() {
  const { showCelebration, leadEmail, dismiss } = useFirstLeadCelebration();
  const navigate = useNavigate();
  const [voicePlayed, setVoicePlayed] = useState(false);

  // Reset voice gate each time it opens
  useEffect(() => {
    if (showCelebration) setVoicePlayed(false);
  }, [showCelebration]);

  const handleUnmute = () => {
    if (voicePlayed) return;
    setVoicePlayed(true);
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(
        leadEmail
          ? `First lead captured. ${leadEmail.split('@')[0]} is in your funnel.`
          : 'First lead captured. Your funnel is alive.'
      );
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 0.85;
      window.speechSynthesis.speak(utter);
    } catch {
      /* noop */
    }
  };

  const handleOpenLeads = () => {
    dismiss();
    navigate('/projects');
  };

  if (!showCelebration) return null;

  return (
    <Dialog open={showCelebration} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent
        className={cn(
          'glass border-primary/30 max-w-md p-0 overflow-hidden',
          'shadow-[0_0_40px_hsl(var(--primary)/0.25)]'
        )}
      >
        {/* Confetti layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-0 block w-1.5 h-3 rounded-sm opacity-0"
              style={{
                left: `${(i * 4.2) % 100}%`,
                background:
                  i % 3 === 0
                    ? 'hsl(var(--primary))'
                    : i % 3 === 1
                      ? 'hsl(var(--gold))'
                      : 'hsl(var(--foreground))',
                animation: `confettiFall 2.4s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms forwards`,
                transform: `rotate(${(i * 17) % 360}deg)`,
              }}
            />
          ))}
        </div>

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-gold/20 border border-primary/30 shadow-[0_0_28px_hsl(var(--primary)/0.35)]">
            <Trophy className="h-7 w-7 text-gold drop-shadow-[0_0_8px_hsl(var(--gold)/0.6)]" />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80 mb-1.5">
            Milestone unlocked
          </p>
          <h2 className="text-[22px] font-semibold text-foreground leading-tight mb-2">
            Your first lead just landed.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {leadEmail ? (
              <>
                <span className="text-foreground/90 font-medium">{leadEmail}</span> is now in your
                funnel. MarQ is preparing a contextual follow-up script.
              </>
            ) : (
              'Your funnel is alive. MarQ is preparing a contextual follow-up script.'
            )}
          </p>

          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              type="button"
              onClick={handleOpenLeads}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Open Lead Hub
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleUnmute}
              disabled={voicePlayed}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95',
                voicePlayed
                  ? 'border-border/30 text-muted-foreground/50 cursor-default'
                  : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
              aria-label={voicePlayed ? 'Voice played' : 'Play voice line'}
              title={voicePlayed ? 'Voice line played' : 'Hear MarQ say it'}
            >
              {voicePlayed ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {voicePlayed ? 'Played' : 'Hear it'}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            Voice off by default · tap to play
          </p>
        </div>

        <style>{`
          @keyframes confettiFall {
            0% { opacity: 0; transform: translateY(-20px) rotate(0deg); }
            10% { opacity: 1; }
            100% { opacity: 0; transform: translateY(420px) rotate(720deg); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
