import { motion } from 'framer-motion';
import { getAbstractAvatar } from '@/lib/abstractAvatars';
import AnimatedGradientHeart from './AnimatedGradientHeart';

interface AbstractAvatarProps {
  memberId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** If true, forces the heart logo regardless of persona */
  forceHeart?: boolean;
}

const sizes = {
  sm:  { container: 'h-8 w-8',   text: 'text-sm',  heart: 18 },
  md:  { container: 'h-10 w-10', text: 'text-lg',  heart: 22 },
  lg:  { container: 'h-14 w-14', text: 'text-2xl', heart: 32 },
  xl:  { container: 'h-28 w-28', text: 'text-5xl', heart: 64 },
};

// Known browse personas — these keep their colour/symbol identity
const KNOWN_PERSONAS = new Set([
  'marcus','diane','reese','carmen','david','jordan','evelyn','ray','soleil','benny',
]);

function isKnownPersona(memberId: string): boolean {
  // Browse personas use their plain name as ID
  // Created companions use IDs like "created-otto-1234567890"
  const base = memberId.replace(/^created-/, '').replace(/-\d+$/, '').toLowerCase();
  return KNOWN_PERSONAS.has(base);
}

export default function AbstractAvatar({ memberId, size = 'md', className = '', forceHeart = false }: AbstractAvatarProps) {
  const s = sizes[size] || sizes.md;
  const known = isKnownPersona(memberId) && !forceHeart;

  if (known) {
    // Known browse persona — keep their colour/symbol identity
    const config = getAbstractAvatar(memberId);
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center justify-center rounded-full ring-2 ring-white/20 shadow-md ${s.container} ${className}`}
        style={{ background: config.gradient }}
        title={config.label}
        aria-label={config.label}
      >
        <span className="drop-shadow-sm">{config.symbol}</span>
      </motion.div>
    );
  }

  // Created or unknown companion — show the animated gradient heart.
  // No letter initial, no assumed gender or appearance. Brand-consistent and neutral.
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center justify-center rounded-full ring-2 ring-white/10 shadow-md ${s.container} ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(224,82,122,0.15) 50%, rgba(139,92,246,0.15) 100%)',
      }}
      aria-label="Companion"
    >
      <AnimatedGradientHeart size={s.heart} pulse id={`avatar-heart-${memberId}`} />
    </motion.div>
  );
}
