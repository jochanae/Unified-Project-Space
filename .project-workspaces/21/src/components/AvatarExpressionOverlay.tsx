import { motion, AnimatePresence } from 'framer-motion';
import type { ExpressionType } from '@/stores/useCompanionExpressionStore';

interface Props {
  expression: ExpressionType;
}

/**
 * Renders a micro-expression overlay on the companion avatar bubble.
 * Mounts inside the avatar button, positioned absolutely over the image.
 */
export default function AvatarExpressionOverlay({ expression }: Props) {
  return (
    <AnimatePresence mode="wait">
      {expression === 'glow' && (
        <motion.div
          key="glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 18px 6px hsl(var(--primary) / 0.5)' }}
        />
      )}

      {expression === 'sparkle' && (
        <motion.div
          key="sparkle"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          className="absolute -top-1 -right-1 pointer-events-none text-xs"
        >
          ✨
        </motion.div>
      )}

      {expression === 'wave' && (
        <motion.div
          key="wave"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.06, 1, 1.04, 1] }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 12px 3px hsl(var(--primary) / 0.3)' }}
        />
      )}

      {expression === 'thinking' && (
        <motion.div
          key="thinking"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 10px 3px hsl(var(--accent) / 0.4)' }}
        />
      )}

      {expression === 'sleepy' && (
        <motion.div
          key="sleepy"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -top-1.5 -right-1.5 pointer-events-none text-[10px] leading-none"
        >
          🌙
        </motion.div>
      )}

      {expression === 'glint' && (
        <motion.div
          key="glint"
          initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
          animate={{ opacity: [0, 1, 0.8, 0], scale: [0.6, 1.3, 1, 0.8], rotate: [-30, 0, 15, 30] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 30%, hsl(var(--primary) / 0.4) 50%, transparent 70%)',
            boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.3)',
          }}
        />
      )}

      {/* Combo pattern: pulse — concentric rings radiating outward */}
      {expression === 'pulse' && (
        <>
          <motion.div
            key="pulse-ring-1"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: [0.6, 0.3, 0], scale: [1, 1.6, 2] }}
            transition={{ duration: 2, ease: 'easeOut', repeat: 1, repeatDelay: 0.5 }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: '2px solid hsl(var(--primary) / 0.5)' }}
          />
          <motion.div
            key="pulse-ring-2"
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: [0.4, 0.2, 0], scale: [1, 1.4, 1.8] }}
            transition={{ duration: 2, ease: 'easeOut', delay: 0.3, repeat: 1, repeatDelay: 0.5 }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: '1px solid hsl(var(--accent) / 0.4)' }}
          />
          <motion.div
            key="pulse-core"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: '0 0 14px 4px hsl(var(--primary) / 0.35)' }}
          />
        </>
      )}

      {/* Combo pattern: ripple — dual-tone shimmer for cross-reference insight */}
      {expression === 'ripple' && (
        <motion.div
          key="ripple"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.3, 0.6, 0] }}
          transition={{ duration: 3, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.3))',
            boxShadow: '0 0 16px 5px hsl(var(--accent) / 0.25)',
          }}
        />
      )}
    </AnimatePresence>
  );
}
