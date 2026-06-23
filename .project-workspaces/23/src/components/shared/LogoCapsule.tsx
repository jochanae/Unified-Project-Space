import intoiqFullMark from '@/assets/intoiq-full-mark.png';
import { cn } from '@/lib/utils';

interface LogoCapsuleProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function LogoCapsule({ size = 'md', className, onClick }: LogoCapsuleProps) {
  // ~15% smaller marks with consistent 8–10px vertical breathing room
  const sizeMap = {
    sm: { capsule: 'px-2.5 py-1.5', imgH: 19 },
    md: { capsule: 'px-3 py-2', imgH: 20 },
    lg: { capsule: 'px-3.5 py-2.5', imgH: 26 },
  };

  const s = sizeMap[size];
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      style={{
        backgroundColor: 'rgba(10, 26, 31, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.15)',
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full backdrop-blur-xl transition-all duration-300',
        onClick && 'cursor-pointer active:scale-[0.97] hover:brightness-110',
        s.capsule,
        className,
      )}
    >
      <img
        src={intoiqFullMark}
        alt="IntoIQ"
        style={{
          height: s.imgH,
          width: 'auto',
          filter: 'drop-shadow(0 0 12px rgba(43, 191, 160, 0.35))',
        }}
        draggable={false}
        className="block object-contain"
      />
    </Comp>
  );
}
