import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCollabPresence } from '../hooks/use-collab-presence';
import { initialsFor } from '../lib/colors';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string | null;
  className?: string;
}

/**
 * Squircle avatar stack for live teammates on the active project.
 * Shows up to 3 peers + a dashed "+" squircle to invite collaborators.
 * Hidden gracefully when collab presence isn't enabled (free tier / no project).
 */
export function HeaderCollabStack({ projectId, className }: Props) {
  const navigate = useNavigate();
  const { peers, enabled } = useCollabPresence({ projectId, surface: 'app_shell' });

  if (!enabled || peers.length === 0) {
    // Show only the invite "+" squircle when no peers are live, on md+ screens
    return (
      <button
        onClick={() => navigate('/settings#team')}
        title="Invite a teammate"
        aria-label="Invite a teammate"
        className={cn(
          'hidden md:flex h-8 w-8 shrink-0 items-center justify-center transition-all active:scale-95',
          'border border-dashed border-gold/40 text-gold/70 hover:border-gold/70 hover:text-gold',
          className,
        )}
        style={{ borderRadius: '28%' }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  const visible = peers.slice(0, 3);
  const overflow = peers.length - visible.length;

  return (
    <div className={cn('flex items-center -space-x-1.5', className)}>
      {visible.map((peer) => (
        <div
          key={peer.userId}
          title={`${peer.name} • live`}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center text-[10px] font-semibold ring-2 ring-background"
          style={{
            borderRadius: '28%',
            background: peer.color.replace(')', ' / 0.22)'),
            border: `1px solid ${peer.color}`,
            color: peer.color,
          }}
        >
          {initialsFor(peer.name)}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background"
            style={{ background: peer.color, boxShadow: `0 0 6px ${peer.color}` }}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background"
          style={{ borderRadius: '28%' }}
        >
          +{overflow}
        </div>
      )}
      <button
        onClick={() => navigate('/settings#team')}
        title="Invite a teammate"
        aria-label="Invite a teammate"
        className="flex h-8 w-8 shrink-0 items-center justify-center border border-dashed border-gold/40 text-gold/70 ring-2 ring-background transition-all hover:border-gold/70 hover:text-gold active:scale-95"
        style={{ borderRadius: '28%' }}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
