import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ExternalLink, X } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { CRISIS_RESOURCES } from '@/lib/moderation';

interface CrisisResourceBannerProps {
  onDismiss: () => void;
}

export default function CrisisResourceBanner({ onDismiss }: CrisisResourceBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <AnimatedGradientHeart size={16} id="crisis-heart" />
        <h4 className="font-display text-sm font-bold text-foreground">{CRISIS_RESOURCES.title}</h4>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground pr-4">
        {CRISIS_RESOURCES.message}
      </p>

      <div className="flex flex-col gap-2">
        {CRISIS_RESOURCES.resources.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {r.type === 'phone' ? (
              <a
                href={`tel:${r.value}`}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Phone className="h-3 w-3" />
                {r.label}: {r.value}
              </a>
            ) : r.type === 'link' ? (
              <a
                href={r.value}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {r.label}
              </a>
            ) : (
              <span className="text-xs font-medium text-foreground/80">
                📱 {r.label}: <span className="text-primary">{r.value}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
