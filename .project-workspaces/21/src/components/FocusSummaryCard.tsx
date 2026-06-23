/**
 * FocusSummaryCard — "Inscribed" summary card for Focus/Brainstorm sessions.
 * Rendered as a special message type with double-gold border and luxury glass aesthetic.
 */
import { motion } from 'framer-motion';
import { Lightbulb, Download, Shield } from 'lucide-react';
import { softConfirmHaptic } from '@/lib/sanctuaryHaptics';
import { toast } from 'sonner';

interface FocusSummaryCardProps {
  title: string;
  points: string[];
  companionName?: string;
  onExport?: () => void;
  onKeep?: () => void;
}

export default function FocusSummaryCard({
  title,
  points,
  companionName,
  onExport,
  onKeep,
}: FocusSummaryCardProps) {
  // Haptic sequence: 3×20ms ticks then a soft settle
  const triggerInscribeHaptic = () => {
    try {
      navigator.vibrate?.([20, 40, 20, 40, 20, 80, 40]);
    } catch { /* */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={triggerInscribeHaptic}
      className="my-6 mx-auto max-w-[90%] rounded-3xl p-6 border-2 border-primary/30 bg-[hsl(230_40%_10%/0.8)] backdrop-blur-2xl shadow-[0_0_30px_hsl(var(--primary)/0.1)]"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Glowing brainstorm icon */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
          <Lightbulb className="h-5 w-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
        </div>

        <div className="space-y-1">
          <h4 className="text-[9px] uppercase tracking-[0.4em] text-primary/60 font-medium">
            Brainstorm Inscribed
          </h4>
          <h3 className="text-lg font-extralight text-foreground italic">
            "{title}"
          </h3>
          {companionName && (
            <p className="text-[10px] text-muted-foreground/50 tracking-wide">
              Distilled by {companionName}
            </p>
          )}
        </div>

        {/* Numbered points */}
        <ul className="w-full space-y-3 pt-4 text-left">
          {points.map((point, index) => (
            <li key={index} className="flex gap-3 items-start group">
              <span className="text-primary/70 text-[10px] mt-1 font-mono tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="text-[13px] text-foreground/70 font-light leading-relaxed group-hover:text-foreground transition-colors">
                {point}
              </p>
            </li>
          ))}
        </ul>

        {/* Action footer */}
        <div className="pt-6 w-full flex justify-between items-center border-t border-border/10 mt-4">
          <button
            onClick={() => {
              softConfirmHaptic();
              onExport?.();
              toast.success('Summary copied to clipboard');
            }}
            className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
          <button
            onClick={() => {
              softConfirmHaptic();
              onKeep?.();
              toast.success('Saved to your space');
            }}
            className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <Shield className="h-3 w-3" />
            Keep in Your Space
          </button>
        </div>
      </div>
    </motion.div>
  );
}
