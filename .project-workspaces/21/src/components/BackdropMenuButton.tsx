import { useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BackdropMenuButtonProps {
  hasBackground: boolean;
  uploading: boolean;
  inputId: string;
  onDelete?: () => void;
  heroAvatar: string | null | undefined;
}

export default function BackdropMenuButton({ hasBackground, uploading, inputId, onDelete, heroAvatar }: BackdropMenuButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pillClass = cn(
    'flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all active:scale-95',
    heroAvatar
      ? 'text-white/80 border-white/20 hover:bg-white/10 hover:text-white'
      : 'text-muted-foreground border-border hover:bg-muted hover:text-foreground'
  );
  const pillStyle = heroAvatar
    ? { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as React.CSSProperties
    : {};

  // No background yet — just a label that triggers file input
  if (!hasBackground) {
    return (
      <label htmlFor={inputId} className={pillClass} style={pillStyle} title="Set background photo">
        <Camera className="h-3 w-3" />
        <span className="[@media(max-width:379px)]:hidden">{uploading ? 'Uploading…' : 'Set background'}</span>
      </label>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={pillClass} style={pillStyle} title="Background options">
            <Camera className="h-3 w-3" />
            <span className="[@media(max-width:379px)]:hidden">{uploading ? 'Uploading…' : 'Background'}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onSelect={() => document.getElementById(inputId)?.click()}>
            Change background
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem
              onSelect={() => setConfirmOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Remove background
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove background?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom background from your greeting card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete?.(); setConfirmOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
