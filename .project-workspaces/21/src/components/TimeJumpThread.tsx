/**
 * TimeJumpThread — A vertical "Golden Thread" navigator that appears on the
 * right edge of the chat when a date badge is tapped.  Each node represents a
 * unique date section in the conversation.  Tapping a node smooth-scrolls the
 * chat to that date group.
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimeJumpNode {
  label: string;
  elementId: string;
}

interface TimeJumpThreadProps {
  nodes: TimeJumpNode[];
  visible: boolean;
  onClose: () => void;
  scrollContainer: HTMLDivElement | null;
}

export default function TimeJumpThread({ nodes, visible, onClose, scrollContainer }: TimeJumpThreadProps) {
  const jumpTo = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el || !scrollContainer) return;

    // Brief "blur wash" on the scroll container
    scrollContainer.style.transition = 'filter 0.35s ease';
    scrollContainer.style.filter = 'blur(6px) brightness(0.7)';
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        scrollContainer.style.filter = '';
        try { navigator.vibrate?.(12); } catch {}
      }, 400);
    }, 200);

    onClose();
  }, [scrollContainer, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — tap to dismiss */}
          <motion.div
            key="tj-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70]"
            onClick={onClose}
          />

          {/* The Thread */}
          <motion.div
            key="tj-thread"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed right-3 top-1/4 bottom-1/4 w-14 flex flex-col items-center z-[71]"
          >
            {/* Vertical gold line */}
            <div
              className="absolute inset-y-0 w-px"
              style={{
                background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.35), transparent)',
              }}
            />

            {/* Nodes */}
            <div className="relative flex flex-col justify-between h-full py-6">
              {nodes.map((node, i) => (
                <motion.button
                  key={node.elementId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.06 * i, type: 'spring', damping: 18, stiffness: 300 }}
                  whileHover={{ scale: 1.6, x: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => jumpTo(node.elementId)}
                  className="relative group flex items-center justify-center"
                >
                  {/* Dot */}
                  <span
                    className="block w-2 h-2 rounded-full"
                    style={{
                      background: 'hsl(var(--primary) / 0.25)',
                      border: '1px solid hsl(var(--primary) / 0.45)',
                      boxShadow: '0 0 6px hsl(var(--primary) / 0.15)',
                    }}
                  />

                  {/* Hover label */}
                  <span
                    className="absolute right-7 top-1/2 -translate-y-1/2 opacity-60 transition-opacity duration-200 whitespace-nowrap pointer-events-none rounded px-2 py-0.5"
                    style={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      fontWeight: 300,
                      color: 'hsl(var(--primary) / 0.7)',
                      background: 'rgba(10, 11, 30, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {node.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
