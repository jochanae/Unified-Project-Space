import { Users } from 'lucide-react';
import type { CollabPeer } from '../hooks/use-collab-presence';
import { initialsFor } from '../lib/colors';
import { cn } from '@/lib/utils';

interface Props {
  peers: CollabPeer[];
  selfColor?: string;
  className?: string;
  showLabel?: boolean;
}

export function CollabAvatars({ peers, selfColor, className, showLabel = true }: Props) {
  if (peers.length === 0 && !selfColor) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{peers.length === 0 ? 'Just you' : `${peers.length + 1} live`}</span>
        </div>
      )}
      <div className="flex -space-x-2">
        {selfColor && (
          <div
            className="relative h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold text-foreground"
            style={{ background: `${selfColor.replace('hsl(', 'hsl(').replace(')', ' / 0.25)')}`, border: `1px solid ${selfColor}` }}
            title="You"
          >
            <span className="opacity-90">You</span>
          </div>
        )}
        {peers.slice(0, 4).map(peer => (
          <div
            key={peer.userId}
            className="relative h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold"
            style={{
              background: peer.color.replace(')', ' / 0.25)'),
              border: `1px solid ${peer.color}`,
              color: peer.color,
            }}
            title={peer.name}
          >
            {initialsFor(peer.name)}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full"
              style={{ background: peer.color, boxShadow: `0 0 6px ${peer.color}` }}
            />
          </div>
        ))}
        {peers.length > 4 && (
          <div className="h-7 w-7 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
            +{peers.length - 4}
          </div>
        )}
      </div>
    </div>
  );
}
