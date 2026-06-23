/**
 * ArchitectKeyIcon — A microscopic golden key/compass mark
 * displayed next to Origin Partner status for Genesis Architects.
 * An "if you know, you know" distinguishing mark.
 */
import { motion } from 'framer-motion';

interface ArchitectKeyIconProps {
  size?: number;
}

export default function ArchitectKeyIcon({ size = 12 }: ArchitectKeyIconProps) {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      stroke="hsl(var(--primary) / 0.6)"
      className="shrink-0"
      style={{
        filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.25))',
      }}
    >
      {/* Compass rose / key hybrid */}
      <circle cx="12" cy="9" r="4" strokeWidth={1.2} />
      <line x1="12" y1="13" x2="12" y2="22" strokeWidth={1.2} />
      <line x1="12" y1="18" x2="15" y2="16" strokeWidth={1.2} />
      <line x1="12" y1="20" x2="14.5" y2="18.5" strokeWidth={1.2} />
      {/* North diamond on compass */}
      <path d="M12 5 L12.8 7 L12 6.2 L11.2 7 Z" fill="hsl(var(--primary) / 0.5)" stroke="none" />
    </motion.svg>
  );
}
